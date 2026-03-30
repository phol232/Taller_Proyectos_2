# Declaración de la Visión del Proyecto
## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Visión General del Proyecto

**Para** estudiantes, docentes y coordinadores académicos de instituciones universitarias con currículo flexible,  
**quienes** enfrentan conflictos de disponibilidad, solapamientos de horarios y una asignación ineficiente de recursos académicos derivados de procesos manuales o herramientas sin capacidad de optimización,  
**Planner UC** es un sistema web que genera automáticamente horarios académicos válidos y optimizados mediante modelado de restricciones (CSP) y técnicas de optimización combinatoria.  
**A diferencia de** los métodos manuales o sistemas básicos sin motor de restricciones,  
**Planner UC** produce asignaciones libres de conflictos (sin solapamiento de docentes, aulas ni estudiantes), respeta prerrequisitos y límites de créditos, y entrega resultados verificables en menos de 30 segundos para escenarios del PMV con hasta 50 estudiantes, 20 docentes, 30 cursos y 20 aulas.

---

### 2. Declaración de Valor

| Dimensión | Descripción |
|:---|:---|
| **Problema central** | La planificación manual de horarios en currículos flexibles genera conflictos de solapamiento, subutilización de aulas y errores de asignación no detectados hasta la ejecución. |
| **Usuarios objetivo** | Estudiantes (selección de cursos), Docentes (disponibilidad horaria), Coordinadores Académicos (supervisión y ajuste), Administradores (gestión del sistema). |
| **Solución propuesta** | Sistema web SPA + API REST con motor CSP para generación automática de horarios sin conflictos. |
| **Diferenciador técnico** | Validación en tiempo real de restricciones (créditos, prerrequisitos, vacantes, solapamientos) durante la construcción manual o automática del horario. |
| **Métrica de éxito principal** | El sistema genera un horario docente válido (cero solapamientos verificables) en ≤ 30 segundos para el escenario base del PMV. |

---

### 3. Alcance del Sistema (PMV)

**Incluido en el alcance:**
- Gestión CRUD de entidades: estudiantes, docentes, cursos, aulas.
- Validación de prerrequisitos y límites de créditos por estudiante.
- Generación automática de horario docente (asignación curso-docente-aula-franja).
- Generación automática de propuesta de horario por estudiante.
- Construcción y ajuste manual de horarios (docente y estudiante) con validación en tiempo real.
- Visualización de horarios (por estudiante, por docente, general del período).
- Exportación en PDF y Excel.
- Autenticación con control de acceso por roles (Administrador, Coordinador, Docente, Estudiante).

**Fuera del alcance del PMV:**
- Cambios de horario en tiempo real durante el período académico activo.
- Integración con sistemas ERP universitarios externos.
- Aplicación móvil nativa.
- Optimización multi-objetivo avanzada (más allá de la factibilidad sin conflictos).

---

### 4. Restricciones de Alto Nivel

| ID | Restricción | Justificación |
|:---|:---|:---|
| REST-01 | El sistema debe operar dentro de un período académico acotado de desarrollo. | Restricción de tiempo académico; el PMV debe ser demostrable al cierre del curso. |
| REST-02 | La generación de horarios debe ejecutarse con recursos computacionales moderados (sin infraestructura cloud especializada). | El proyecto es académico; no se dispone de presupuesto para cómputo intensivo. |
| REST-03 | El sistema debe respetar las reglas académicas institucionales como condición no negociable. | Cualquier horario que viole prerrequisitos o produzca solapamientos carece de validez operativa. |
| REST-04 | La calidad de los resultados depende de la completitud y consistencia de los datos de entrada. | Datos incompletos o inconsistentes producen horarios inválidos; la gestión de datos es responsabilidad del operador. |

---

### 5. Criterio de Finalización del Proyecto

El proyecto se considerará exitoso cuando:

1. El sistema genere al menos un horario docente válido (cero solapamientos de docente y aula) en el escenario base del PMV (≤ 50 estudiantes, ≤ 20 docentes, ≤ 30 cursos, ≤ 20 aulas) en un tiempo de respuesta ≤ 30 segundos.
2. Se cumplan el 100% de los requerimientos funcionales marcados como obligatorios (RF-01 a RF-18).
3. El sistema sea demostrable mediante un caso real o simulado con datos representativos.
4. Se entregue la documentación técnica completa (análisis, arquitectura, modelo CSP, pruebas).
5. La cobertura de pruebas unitarias e integración alcance mínimo el 70% en módulos críticos (motor CSP, validaciones, autenticación).