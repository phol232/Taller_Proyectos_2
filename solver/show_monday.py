import psycopg
from psycopg.rows import dict_row
from collections import defaultdict
from datetime import time as _time_cls
from collections import Counter
from app.core.config import get_settings
from app.core.db import close_pool
from app.infrastructure.input_loader import SolverInputLoader
from app.infrastructure.persistence import persist_teaching_schedule
from app.services.demand_projector import DemandProjector
from app.services.teacher_solver import _BLOCK_WEEKENDS, TeacherScheduleSolver
from app.domain.models import CourseOffer, DayOfWeek, TeachingScheduleSolution

with psycopg.connect(get_settings().db_dsn, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM academic_periods WHERE is_active = TRUE LIMIT 1")
        period_id = cur.fetchone()["id"]
        cur.execute("SELECT id FROM users LIMIT 1")
        admin_id = cur.fetchone()["id"]

data = SolverInputLoader().load(period_id, load_students=False)

# Prueba limitada: solo usar estas 6 salas
SALAS_PRUEBA = {"A101", "A102", "A103", "B101", "B102", "B103"}
REPORT_COURSE_CODES = {
    "ASUC00051",  # BASE DE DATOS
    "ASUC00512",  # INTRODUCCIÓN A LA INGENIERÍA DE SISTEMAS E INFORMÁTICA
    "ASUC01061",  # SISTEMAS OPERATIVOS
    "ASUC01275",  # ESTADÍSTICA GENERAL
    "ASUC01296",  # FÍSICA 1
    "ASUC01482",  # PROGRAMACIÓN ORIENTADA A OBJETOS
    "ASUC01580",  # TALLER DE INVESTIGACIÓN 1
    "ASUC01581",  # TALLER DE INVESTIGACIÓN 2
}
target_course_ids = {
    cid for cid, course in data.courses.items()
    if course.code in REPORT_COURSE_CODES
}
data.courses = {
    cid: course for cid, course in data.courses.items()
    if cid in target_course_ids
}
data.course_components = {
    comp_id: comp for comp_id, comp in data.course_components.items()
    if comp.course_id in target_course_ids
}
target_component_ids = set(data.course_components)
for mapping in (
    data.teacher_course_components,
    data.classroom_course_components,
):
    for key in list(mapping):
        if key not in target_component_ids:
            mapping.pop(key, None)
for mapping in (
    data.teacher_courses,
    data.classroom_courses,
    data.course_prerequisites,
    data.course_corequisites,
):
    for key in list(mapping):
        if key not in target_course_ids:
            mapping.pop(key, None)

ids_excluir = {cid for cid, c in data.classrooms.items() if c.name not in SALAS_PRUEBA}
for cid in ids_excluir:
    data.classrooms.pop(cid, None)
    data.classroom_availability.pop(cid, None)
for course_id in list(data.classroom_courses):
    data.classroom_courses[course_id] -= ids_excluir
    # Si queda vacío tras el filtro, eliminamos la entrada para que el solver
    # caiga al fallback de "salas libres" en vez de tratar el curso como
    # restringido a un conjunto vacío (si no, ese curso jamás se asigna).
    if not data.classroom_courses[course_id]:
        data.classroom_courses.pop(course_id)
for comp_id in list(data.classroom_course_components):
    if data.classroom_course_components[comp_id]:
        data.classroom_course_components[comp_id] -= ids_excluir
        if not data.classroom_course_components[comp_id]:
            data.classroom_course_components.pop(comp_id)

# Respetar exactamente la BD: no sobreescribir classroom_courses.
# El filtro anterior ya limit\u00f3 las salas a SALAS_PRUEBA.
# classroom_course_components tambi\u00e9n se respeta tal cual viene de la BD.

demand = DemandProjector().project(data)

# Para pruebas: forzar 3 secciones por componente independientemente de la demanda real
for d in demand.values():
    d.n_classrooms = 3

# Ejecutar el solver REAL (con todas las soft constraints: variedad por sala,
# carga balanceada, descanso docente, consistencia THEORY/PRACTICE, etc.).
solver = TeacherScheduleSolver(data, demand)
solution, conflicts = solver.solve(time_limit_ms=60_000)

# --- Persistir para obtener NRC ---
classroom_capacities = {cid: c.capacity for cid, c in data.classrooms.items()}
schedule_id = persist_teaching_schedule(
    academic_period_id=period_id,
    created_by=admin_id,
    solution=solution,
    classroom_capacities=classroom_capacities,
)

# ═══════════════════════════════════════════════════════════════════
#  ANÁLISIS DE DATOS: estructura plana de bloques asignados
# ═══════════════════════════════════════════════════════════════════
NIGHT_H     = _time_cls(18, 0)
AFTERNOON_H = _time_cls(12, 0)
REST_MIN    = 90
EXPECTED_SECTIONS = [1, 2, 3]

# Tipos de componente requeridos por curso (basado en data.course_components)
course_required_types: dict = defaultdict(set)
for comp in data.course_components.values():
    course_required_types[comp.course_id].add(comp.component_type.upper())

# Componentes asignados por (course_id, section_number) → set de tipos
section_has_type: dict[tuple, set] = defaultdict(set)
# Bloque completo por (course_id, section_number, component_type)
section_blocks: dict[tuple, dict] = {}
# Docente de THEORY por (course_id, section_number)
theory_teacher_by_sec: dict[tuple, object] = {}
# Docente de PRACTICE/GENERAL por (course_id, section_number)
practice_teacher_by_sec: dict[tuple, object] = {}
# Cursos únicos asignados
cursos_vistos: set = set()
docentes_usados: set = set()
aulas_usadas: set = set()
# Carga diaria por sala
daily_load_by_sala: dict[str, Counter] = defaultdict(Counter)
# Turno stats
turno_stats: dict[int, dict] = {1: {"day": 0, "night": 0}, 2: {"day": 0, "night": 0}, 3: {"day": 0, "night": 0}}
# Bloques largos
blocks_4h_theory   = 0
blocks_4h_practice = 0
# Descanso docente
teacher_blocks_by_day: dict[tuple, list] = defaultdict(list)
# Shift compliance
shift_violations: list[dict] = []

for offer in solution.offers:
    comp      = data.course_components[offer.course_component_id]
    course    = data.courses[comp.course_id]
    teacher   = data.teachers[offer.teacher_id]
    classroom = data.classrooms[offer.classroom_id]

    ctype = comp.component_type.upper()
    sec_key = (course.id, offer.section_number)

    cursos_vistos.add(course.id)
    docentes_usados.add(offer.teacher_id)
    aulas_usadas.add(offer.classroom_id)

    section_has_type[sec_key].add(ctype)
    first_block = offer.blocks[0]
    section_blocks[(course.id, offer.section_number, ctype)] = {
        "day":     first_block.day.value,
        "start":   first_block.start_time,
        "end":     first_block.end_time,
        "teacher": offer.teacher_id,
        "tname":   teacher.full_name,
        "course":  course.code,
        "cname":   course.name,
    }

    if ctype == "THEORY":
        theory_teacher_by_sec[sec_key] = offer.teacher_id
    else:
        practice_teacher_by_sec[sec_key] = offer.teacher_id

    s = offer.section_number
    for scheduled in offer.blocks:
        if s in turno_stats:
            if scheduled.start_time >= NIGHT_H:
                turno_stats[s]["night"] += 1
            else:
                turno_stats[s]["day"] += 1

        dur_h = (scheduled.end_time.hour * 60 + scheduled.end_time.minute -
                 scheduled.start_time.hour * 60 - scheduled.start_time.minute) // 60
        if dur_h >= 4:
            if ctype == "THEORY":
                blocks_4h_theory += 1
            else:
                blocks_4h_practice += 1

        daily_load_by_sala[classroom.name][scheduled.day.value] += 1
        teacher_blocks_by_day[(offer.teacher_id, scheduled.day.value)].append(
            (scheduled.start_time, scheduled.end_time)
        )

        # Análisis de violación de turno preferido
        if s == 1:
            pref_label, in_pref = "mañana 07-12", scheduled.start_time < AFTERNOON_H
        elif s == 2:
            pref_label, in_pref = "tarde 12-18", AFTERNOON_H <= scheduled.start_time < NIGHT_H
        else:
            pref_label, in_pref = "noche 18-22", scheduled.start_time >= NIGHT_H
        if not in_pref:
            if scheduled.start_time >= NIGHT_H:
                assigned_franja = "noche 18-22"
            elif scheduled.start_time >= AFTERNOON_H:
                assigned_franja = "tarde 12-18"
            else:
                assigned_franja = "mañana 07-12"
            shift_violations.append({
                "code":    course.code,
                "cname":   course.name[:35],
                "sec":     s,
                "ctype":   ctype,
                "day":     scheduled.day.value,
                "start":   scheduled.start_time,
                "pref":    pref_label,
                "actual":  assigned_franja,
            })

# ── Análisis descanso docente ──────────────────────────────────
no_rest_pairs = 0
for blks in teacher_blocks_by_day.values():
    blks.sort()
    for i in range(len(blks) - 1):
        gap = (blks[i+1][0].hour*60 + blks[i+1][0].minute) - (blks[i][1].hour*60 + blks[i][1].minute)
        if 0 <= gap < REST_MIN:
            no_rest_pairs += 1

# ── Mismatch docente THEORY/PRACTICE ──────────────────────────
practice_mismatches = 0
practice_total      = 0
mismatch_details: list[dict] = []
for (cid, sec), tid in practice_teacher_by_sec.items():
    practice_total += 1
    theory_tid = theory_teacher_by_sec.get((cid, sec))
    if theory_tid is not None and theory_tid != tid:
        practice_mismatches += 1
        course = data.courses[cid]
        mismatch_details.append({
            "code":    course.code,
            "cname":   course.name[:35],
            "sec":     sec,
            "t_theory": data.teachers[theory_tid].full_name,
            "t_pract":  data.teachers[tid].full_name,
        })

# ── Completitud por curso ──────────────────────────────────────
# Cursos assignables = los que tienen salas + docentes en el escenario actual
assignable_course_ids = set()
for comp_id, comp in data.course_components.items():
    cls_ok = [cid for cid in data.classroom_courses.get(comp.course_id, set())
              if cid in data.classrooms
              and data.classrooms[cid].room_type == comp.required_room_type]
    doc_ok = data.teacher_course_components.get(comp_id, set())
    if cls_ok and doc_ok:
        assignable_course_ids.add(comp.course_id)

completeness_rows: list[dict] = []
complete_count = 0
for cid in sorted(assignable_course_ids, key=lambda x: data.courses[x].code):
    course = data.courses[cid]
    req_types = course_required_types[cid]
    row = {"code": course.code, "cname": course.name[:40], "sections": {}, "complete": True}
    for sec in EXPECTED_SECTIONS:
        has = section_has_type.get((cid, sec), set())
        ok_theory   = "THEORY"   not in req_types or "THEORY"   in has
        ok_practice = "PRACTICE" not in req_types or "PRACTICE" in has
        ok_general  = "GENERAL"  not in req_types or "GENERAL"  in has
        has_sec = bool(has)
        row["sections"][sec] = {
            "present":    has_sec,
            "ok_theory":  ok_theory,
            "ok_practice": ok_practice,
            "ok_general": ok_general,
        }
        if not has_sec or not ok_theory or not ok_practice or not ok_general:
            row["complete"] = False
    if row["complete"]:
        complete_count += 1
    completeness_rows.append(row)

# ── Métricas de calidad para score ────────────────────────────
total_offers      = sum(len(offer.blocks) for offer in solution.offers)
max_daily         = {sala: max(days.values()) for sala, days in daily_load_by_sala.items()}
avg_max_daily     = sum(max_daily.values()) / len(max_daily) if max_daily else 0
salas_saturadas   = sum(1 for v in max_daily.values() if v >= 4)
weekend_blocks    = sum(
    c for days in daily_load_by_sala.values()
    for d, c in days.items() if d in {"SATURDAY", "SUNDAY"}
)
mismatch_pct      = 100 * practice_mismatches / practice_total if practice_total else 0
# total_demand = suma real de variables de asignación (componentes × secciones demandadas).
# len(conflicts) son diagnósticos de inviabilidad de _diagnose_failures, NO variables fallidas.
total_demand      = sum(
    d.n_classrooms * max(1, round(float(data.course_components[d.course_component_id].weekly_hours) / 1.5))
    for d in demand.values()
)
unassigned_vars   = total_demand - total_offers
pct_ok            = 100 * total_offers / total_demand if total_demand else 0

# Score de calidad (0–100)
n_assignable      = len(assignable_course_ids)
score_completeness = (complete_count / n_assignable * 100) if n_assignable else 0
total_blocks_all   = sum(turno_stats[s]["day"] + turno_stats[s]["night"] for s in turno_stats)
shift_violations_count = len(shift_violations)
score_shift = max(0.0, 100.0 - (shift_violations_count / total_blocks_all * 100)) if total_blocks_all else 0
score_teacher  = 100.0 - mismatch_pct
# Carga: 100 si avg_max_daily ≤ 3, degrada linealmente hasta 0 a avg=8
score_load = max(0.0, 100.0 - max(0.0, avg_max_daily - 3) * (100.0 / 5.0))
total_theory = sum(
    len(o.blocks) for o in solution.offers
    if data.course_components[o.course_component_id].component_type.upper() == "THEORY"
)
score_theory = max(0.0, 100.0 - (blocks_4h_theory / total_theory * 100)) if total_theory else 100.0

WEIGHT_COMPLETENESS = 0.40
WEIGHT_SHIFT        = 0.20
WEIGHT_TEACHER      = 0.25
WEIGHT_LOAD         = 0.10
WEIGHT_THEORY       = 0.05
quality_score = (
    score_completeness * WEIGHT_COMPLETENESS
    + score_shift       * WEIGHT_SHIFT
    + score_teacher     * WEIGHT_TEACHER
    + score_load        * WEIGHT_LOAD
    + score_theory      * WEIGHT_THEORY
)

# ═══════════════════════════════════════════════════════════════════
#  IMPRESIÓN DEL REPORTE
# ═══════════════════════════════════════════════════════════════════
W = 115
SEP = "─" * W
DLINE = "═" * W

print(DLINE)
print(f"  PLANNER UC  —  REPORTE DE HORARIO ACADÉMICO GENERADO")
print(f"  Teaching Schedule ID: {schedule_id}")
print(f"  Escenario: prueba limitada a 6 salas — {', '.join(sorted(SALAS_PRUEBA))}")
print(DLINE)
print()

# ── 1. Resumen ejecutivo ──────────────────────────────────────
print(f"  {'MÉTRICA':<40} {'VALOR':>10}")
print(f"  {'-'*52}")
print(f"  {'Bloques asignados':<40} {total_offers:>10}")
print(f"  {'Variables sin asignar':<40} {unassigned_vars:>10}")
print(f"  {'Diagnósticos de inviabilidad':<40} {len(conflicts):>10}")
print(f"  {'Tasa de asignación (escenario limitado)':<40} {pct_ok:>9.1f}%")
print(f"  {'Cursos con al menos 1 bloque':<40} {len(cursos_vistos):>10}")
print(f"  {'Secciones únicas generadas':<40} {len({(cid,s) for cid,s,_ in section_blocks}):>10}")
print(f"  {'Docentes utilizados':<40} {len(docentes_usados):>10}")
print(f"  {'Aulas utilizadas':<40} {len(aulas_usadas):>10}")
_we_note = '(días bloqueados por política)' if _BLOCK_WEEKENDS and weekend_blocks == 0 else ('(permitidos, sin uso en este escenario)' if not _BLOCK_WEEKENDS and weekend_blocks == 0 else '⚠ revisar')
print(f"  {'Bloques en fin de semana':<40} {weekend_blocks:>10}  {_we_note}")
print()

# ── 2. Distribución por turno ─────────────────────────────────
print(f"  DISTRIBUCIÓN POR TURNO (soft constraint):")
print(f"  {'Sección':<10} {'Diurno 07:00-18:00':>22} {'Nocturno 18:00-22:10':>24} {'% noche':>8}")
print(f"  {'-'*67}")
for s, v in turno_stats.items():
    tot = v['day'] + v['night']
    pct = 100 * v['night'] / tot if tot else 0
    flag = "  ✅" if (s < 3 and pct < 50) or (s == 3 and pct >= 60) else "  ⚠"
    print(f"  S{s:<9} {v['day']:>16} bloques   {v['night']:>16} bloques   {pct:>6.0f}%{flag}")
print()

# ── 3. Métricas de calidad ────────────────────────────────────
print(f"  MÉTRICAS DE CALIDAD:")
print(f"  {'─'*60}")
print(f"  {'Bloques TEORÍA ≥4h (penalizable)':<44} {blocks_4h_theory:>6}")
print(f"  {'Bloques PRÁCTICA ≥4h (aceptable)':<44} {blocks_4h_practice:>6}")
print(f"  {'Salas con ≥4 bloques en algún día':<44} {salas_saturadas:>6}")
print(f"  {'Máximo diario promedio por sala':<44} {avg_max_daily:>9.1f}")
print(f"  {'PRACTICE con docente distinto a THEORY':<44} {practice_mismatches:>3}/{practice_total} ({mismatch_pct:>4.1f}%)")
print(f"  {'Pares docente sin descanso ≥90min':<44} {no_rest_pairs:>6}")
print(f"  {'Bloques S3 fuera de horario nocturno':<44} {sum(1 for v in shift_violations if v['sec']==3):>6}")
print()

# ── 4. Score de calidad ───────────────────────────────────────
bar_total = 40
filled = round(quality_score / 100 * bar_total)
bar = "█" * filled + "░" * (bar_total - filled)
grade = "A" if quality_score >= 85 else ("B" if quality_score >= 70 else ("C" if quality_score >= 55 else "D"))
print(f"  SCORE DE CALIDAD GLOBAL: {quality_score:>5.1f}/100  [{bar}]  Nota: {grade}")
print(f"  {'─'*60}")
print(f"  {'  Completitud de cursos    (×40%)':<40} {score_completeness:>6.1f}  → contribución {score_completeness*WEIGHT_COMPLETENESS:>5.1f}")
print(f"  {'  Coherencia de turnos S1/S2/S3 (×20%)':<40} {score_shift:>6.1f}  → contribución {score_shift*WEIGHT_SHIFT:>5.1f}")
print(f"  {'  Consistencia docente T/P  (×25%)':<40} {score_teacher:>6.1f}  → contribución {score_teacher*WEIGHT_TEACHER:>5.1f}")
print(f"  {'  Balance de carga por sala (×10%)':<40} {score_load:>6.1f}  → contribución {score_load*WEIGHT_LOAD:>5.1f}")
print(f"  {'  Bloques teoría ≥4h        (×5%)':<40} {score_theory:>6.1f}  → contribución {score_theory*WEIGHT_THEORY:>5.1f}")
print()

# ── 5. Ocupación máxima diaria por sala ──────────────────────
print(f"  OCUPACIÓN MÁXIMA DIARIA POR SALA:")
print(f"  {'─'*60}")
print(f"  {'SALA':<10} {'MAX BLOQ/DÍA':>13}  PEOR DÍA         VISUAL")
print(f"  {'─'*60}")
for sala in sorted(max_daily):
    worst_day = max(daily_load_by_sala[sala], key=lambda d: daily_load_by_sala[sala][d])
    worst_n   = daily_load_by_sala[sala][worst_day]
    bar = "█" * worst_n + "░" * max(0, 5 - worst_n)
    sat_flag = "  ⚠ saturada" if worst_n >= 4 else ""
    print(f"  {sala:<10} {worst_n:>8} bloques   {worst_day:<14} {bar}{sat_flag}")
print()

# ═══════════════════════════════════════════════════════════════════
#  VALIDACIÓN DE CONSISTENCIA ACADÉMICA
# ═══════════════════════════════════════════════════════════════════
print(DLINE)
print(f"  VALIDACIÓN DE CONSISTENCIA ACADÉMICA")
print(DLINE)
print()

# ── 5a. Tabla de completitud por curso ───────────────────────
# Solo cursos assignables
print(f"  COMPLETITUD POR CURSO ASSIGNABLE ({complete_count}/{n_assignable} completos):")
print()
print(f"  {'CÓDIGO':<14} {'CURSO':<42} {'S1-T':>5} {'S1-P':>5} {'S2-T':>5} {'S2-P':>5} {'S3-T':>5} {'S3-P':>5}  ESTADO")
print(f"  {'─'*14} {'─'*42} {'─'*5} {'─'*5} {'─'*5} {'─'*5} {'─'*5} {'─'*5}  {'─'*10}")

for row in completeness_rows:
    cols = []
    req = course_required_types[next(cid for cid in assignable_course_ids if data.courses[cid].code == row["code"])]
    for sec in [1, 2, 3]:
        s_data = row["sections"][sec]
        # Teoría
        if "THEORY" not in req:
            cols.append("N/A ")
        elif s_data["present"] and s_data["ok_theory"]:
            cols.append(" ✅ ")
        else:
            cols.append(" ❌ ")
        # Práctica / General
        has_prac = "PRACTICE" in req or "GENERAL" in req
        if not has_prac:
            cols.append("N/A ")
        elif s_data["present"] and (s_data["ok_practice"] and s_data["ok_general"]):
            cols.append(" ✅ ")
        else:
            cols.append(" ❌ ")
    estado = "✅ completo" if row["complete"] else "❌ incompleto"
    print(f"  {row['code']:<14} {row['cname']:<42} {cols[0]:>5} {cols[1]:>5} {cols[2]:>5} {cols[3]:>5} {cols[4]:>5} {cols[5]:>5}  {estado}")

print()

# ── 5b. Incumplimientos de turno ─────────────────────────────
if shift_violations:
    print(f"  INCUMPLIMIENTOS DE TURNO ({len(shift_violations)} bloques fuera de franja preferida):")
    print()
    # Agrupar por sección para mayor claridad
    s3_violations = [v for v in shift_violations if v["sec"] == 3]
    other_violations = [v for v in shift_violations if v["sec"] != 3]
    if s3_violations:
        print(f"  S3 fuera de noche (alta penalización):")
        print(f"  {'CÓDIGO':<14} {'CURSO':<38} {'TIPO':<10} {'DÍA':<12} {'HORA':>7} {'PREF':>15} {'ASIGNADO':>15}")
        print(f"  {'─'*14} {'─'*38} {'─'*10} {'─'*12} {'─'*7} {'─'*15} {'─'*15}")
        for v in sorted(s3_violations, key=lambda x: x["code"]):
            print(f"  {v['code']:<14} {v['cname']:<38} {v['ctype']:<10} {v['day']:<12} {str(v['start'])[:5]:>7} {v['pref']:>15} {v['actual']:>15}")
        print()
    if other_violations:
        print(f"  S1/S2 fuera de turno (baja penalización):")
        print(f"  {'CÓDIGO':<14} {'S':>3} {'TIPO':<10} {'DÍA':<12} {'HORA':>7} {'PREF':>15} {'ASIGNADO':>15}")
        print(f"  {'─'*14} {'─'*3} {'─'*10} {'─'*12} {'─'*7} {'─'*15} {'─'*15}")
        for v in sorted(other_violations, key=lambda x: (x["sec"], x["code"])):
            print(f"  {v['code']:<14} S{v['sec']:>1} {v['ctype']:<10} {v['day']:<12} {str(v['start'])[:5]:>7} {v['pref']:>15} {v['actual']:>15}")
        print()
else:
    print(f"  INCUMPLIMIENTOS DE TURNO: ninguno ✅")
    print()

# ── 5c. Inconsistencias docente ──────────────────────────────
if mismatch_details:
    print(f"  INCONSISTENCIAS DOCENTE THEORY/PRACTICE ({len(mismatch_details)}):")
    print()
    print(f"  {'CÓDIGO':<14} {'S':>3}  {'DOCENTE TEORÍA':<35} {'DOCENTE PRÁCTICA':<35}")
    print(f"  {'─'*14} {'─'*3}  {'─'*35} {'─'*35}")
    for m in mismatch_details:
        print(f"  {m['code']:<14} S{m['sec']:>1}  {m['t_theory']:<35} {m['t_pract']:<35}")
    print()
else:
    print(f"  INCONSISTENCIAS DOCENTE THEORY/PRACTICE: ninguna ✅")
    print()

# ── 5d. Problemas de reporte ─────────────────────────────────
report_issues: list[tuple[str, str, str]] = []
if weekend_blocks > 0 and _BLOCK_WEEKENDS:
    report_issues.append(("BLOQUES FIN SEMANA", f"{weekend_blocks} bloques asignados sábado/domingo pese a restricción activa", "ALTA"))
# Cursos en solución no assignables (no deberían existir, pero validar)
non_assignable_in_sol = cursos_vistos - assignable_course_ids
if non_assignable_in_sol:
    codes = [data.courses[c].code for c in non_assignable_in_sol]
    report_issues.append(("CURSOS INESPERADOS", f"Cursos en solución sin datos válidos de sala/docente: {codes}", "MEDIA"))
if blocks_4h_theory > 0:
    report_issues.append(("TEORÍA LARGA", f"{blocks_4h_theory} bloques de TEORÍA ≥4h (penalizable)", "BAJA"))
if no_rest_pairs > 0:
    report_issues.append(("SIN DESCANSO", f"{no_rest_pairs} pares de bloques del mismo docente con <90min de descanso", "BAJA"))

if report_issues:
    print(f"  PROBLEMAS DE REPORTE:")
    print()
    print(f"  {'TIPO':<22} {'SEVERIDAD':>8}  DESCRIPCIÓN")
    print(f"  {'─'*22} {'─'*8}  {'─'*60}")
    for tipo, desc, sev in report_issues:
        print(f"  {tipo:<22} {sev:>8}  {desc}")
    print()
else:
    print(f"  PROBLEMAS DE REPORTE: ninguno ✅")
    print()

# ═══════════════════════════════════════════════════════════════════
#  DETALLE: HORARIO ACADÉMICO POR SALA — GRILLA DÍA × HORA
# ═══════════════════════════════════════════════════════════════════
DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
DAY_ES = {
    "MONDAY":    "LUNES",
    "TUESDAY":   "MARTES",
    "WEDNESDAY": "MIÉRCOLES",
    "THURSDAY":  "JUEVES",
    "FRIDAY":    "VIERNES",
    "SATURDAY":  "SÁBADO",
    "SUNDAY":    "DOMINGO",
}
TIPO_ES = {"THEORY": "TEORÍA", "PRACTICE": "PRÁCTICA", "GENERAL": "GENERAL"}

# Agrupar: sala → día → lista de bloques
aula_schedule: dict[str, dict] = defaultdict(lambda: {"cap": 0, "days": defaultdict(list)})
for offer in solution.offers:
    comp      = data.course_components[offer.course_component_id]
    course    = data.courses[comp.course_id]
    teacher   = data.teachers[offer.teacher_id]
    classroom = data.classrooms[offer.classroom_id]
    for scheduled in offer.blocks:
        dur = (scheduled.end_time.hour * 60 + scheduled.end_time.minute) \
            - (scheduled.start_time.hour * 60 + scheduled.start_time.minute)
        entry = aula_schedule[classroom.name]
        entry["cap"] = classroom.capacity
        entry["days"][scheduled.day.value].append({
            "start":   str(scheduled.start_time)[:5],
            "end":     str(scheduled.end_time)[:5],
            "dur":     f"{dur / 60:g}",
            "code":    course.code,
            "name":    course.name,
            "sec":     offer.section_number,
            "nrc":     offer.nrc or "-----",
            "type":    comp.component_type,
            "teacher": teacher.full_name,
        })

W2 = 125
SEP2 = "─" * W2

print(DLINE)
print(f"  DETALLE DE HORARIO POR SALA")
print(DLINE)

for aula_name in sorted(aula_schedule):
    cap  = aula_schedule[aula_name]["cap"]
    days = aula_schedule[aula_name]["days"]
    total_blocks = sum(len(v) for v in days.values())
    # Días únicos con clase (excluye fin de semana si _BLOCK_WEEKENDS activo)
    days_used = [d for d in DAY_ORDER if d in days]

    print(f"\n{'═' * W2}")
    print(f"  SALA: {aula_name}   │   Capacidad: {cap} personas   │   Días únicos con clase: {len(days_used)}   │   Total bloques: {total_blocks}")
    print(f"{'═' * W2}")

    for day_key in DAY_ORDER:
        blocks = days.get(day_key)
        if not blocks:
            continue
        blocks_sorted = sorted(blocks, key=lambda r: r["start"])
        day_label = DAY_ES[day_key]
        if day_key in {"SATURDAY", "SUNDAY"}:
            day_label += "  ⚠ FIN DE SEMANA"

        print(f"\n  ┌{SEP2[:W2-2]}┐")
        print(f"  │  {day_label:<{W2-6}}│")
        print(f"  ├{'─'*8}┬{'─'*8}┬{'─'*5}┬{'─'*12}┬{'─'*11}┬{'─'*30}┬{'─'*7}┬{'─'*10}┬{'─'*26}┤")
        print(f"  │ {'INICIO':^6}  │ {'FIN':^6}  │ {'H':^3}  │ {'TIPO':^10}  │ {'CURSO':^9}  │ {'NOMBRE':^28}  │ {'S':^5}  │ {'NRC':^8}  │ {'DOCENTE':<24}│")
        print(f"  ├{'─'*8}┼{'─'*8}┼{'─'*5}┼{'─'*12}┼{'─'*11}┼{'─'*30}┼{'─'*7}┼{'─'*10}┼{'─'*26}┤")

        for r in blocks_sorted:
            tipo  = TIPO_ES.get(r["type"], r["type"])
            nombre = r["name"][:28]
            docente = r["teacher"][:24]
            night_flag = "  🌙" if r["start"] >= "18:00" else ""
            print(f"  │  {r['start']:>5}  │  {r['end']:>5}  │ {r['dur']:>2}h  │  {tipo:<9}  │  {r['code']:<9}  │  {nombre:<28}  │  S{r['sec']}  │  {r['nrc']:<8}  │  {docente:<24}│{night_flag}")

        print(f"  └{'─'*8}┴{'─'*8}┴{'─'*5}┴{'─'*12}┴{'─'*11}┴{'─'*30}┴{'─'*7}┴{'─'*10}┴{'─'*26}┘")

print(f"\n\n  Teaching Schedule ID: {schedule_id}")
print(f"  Score de calidad: {quality_score:.1f}/100  [{grade}]")

# ═══════════════════════════════════════════════════════════════════
#  EXPORTAR REPORTE A MARKDOWN
# ═══════════════════════════════════════════════════════════════════
import pathlib
from datetime import datetime

_s3_violations   = [v for v in shift_violations if v["sec"] == 3]
_other_violations = [v for v in shift_violations if v["sec"] != 3]

_md_lines: list[str] = []

def _md(line: str = "") -> None:
    _md_lines.append(line)

_today = datetime.now().strftime("%d de %B de %Y")

_md(f"# Reporte de Horario Académico — Planner UC")
_md()
_md(f"| Campo | Valor |")
_md(f"|---|---|")
_md(f"| **Teaching Schedule ID** | `{schedule_id}` |")
_md(f"| **Fecha de generación** | {_today} |")
_md(f"| **Escenario** | Prueba limitada a 6 salas: {', '.join(sorted(SALAS_PRUEBA))} |")
_md()

# ── Score global ─────────────────────────────────────────────
_bar_filled = round(quality_score / 100 * 20)
_progress   = "█" * _bar_filled + "░" * (20 - _bar_filled)
_md(f"## Score de Calidad Global")
_md()
_md(f"> **{quality_score:.1f} / 100 — Nota {grade}** &nbsp; `{_progress}`")
_md()
_md(f"| Dimensión | Score | Peso | Contribución |")
_md(f"|---|---:|---:|---:|")
_md(f"| Completitud de cursos | {score_completeness:.1f} | 40% | {score_completeness*WEIGHT_COMPLETENESS:.1f} |")
_md(f"| Coherencia de turnos S1/S2/S3 | {score_shift:.1f} | 20% | {score_shift*WEIGHT_SHIFT:.1f} |")
_md(f"| Consistencia docente T/P | {score_teacher:.1f} | 25% | {score_teacher*WEIGHT_TEACHER:.1f} |")
_md(f"| Balance de carga por sala | {score_load:.1f} | 10% | {score_load*WEIGHT_LOAD:.1f} |")
_md(f"| Bloques teoría ≥4h | {score_theory:.1f} | 5% | {score_theory*WEIGHT_THEORY:.1f} |")
_md()

# ── Resumen ejecutivo ────────────────────────────────────────
_md(f"## Resumen Ejecutivo")
_md()
_md(f"| Métrica | Valor |")
_md(f"|---|---:|")
_md(f"| Bloques asignados | {total_offers} |")
_md(f"| Variables sin asignar | {unassigned_vars} |")
_md(f"| Tasa de asignación _(escenario limitado)_ | {pct_ok:.1f}% |")
_md(f"| Diagnósticos de inviabilidad _(escenario)_ | {len(conflicts)} |")
_md(f"| Cursos con al menos 1 bloque | {len(cursos_vistos)} |")
_md(f"| Secciones únicas generadas | {len({(cid,s) for cid,s,_ in section_blocks})} |")
_md(f"| Docentes utilizados | {len(docentes_usados)} |")
_md(f"| Aulas utilizadas | {len(aulas_usadas)} |")
_we_md_note = " _(días bloqueados)_" if _BLOCK_WEEKENDS and weekend_blocks == 0 else ""
_md(f"| Bloques en fin de semana | {weekend_blocks}{_we_md_note} {'✅' if weekend_blocks == 0 else '⚠️'} |")
_md()

# ── Distribución por turno ───────────────────────────────────
_md(f"## Distribución por Turno")
_md()
_md(f"| Sección | Diurno 07:00–18:00 | Nocturno 18:00–22:10 | % Noche | Estado |")
_md(f"|---|---:|---:|---:|:---:|")
for _s, _v in turno_stats.items():
    _tot = _v["day"] + _v["night"]
    _pct = 100 * _v["night"] / _tot if _tot else 0
    _ok  = "✅" if (_s < 3 and _pct < 50) or (_s == 3 and _pct >= 60) else "⚠️"
    _md(f"| S{_s} | {_v['day']} bloques | {_v['night']} bloques | {_pct:.0f}% | {_ok} |")
_md()

# ── Métricas de calidad ──────────────────────────────────────
_md(f"## Métricas de Calidad")
_md()
_md(f"| Métrica | Valor |")
_md(f"|---|---:|")
_md(f"| Bloques TEORÍA ≥4h _(penalizable)_ | {blocks_4h_theory} |")
_md(f"| Bloques PRÁCTICA ≥4h _(aceptable)_ | {blocks_4h_practice} |")
_md(f"| Salas con ≥4 bloques en algún día | {salas_saturadas} |")
_md(f"| Máximo diario promedio por sala | {avg_max_daily:.1f} |")
_md(f"| PRACTICE con docente distinto a THEORY | {practice_mismatches}/{practice_total} ({mismatch_pct:.1f}%) |")
_md(f"| Pares docente sin descanso ≥90min | {no_rest_pairs} |")
_md(f"| Bloques S3 fuera de horario nocturno | {len(_s3_violations)} |")
_md()

# ── Ocupación por sala ───────────────────────────────────────
_md(f"## Ocupación Máxima Diaria por Sala")
_md()
_REPORT_DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
_REPORT_DAY_LBL = {
    "MONDAY": "Lun", "TUESDAY": "Mar", "WEDNESDAY": "Mié",
    "THURSDAY": "Jue", "FRIDAY": "Vie", "SATURDAY": "Sáb", "SUNDAY": "Dom",
}
_md("| Sala | " + " | ".join(_REPORT_DAY_LBL[_d] for _d in _REPORT_DAYS) + " | Máx/día | Estado |")
_md("|---|" + "---:|" * len(_REPORT_DAYS) + "---:|:---:|")
_all_report_salas = sorted(set(daily_load_by_sala.keys()) | set(max_daily.keys()))
for _sala in _all_report_salas:
    _counts = [daily_load_by_sala[_sala].get(_d, 0) for _d in _REPORT_DAYS]
    _mx = max(_counts) if _counts else 0
    _st = "⚠️ saturada" if _mx >= 4 else "✅"
    _md("| " + _sala + " | " + " | ".join(str(_c) for _c in _counts) + f" | {_mx} | {_st} |")
_we_policy = "bloqueados por política (`_BLOCK_WEEKENDS = True`)" if _BLOCK_WEEKENDS else "permitidos — el algoritmo los usa si no hay slots Lun–Vie disponibles"
_md()
_md(f"> **Sáb / Dom:** {_we_policy}.")
_md()

# ── Completitud por curso ────────────────────────────────────
_md(f"## Validación de Consistencia Académica")
_md()
_md(f"### Completitud por Curso ({complete_count}/{n_assignable} completos)")
_md()
_md(f"| Código | Curso | S1-T | S1-P | S2-T | S2-P | S3-T | S3-P | Estado |")
_md(f"|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|")
for _row in completeness_rows:
    _req = course_required_types[next(
        _cid for _cid in assignable_course_ids if data.courses[_cid].code == _row["code"]
    )]
    _cols = []
    for _sec in [1, 2, 3]:
        _sd = _row["sections"][_sec]
        # Teoría
        _cols.append("N/A" if "THEORY" not in _req else ("✅" if _sd["present"] and _sd["ok_theory"] else "❌"))
        # Práctica / General
        _hp = "PRACTICE" in _req or "GENERAL" in _req
        _cols.append("N/A" if not _hp else ("✅" if _sd["present"] and _sd["ok_practice"] and _sd["ok_general"] else "❌"))
    _est = "✅ completo" if _row["complete"] else "❌ incompleto"
    _md(f"| `{_row['code']}` | {_row['cname']} | {_cols[0]} | {_cols[1]} | {_cols[2]} | {_cols[3]} | {_cols[4]} | {_cols[5]} | {_est} |")
_md()

# ── Incumplimientos de turno ─────────────────────────────────
_md(f"### Incumplimientos de Turno ({len(shift_violations)} bloques fuera de franja preferida)")
_md()
if _s3_violations:
    _md(f"#### S3 fuera de noche — alta penalización")
    _md()
    _md(f"| Código | Curso | Tipo | Día | Hora | Esperado | Asignado |")
    _md(f"|---|---|---|---|---:|---|---|")
    for _v in sorted(_s3_violations, key=lambda x: x["code"]):
        _md(f"| `{_v['code']}` | {_v['cname']} | {_v['ctype']} | {_v['day']} | {str(_v['start'])[:5]} | {_v['pref']} | {_v['actual']} |")
    _md()
if _other_violations:
    _md(f"#### S1/S2 fuera de turno — baja penalización")
    _md()
    _md(f"| Código | S | Tipo | Día | Hora | Esperado | Asignado |")
    _md(f"|---|---|---|---|---:|---|---|")
    for _v in sorted(_other_violations, key=lambda x: (x["sec"], x["code"])):
        _md(f"| `{_v['code']}` | S{_v['sec']} | {_v['ctype']} | {_v['day']} | {str(_v['start'])[:5]} | {_v['pref']} | {_v['actual']} |")
    _md()
if not shift_violations:
    _md(f"Ningún incumplimiento de turno detectado. ✅")
    _md()

# ── Inconsistencias docente ──────────────────────────────────
_md(f"### Inconsistencias Docente Theory/Practice")
_md()
if mismatch_details:
    _md(f"| Código | Sección | Docente Teoría | Docente Práctica |")
    _md(f"|---|---|---|---|")
    for _m in mismatch_details:
        _md(f"| `{_m['code']}` | S{_m['sec']} | {_m['t_theory']} | {_m['t_pract']} |")
else:
    _md(f"Ninguna inconsistencia detectada. ✅")
_md()

# ── Problemas de reporte ─────────────────────────────────────
_md(f"### Problemas de Reporte")
_md()
if report_issues:
    _md(f"| Tipo | Severidad | Descripción |")
    _md(f"|---|:---:|---|")
    for _tipo, _desc, _sev in report_issues:
        _sev_icon = "🔴" if _sev == "ALTA" else ("🟡" if _sev == "MEDIA" else "🟢")
        _md(f"| {_tipo} | {_sev_icon} {_sev} | {_desc} |")
else:
    _md(f"Ningún problema detectado. ✅")
_md()

# ── Detalle por sala ─────────────────────────────────────────
_md(f"## Detalle de Horario por Sala")
_md()

for _aula_name in sorted(aula_schedule):
    _cap         = aula_schedule[_aula_name]["cap"]
    _days        = aula_schedule[_aula_name]["days"]
    _total_blks  = sum(len(_v) for _v in _days.values())
    _days_used   = [_d for _d in DAY_ORDER if _d in _days]

    _md(f"### {_aula_name}")
    _md()
    _md(f"**Capacidad:** {_cap} personas &nbsp;|&nbsp; **Días con clase:** {len(_days_used)} &nbsp;|&nbsp; **Total bloques:** {_total_blks}")
    _md()

    for _day_key in DAY_ORDER:
        _blocks = _days.get(_day_key)
        if not _blocks:
            continue
        _blocks_sorted = sorted(_blocks, key=lambda r: r["start"])
        _day_label = DAY_ES[_day_key]
        if _day_key in {"SATURDAY", "SUNDAY"}:
            _day_label += " ⚠️ Fin de semana"

        _md(f"#### {_day_label}")
        _md()
        _md(f"| Inicio | Fin | H | Tipo | Curso | Nombre | S | NRC | Docente |")
        _md(f"|---:|---:|---:|---|---|---|:---:|---|---|")
        for _r in _blocks_sorted:
            _tipo   = TIPO_ES.get(_r["type"], _r["type"])
            _moon   = " 🌙" if _r["start"] >= "18:00" else ""
            _md(f"| {_r['start']}{_moon} | {_r['end']} | {_r['dur']}h | {_tipo} | `{_r['code']}` | {_r['name']} | S{_r['sec']} | {_r['nrc']} | {_r['teacher']} |")
        _md()

# ── Escribir archivo ─────────────────────────────────────────
_md_path = pathlib.Path(__file__).parent / "REPORTE_HORARIO.md"
_md_path.write_text("\n".join(_md_lines), encoding="utf-8")
print(f"\n  📄 Reporte exportado → {_md_path}")

close_pool()
