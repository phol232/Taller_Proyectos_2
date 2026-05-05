# Spec.md — Sistema de Generación Óptima de Horarios Académicos (Planner UC)

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Proyecto:** Planner UC  
**Curso:** Taller de Proyectos 2

---

## 1. Propósito de este documento

Este documento formaliza el comportamiento del sistema Planner UC **antes de su implementación**. Su objetivo es:

- Eliminar ambigüedad en los requerimientos funcionales.
- Definir qué entra al sistema, qué produce y bajo qué reglas opera.
- Anticipar conflictos conocidos del dominio (solapamientos, restricciones imposibles, casos límite).
- Servir como referencia para que cualquier miembro del equipo implemente sin necesidad de suponer.

Todo módulo del sistema (frontend, backend, solver CSP) debe ser coherente con lo aquí descrito. Si la implementación difiere, este documento debe actualizarse antes de cerrar la historia de usuario correspondiente.

---

## 2. Alcance del sistema

Planner UC genera horarios académicos automáticamente en dos fases:

| Fase | Qué hace | Quién lo activa |
|---|---|---|
| **Fase 1 — Horario institucional** | Asigna cada componente de curso a un docente, un aula y una franja horaria sin solapamientos | Coordinador Académico |
| **Fase 2 — Horario del estudiante** | Selecciona las ofertas de componentes disponibles para cada estudiante, respetando prerrequisitos, créditos, vacantes y turno | Estudiante o Coordinador |

**Límites del PMV:** hasta 50 estudiantes, 20 docentes, 30 cursos, 20 aulas.

**Roles del sistema:** Administrador, Coordinador Académico, Docente, Estudiante.

---

## 3. Entradas

### 3.1. Entidades que el sistema debe recibir y almacenar

| Entidad | Campos obligatorios | Regla de validación |
|---|---|---|
| **Estudiante** | Código único, nombre, ciclo, carrera, lista de cursos aprobados | El código no puede repetirse. Los cursos aprobados deben existir en el sistema. |
| **Docente** | Código único, nombre, especialidad, disponibilidad horaria semanal | El código no puede repetirse. La disponibilidad se expresa como franjas (día, hora inicio, hora fin). |
| **Curso** | Código único, nombre, créditos ∈ [1,6], horas semanales ≥ 1, lista de prerrequisitos | Los prerrequisitos deben existir en el sistema. Los corequisitos también. |
| **Aula** | Código único, capacidad > 0, tipo (regular / laboratorio), disponibilidad | Capacidad mínima: 1. El tipo debe coincidir con el tipo de aula requerido por el componente de curso. |
| **Componente de curso** | Tipo (GENERAL / THEORY / PRACTICE), horas semanales, tipo de aula requerido | Un curso tiene exactamente un componente GENERAL **o** la combinación THEORY + PRACTICE. No se mezclan. La suma de horas de los componentes debe coincidir con el total de horas del curso. |

### 3.2. Configuración del período académico

- Período académico activo (fechas de inicio y fin).
- Franjas horarias disponibles (`time_slots`): día de la semana, hora inicio, hora fin, turno (mañana / tarde / noche).
- Tiempos de traslado entre edificios (`building_travel_times`): minutos requeridos entre edificio A y edificio B.
- Límite máximo de créditos por estudiante por período.
- Turno preferido del estudiante (mañana / tarde / noche).

### 3.3. Compatibilidades y disponibilidades

- Disponibilidad semanal por docente: qué franjas puede y no puede trabajar.
- Disponibilidad por aula: en qué franjas está habilitada.
- Qué docentes pueden dictar cada componente de curso (`teacher_course_components`).
- Qué aulas están autorizadas para cada curso (`classroom_courses`).

---

## 4. Salidas

### 4.1. Fase 1 — Horario institucional

| Salida | Descripción |
|---|---|
| Horario institucional en estado **DRAFT** | Conjunto de asignaciones curso-componente-docente-aula-franja generadas por el solver. Requiere confirmación del Coordinador para activarse. |
| Asignaciones por componente | Para cada componente de curso: qué docente lo dicta, en qué aula, en qué franjas horarias. |
| Reporte de conflictos | Lista de restricciones duras que no pudieron satisfacerse, con descripción del recurso y la restricción violada. |
| Estado de ejecución | `SUCCEEDED` (se encontró solución completa) o `FAILED` (no se encontró; con lista de conflictos). |

### 4.2. Fase 2 — Horario del estudiante

| Salida | Descripción |
|---|---|
| Horario del estudiante | Conjunto de cursos asignados al estudiante para el período, con sus componentes y franjas concretas. |
| Detalle por curso | Para cada curso asignado: componente elegido, oferta seleccionada, aula y franja. |
| Indicador de turno desbordado (`SHIFT_OVERFLOW`) | Se emite cuando el estudiante fue asignado en un turno distinto a su turno preferido por falta de opciones. |
| Notificación de imposibilidad | Si no existe combinación válida para un curso o para todos, el sistema indica el motivo específico (sin vacantes, sin oferta en turno, prerrequisito faltante, etc.). |

### 4.3. Visualización y exportación

- Grilla semanal (días × franjas) con: nombre del curso, componente, docente asignado y aula.
- Exportación del horario en PDF o Excel con todos los campos de la grilla.
- Tiempo de carga de la grilla: ≤ 3 segundos.
- Tiempo de exportación: ≤ 30 segundos.

---

## 5. Reglas de negocio

Las siguientes reglas definen el comportamiento del sistema independientemente de la tecnología que lo implemente.

1. **Prioridad de restricciones duras:** El sistema siempre satisface primero las restricciones duras (sección 6). Las restricciones blandas (sección 7) solo se optimizan si las duras ya están satisfechas.
2. **Sin horarios inválidos silenciosos:** Si el solver no puede satisfacer todas las restricciones duras, genera la mejor solución parcial posible y reporta explícitamente los conflictos. Nunca persiste un horario con solapamientos sin reportarlos.
3. **Ciclo de vida del horario institucional:** Los horarios institucionales nacen en estado `DRAFT`. Solo el Coordinador puede confirmarlos. Un horario `CONFIRMED` no puede modificarse directamente; debe cancelarse para liberar recursos.
4. **Dependencia entre fases:** La Fase 2 solo puede ejecutarse sobre un horario institucional en estado `CONFIRMED`. Sin ese prerequisito, la Fase 2 no inicia.
5. **Conteo de créditos por curso:** Los créditos se suman por curso (`course_id`), no por componente. Un estudiante con teoría y práctica del mismo curso acumula los créditos del curso una sola vez.
6. **Atomicidad de cursos compuestos:** Un curso con componentes THEORY + PRACTICE se asigna completo o no se asigna. No existe estado intermedio donde el estudiante tenga solo la teoría.
7. **Atomicidad de corequisitos:** Los cursos declarados como corequisitos se asignan como grupo: todos o ninguno.
8. **Trazabilidad obligatoria:** Toda asignación generada debe poder auditarse hasta sus datos de entrada (docente, aula, franja, componente). El sistema no acepta asignaciones sin origen trazable.
9. **Mensajes de error descriptivos:** Los errores que se muestran al usuario siempre incluyen qué restricción fue violada y qué recurso está involucrado. Nunca se muestra solo un código genérico.
10. **Validación en tiempo real en ajustes manuales:** Cuando el Coordinador ajusta una asignación manualmente, el sistema valida en ≤ 1 segundo si el cambio produce solapamiento antes de guardarlo.

---

## 6. Restricciones duras

Las restricciones duras no pueden violarse. Una asignación que viole cualquiera de ellas es inválida.

### Fase 1 — Horario institucional

| ID | Restricción | Por qué existe |
|---|---|---|
| **H1** | Un docente no puede estar asignado a dos componentes en el mismo bloque horario | Un docente físicamente no puede estar en dos lugares al mismo tiempo |
| **H2** | Un aula no puede albergar dos componentes en el mismo bloque horario | Un aula es un recurso físico no compartible simultáneamente |
| **H3** | Solo se asignan franjas en las que el docente declaró disponibilidad | Respetar la disponibilidad es un acuerdo institucional con el docente |
| **H4** | Solo se asignan franjas en las que el aula está habilitada | Las aulas pueden tener restricciones de uso por mantenimiento u otros usos |
| **H5** | El aula asignada debe ser del tipo requerido por el componente (regular / laboratorio) | Una práctica de laboratorio no puede realizarse en un aula regular |
| **H6** | El docente asignado debe estar habilitado para dictar ese componente específico | No todo docente puede dictar cualquier componente; hay habilitaciones por competencia |
| **H7** | Cada asignación de componente debe tener exactamente la cantidad de horas semanales definidas en el componente | El plan de estudios define cuántas horas corresponden a cada componente |
| **H8** | La capacidad del aula debe ser igual o mayor a la demanda proyectada del curso | Un aula pequeña no puede albergar a más estudiantes de los que tiene capacidad |
| **H9** | Si un docente tiene clases en bloques consecutivos en edificios distintos, el tiempo de traslado debe ser factible | Un docente no puede teleportarse entre edificios |

### Fase 2 — Horario del estudiante

| ID | Restricción | Por qué existe |
|---|---|---|
| **H10** | El estudiante solo puede llevar un curso si tiene todos sus prerrequisitos aprobados | El plan de estudios define prerrequisitos como condición académica |
| **H11** | La suma de créditos de los cursos asignados no puede superar el límite del estudiante ni el del período | Límite académico para evitar sobrecarga |
| **H12** | Solo se puede asignar un estudiante a una oferta de componente si hay vacantes disponibles | Cada sección tiene un cupo máximo físico |
| **H13** | Los bloques asignados deben corresponder al turno preferido del estudiante; si no hay opciones en ese turno, se puede asignar en turno adyacente con indicador `SHIFT_OVERFLOW` | El turno preferido del estudiante es una restricción de disponibilidad personal |
| **H14** | Un curso con THEORY + PRACTICE se asigna de forma atómica: ambos componentes o ninguno | Un estudiante no puede llevar solo la teoría o solo la práctica de un curso compuesto |
| **H15** | Los corequisitos se asignan en bloque: todos o ninguno | Los corequisitos están diseñados para tomarse juntos; uno sin el otro no cumple el objetivo académico |
| **H16** | El tiempo de traslado entre bloques consecutivos del estudiante debe ser factible según los edificios involucrados | El estudiante tampoco puede teleportarse entre edificios |

---

## 7. Restricciones blandas

Las restricciones blandas son preferencias que mejoran la calidad del horario pero no lo invalidan. Su incumplimiento penaliza el score del horario generado.

| ID | Preferencia | Impacto si no se cumple |
|---|---|---|
| **S1** | Minimizar huecos en el horario del estudiante (bloques libres entre clases) | Horarios con muchos huecos son percibidos como ineficientes por los estudiantes |
| **S2** | Evitar que un docente tenga más de 4 horas consecutivas de clase | Afecta el bienestar y la calidad del dictado del docente |
| **S3** | Distribuir los bloques de un mismo componente en días distintos (no acumular todo en un día) | Evita jornadas sobrecargadas para docentes y estudiantes |
| **S4** | Preferir aulas cuya capacidad esté cerca de la demanda real del curso | Evita desperdiciar aulas grandes para cursos pequeños |
| **S5** | Agrupar cursos del mismo ciclo en franjas horarias compatibles | Facilita que los estudiantes del mismo ciclo puedan organizar su horario |
| **S6** | Preferir que la teoría y la práctica de un curso queden en días distintos | Permite al estudiante prepararse mejor entre ambas sesiones |

---

## 8. Casos límite

Los casos límite son situaciones que el sistema debe manejar correctamente sin fallar ni generar resultados inválidos. Identificarlos antes de implementar evita bugs y comportamientos inesperados.

| ID | Situación | Comportamiento esperado del sistema |
|---|---|---|
| **CL-01** | Docente sin disponibilidad horaria registrada | El solver no puede asignarle ningún componente. Reporta el conflicto al Coordinador. No bloquea la generación del resto del horario. |
| **CL-02** | Aula con capacidad insuficiente para la demanda de todos los cursos | Se priorizan los cursos con mayor demanda. Los cursos que no encuentran aula suficiente reportan `NO_CLASSROOM_AVAILABLE`. |
| **CL-03** | Curso sin docente habilitado para alguno de sus componentes | El componente no puede asignarse. El curso completo queda sin asignación y el conflicto se reporta. |
| **CL-04** | Más cursos que bloques horarios disponibles | El solver asigna primero los cursos con menor dominio de opciones (heurística MRV). Los cursos que no encuentran slot reportan `NO_SLOT_AVAILABLE`. |
| **CL-05** | Docente disponible solo en horario nocturno para un curso diseñado para turno diurno | El componente no puede asignarse en ese bloque. El conflicto se registra. No se fuerza la asignación violando H3. |
| **CL-06** | Curso con teoría y práctica que requieren tipos de aula diferentes (regular y laboratorio) | El solver busca aulas de cada tipo por separado para cada componente. Si no existe alguno de los tipos, reporta `NO_CLASSROOM_AVAILABLE` para ese componente. |
| **CL-07** | Dos cursos corequisitos donde uno no puede asignarse por falta de docente o aula | Se libera la reserva del corequisito que sí tenía asignación. Ambos quedan sin asignar. Se notifica al estudiante. |
| **CL-08** | Estudiante sin turno preferido registrado | El solver usa todos los turnos disponibles sin restricción de turno. No se emite `SHIFT_OVERFLOW`. |
| **CL-09** | La misma aula es requerida por múltiples cursos en el mismo bloque | Se asigna al primer curso que la solicita (según orden de prioridad del solver). Los demás buscan aula alternativa o reportan `NO_CLASSROOM_AVAILABLE`. |
| **CL-10** | Agregar el último curso candidato al horario del estudiante excedería el límite de créditos | El curso no se agrega. El sistema muestra: créditos actuales + créditos del curso vs. límite (ej: "20 + 5 = 25 créditos, límite: 22"). |
| **CL-11** | Se solicita generar el horario del estudiante sin que exista un horario institucional confirmado | La Fase 2 no inicia. El sistema devuelve error descriptivo: "No existe horario institucional confirmado para este período." |
| **CL-12** | El solver no encuentra solución en el tiempo límite de 30 segundos | Se notifica al Coordinador con los conflictos identificados hasta ese momento. No se persiste ningún horario inválido. |

---

## 9. Reducción de ambigüedad

Esta sección documenta los términos y situaciones que en la especificación preliminar eran vagos, y cómo fueron precisados en este documento.

| Término o situación ambigua | Problema | Definición precisa en este Spec |
|---|---|---|
| "Horario sin solapamientos" | No especificaba qué tipo de solapamiento (docente, aula, estudiante) | H1: solapamiento de docente. H2: solapamiento de aula. H16: solapamiento en horario personal del estudiante. Cada uno tiene su propia restricción. |
| "Respetar disponibilidad del docente" | No precisaba si era solo para el solver o también para ajustes manuales | H3 aplica a la generación automática. La validación en tiempo real (regla 10 de negocio) aplica a ajustes manuales. |
| "Generación rápida del horario" | No definía qué es "rápido" ni bajo qué condiciones | Fase 1: ≤ 30 segundos para el escenario base del PMV. Fase 2: ≤ 5 segundos por estudiante. Condiciones: hasta 50 est., 20 doc., 30 cursos, 20 aulas. |
| "Cursos con práctica y teoría" | No estaba claro si eran cursos separados o componentes del mismo curso | Son componentes del mismo curso (`course_components`). El estudiante lleva un solo curso para créditos, pero el solver agenda dos bloques. Definido en la sección 3.1. |
| "El sistema prioriza ciertas restricciones" | No había jerarquía explícita entre restricciones | Sección 6 (duras) vs. sección 7 (blandas). Las duras no pueden violarse. Las blandas penalizan el score. La regla 1 de negocio establece la jerarquía. |
| "Asignación completa" | No estaba claro qué pasa si el solver no puede asignar todo | Regla 2 de negocio: genera la mejor solución parcial y reporta conflictos. CL-12 define el comportamiento por timeout. |
| "Validar prerrequisitos" | No especificaba en qué momento se valida ni qué sucede si falta | H10 aplica en la Fase 2. CL-10 define el mensaje que se muestra al estudiante cuando el crédito excede el límite. CL-07 define qué pasa con corequisitos fallidos. |

---

## 10. Anticipación de conflictos

Esta sección identifica los conflictos más frecuentes del dominio de timetabling y cómo el sistema los previene o maneja.

### 10.1. Solapamiento de docente (el más frecuente)

**Escenario:** El Coordinador asigna manualmente el curso MAT-101 y el curso FIS-101 al mismo docente en la misma franja horaria del lunes.

**Conflicto:** El docente no puede estar en dos aulas al mismo tiempo.

**Cómo lo previene este spec:**
- H1 prohíbe esta asignación explícitamente.
- La regla 10 de negocio obliga al sistema a validar en ≤ 1 segundo y rechazar antes de guardar.
- El mensaje de error debe indicar: docente afectado, cursos en conflicto y franja horaria.

---

### 10.2. Solapamiento de aula

**Escenario:** El solver intenta asignar los cursos BIO-101 y QUI-101 al Laboratorio L-1 en el mismo bloque del martes.

**Conflicto:** El laboratorio no puede usarse por dos cursos al mismo tiempo.

**Cómo lo previene este spec:**
- H2 prohíbe esta asignación.
- El constraint `UNIQUE(teaching_schedule_id, classroom_id, time_slot_id)` en base de datos actúa como segunda línea de defensa.

---

### 10.3. Curso compuesto parcialmente asignado

**Escenario:** El solver encuentra aula y docente para la teoría de FIS-101, pero no para la práctica (el único laboratorio compatible está ocupado).

**Conflicto:** El estudiante quedaría con solo la teoría, lo que no cumple el plan de estudios.

**Cómo lo previene este spec:**
- H14 exige atomicidad: si la práctica no puede asignarse, la teoría también se libera.
- CL-06 define el comportamiento exacto cuando falta aula para un componente.

---

### 10.4. Restricción de prerrequisito no satisfecha

**Escenario:** Un estudiante intenta agregar CALC-2 a su horario sin haber aprobado CALC-1.

**Conflicto:** El plan de estudios no permite cursar CALC-2 sin CALC-1 aprobado.

**Cómo lo previene este spec:**
- H10 bloquea la asignación.
- El sistema debe indicar explícitamente qué prerrequisito falta (regla 9 de negocio).

---

### 10.5. Saturación de recursos en horario pico

**Escenario:** La mayoría de docentes solo tienen disponibilidad de lunes a miércoles. El solver intenta asignar 30 cursos en esos 3 días.

**Conflicto:** Pocos bloques disponibles para muchos cursos, generando conflictos en cadena.

**Cómo lo previene este spec:**
- El solver aplica la heurística MRV (Minimum Remaining Values): asigna primero los componentes con menos opciones disponibles.
- CL-04 define el comportamiento cuando no alcanza el espacio: reporte de `NO_SLOT_AVAILABLE` por componente no asignado.
- R-04 del documento de riesgos identifica este escenario como riesgo de rendimiento.

---

### 10.6. Exceso de créditos por corequisitos

**Escenario:** Un estudiante quiere llevar dos cursos corequisitos, pero juntos superan su límite de créditos.

**Conflicto:** H11 (límite de créditos) y H15 (corequisitos atómicos) generan un conflicto entre sí.

**Cómo lo previene este spec:**
- H11 tiene precedencia: si los corequisitos superan el límite, el grupo completo no se asigna.
- El sistema notifica al estudiante indicando los créditos resultantes vs. el límite.
