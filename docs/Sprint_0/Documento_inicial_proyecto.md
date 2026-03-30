# Documento Inicial del Proyecto
## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Visión General del Proyecto

**Planner UC** es un sistema web de generación automática de horarios académicos para universidades con currículo flexible. El sistema modela el problema como un CSP (Constraint Satisfaction Problem) y aplica técnicas de optimización combinatoria para producir asignaciones válidas (sin solapamientos de docentes, aulas ni estudiantes) que respeten restricciones académicas y operativas.

**Alcance técnico del PMV:**
- Arquitectura SPA (frontend) + API REST (backend).
- Motor de generación de horarios basado en CSP.
- Validación en tiempo real de restricciones durante construcción manual o automática.
- Gestión CRUD de entidades académicas (estudiantes, docentes, cursos, aulas).
- Visualización y exportación de horarios generados.
- Autenticación y control de acceso por roles.

**Límites de datos del PMV:** hasta 50 estudiantes, 20 docentes, 30 cursos y 20 aulas.

---

### 2. Planteamiento del Problema

Las universidades con currículo flexible permiten a los estudiantes seleccionar cursos dinámicamente, lo que incrementa la complejidad de la planificación de horarios. Los procesos actuales, manuales o con herramientas sin motor de restricciones, producen:

- Conflictos de solapamiento entre cursos para un mismo docente o aula.
- Asignación ineficiente del espacio físico disponible.
- Incumplimiento no detectado de prerrequisitos académicos.
- Sobreasignación o subutilización de carga docente.
- Insatisfacción de estudiantes y coordinadores por tiempos de resolución prolongados.

El problema es técnicamente clasificable como un **CSP NP-difícil** a medida que escala el número de variables y restricciones, lo que requiere un diseño algorítmico deliberado para garantizar tiempos de respuesta aceptables dentro del alcance del PMV.

---

### 3. Justificación

| Impacto | Métrica Esperada |
|:---|:---|
| Reducción de conflictos de horario | El sistema genera horarios con 0 solapamientos verificables (docente, aula, estudiante). |
| Eficiencia del proceso | Tiempo de generación del horario docente ≤ 30 segundos para el escenario base del PMV. |
| Calidad académica | El 100% de los horarios generados respeta prerrequisitos y límites de créditos configurados. |
| Usabilidad | Un usuario nuevo completa tareas básicas (registro de entidad, visualización de horario) en ≤ 5 minutos. |

---

### 4. Objetivo General

Diseñar e implementar un sistema web que genere automáticamente horarios académicos válidos —sin conflictos de solapamiento, respetando prerrequisitos y límites de créditos— para entornos universitarios con currículo flexible, dentro del período académico establecido.

---

### 5. Objetivos Específicos (SMART)

| ID | Objetivo | Métrica de Verificación | Plazo |
|:---|:---|:---|:---|
| OBJ-01 | Implementar el motor CSP que genere horarios docentes sin solapamientos. | Cero solapamientos detectables en los resultados generados para el escenario base del PMV. | Fin del Sprint de implementación del algoritmo. |
| OBJ-02 | Desarrollar los módulos CRUD para las 4 entidades base (estudiantes, docentes, cursos, aulas). | Todas las operaciones CRUD pasan las pruebas de integración definidas. | Fin del Sprint de gestión de entidades. |
| OBJ-03 | Implementar validación en tiempo real de restricciones del horario del estudiante. | El sistema detecta y notifica solapamientos, exceso de créditos y prerrequisitos incumplidos en ≤ 1 segundo tras cada acción del usuario. | Fin del Sprint de interfaz de usuario. |
| OBJ-04 | Alcanzar cobertura de pruebas ≥ 70% en módulos críticos (CSP, validaciones, autenticación). | Reporte de cobertura generado por herramienta de testing con resultado ≥ 70%. | Fin del Sprint de pruebas. |
| OBJ-05 | Entregar el sistema demostrable con un caso real o simulado. | Demostración exitosa ante el docente evaluador con datos representativos. | Presentación final del proyecto. |

---

### 6. Alcance del Sistema

#### 6.1 Dentro del Alcance

| Módulo | Descripción |
|:---|:---|
| Gestión de entidades | CRUD de estudiantes, docentes, cursos y aulas con sus atributos académicos. |
| Validación académica | Verificación de prerrequisitos y límites de créditos por estudiante. |
| Generación automática de horario docente | Asignación curso-docente-aula-franja horaria sin solapamientos. |
| Generación automática de horario del estudiante | Propuesta de combinación válida de secciones según restricciones académicas. |
| Construcción y ajuste manual | Interfaz para ajustar horarios generados con validación en tiempo real. |
| Visualización | Horario por estudiante, por docente y general del período académico. |
| Exportación | PDF y Excel de los horarios generados. |
| Autenticación y autorización | Sesiones seguras o JWT, control de acceso por roles (Administrador, Coordinador, Docente, Estudiante). |

#### 6.2 Fuera del Alcance del PMV

- Cambios de horario en tiempo real durante el período académico activo.
- Integración con sistemas ERP o SIS universitarios externos.
- Aplicación móvil nativa.
- Optimización multi-objetivo avanzada más allá de la factibilidad sin conflictos.
- Soporte multi-institución o multi-sede.

---

### 7. Identificación de Variables del Problema CSP

| Variable | Símbolo | Descripción | Dominio |
|:---|:---|:---|:---|
| Cursos | C | Asignaturas disponibles para el período. | Conjunto finito de cursos registrados. |
| Docentes | D | Profesores asignables a secciones de cursos. | Docentes con disponibilidad horaria registrada. |
| Estudiantes | E | Usuarios que seleccionan cursos. | Estudiantes con prerrequisitos y créditos validados. |
| Aulas | A | Espacios físicos disponibles. | Aulas con capacidad y tipo compatibles con el curso. |
| Franjas Horarias | H | Bloques de tiempo disponibles en la semana. | Bloques fijos (ej. 2 horas) según configuración. |

---

### 8. Identificación de Restricciones del Problema

| Categoría | Restricción | Tipo |
|:---|:---|:---|
| Académica | Un estudiante no puede cursar una asignatura sin haber aprobado sus prerrequisitos. | Obligatoria (hard constraint) |
| Académica | Un estudiante no puede superar el límite de créditos por período (20-22 créditos). | Obligatoria (hard constraint) |
| Operativa | Un docente no puede estar asignado a dos secciones en la misma franja horaria. | Obligatoria (hard constraint) |
| Operativa | Un aula no puede ser ocupada por dos secciones en la misma franja horaria. | Obligatoria (hard constraint) |
| Operativa | El número de estudiantes matriculados en una sección no puede superar la capacidad del aula asignada. | Obligatoria (hard constraint) |
| Temporal | Ningún estudiante puede tener dos secciones en la misma franja horaria. | Obligatoria (hard constraint) |
| Temporal | Los cursos deben distribuirse coherentemente a lo largo de la semana (no concentrar toda la carga en un día). | Deseable (soft constraint) |
| Equidad | La distribución de carga horaria entre docentes debe ser razonablemente equilibrada. | Deseable (soft constraint) |

---

### 9. Actores del Sistema

| Actor | Rol en el Sistema |
|:---|:---|
| Estudiante | Selecciona cursos, revisa y ajusta su horario, visualiza el horario final. |
| Docente | Registra disponibilidad horaria, visualiza su horario asignado. |
| Coordinador Académico | Supervisa la generación de horarios docentes, realiza ajustes y confirma asignaciones. |
| Administrador | Gestiona el sistema (entidades, usuarios, configuración de período académico). |

---

### 10. Supuestos Iniciales

1. Los horarios se dividen en bloques fijos (mínimo 2 horas por bloque).
2. Cada sección de un curso tiene un único docente asignado.
3. Los estudiantes seleccionan sus cursos antes de ejecutar la generación del horario.
4. Los datos de entrada (cursos, docentes, aulas, disponibilidades) están registrados y son consistentes antes de la generación.
5. No se consideran cambios de asignación en tiempo real durante la ejecución del algoritmo de generación.
6. El sistema operará con recursos computacionales moderados (sin infraestructura cloud especializada).

---

### 11. Limitaciones Reconocidas

| Limitación | Impacto | Mitigación |
|:---|:---|:---|
| Capacidad computacional moderada. | Puede limitar la exploración del espacio de soluciones para instancias grandes. | El PMV se delimita a un escenario de datos representativo (≤ 50 estudiantes, ≤ 30 cursos). |
| Disponibilidad parcial del equipo de desarrollo. | Puede afectar la velocidad de entrega. | Priorización del backlog por valor y gestión de riesgos por sprint. |
| Calidad de los datos de entrada. | Datos incompletos producen resultados inválidos. | Validación de datos en el módulo de gestión antes de habilitar la generación. |

---

### 12. Resultado Esperado

Al finalizar el proyecto, se habrá entregado un sistema que:

- Genera horarios docentes válidos (cero solapamientos) en ≤ 30 segundos para el escenario base.
- Genera propuestas de horario por estudiante en ≤ 5 segundos bajo condiciones normales.
- Permite visualizar y exportar los horarios generados en PDF y Excel.
- Es demostrable con un conjunto de datos representativo del entorno universitario.
- Cumple los estándares de calidad definidos en ISO/IEC 25010 para los atributos priorizados.