# Project Charter
## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Propósito y Justificación del Proyecto

El proyecto Planner UC surge ante la necesidad de automatizar la planificación de horarios académicos en entornos universitarios con currículo flexible, donde la alta variabilidad en la matrícula estudiantil, la disponibilidad de docentes y las limitaciones de infraestructura generan conflictos de solapamiento y procesos manuales ineficientes.

**Indicadores que justifican el proyecto:**
- La generación manual de horarios no garantiza la ausencia de solapamientos verificables.
- Los sistemas actuales sin motor de restricciones no validan prerrequisitos ni límites de créditos de forma automática.
- El tiempo de resolución manual para escenarios con 30+ cursos y 20+ docentes es significativamente mayor al objetivo de ≤ 30 segundos del sistema propuesto.

---

### 2. Descripción General del Proyecto

Planner UC es un sistema web basado en arquitectura SPA + API REST que implementa un motor de satisfacción de restricciones (CSP) para generar automáticamente horarios académicos válidos. El sistema gestiona información académica y produce asignaciones que cumplen restricciones académicas, operativas y temporales definidas por la institución.

**Stack tecnológico (referencial, no restrictivo):**
- Frontend: SPA (framework moderno compatible con Chrome, Firefox y Edge actuales).
- Backend: API REST con lógica de negocio y motor CSP.
- Base de datos: sistema relacional con soporte transaccional.
- Autenticación: sesiones seguras o JWT con expiración.

---

### 3. Requisitos de Alto Nivel

| ID | Requisito | Criterio de Verificación |
|:---|:---|:---|
| RAL-01 | El sistema genera horarios sin solapamientos de docente, aula ni estudiante. | Cero solapamientos detectables en los resultados del escenario base del PMV. |
| RAL-02 | El sistema respeta prerrequisitos y límites de créditos por estudiante. | El 100% de los horarios generados cumple las reglas académicas configuradas. |
| RAL-03 | El sistema considera la disponibilidad de docentes, estudiantes y aulas. | No se producen asignaciones en franjas marcadas como no disponibles. |
| RAL-04 | El sistema ofrece una interfaz que permite completar tareas básicas en ≤ 5 minutos. | Evaluación con usuario nuevo completando registro + visualización de horario. |
| RAL-05 | El sistema cumple con estándares básicos de seguridad (autenticación, autorización, protección de datos). | Pruebas de acceso sin autenticación y de acceso fuera de rol retornan rechazo (HTTP 401/403). |
| RAL-06 | El sistema genera el horario docente en ≤ 30 segundos para el escenario base del PMV. | Medición de tiempo de respuesta en entorno de pruebas con datos del escenario base. |

---

### 4. Objetivos del Proyecto y Criterios de Éxito

| Objetivo | Criterio de Éxito Medible |
|:---|:---|
| Desarrollar un sistema funcional que genere horarios válidos sin conflictos. | Demostración con datos representativos que produce horarios con cero solapamientos. |
| Implementar correctamente el modelo de optimización CSP. | El motor resuelve el escenario base (≤ 50 est., ≤ 20 doc., ≤ 30 cursos, ≤ 20 aulas) en ≤ 30 segundos. |
| Cumplir con todos los requerimientos funcionales definidos. | El 100% de los RF-01 a RF-18 son verificables mediante prueba de aceptación. |
| Entregar el proyecto dentro del tiempo académico establecido. | Entrega y demostración realizadas antes de la fecha de cierre del curso. |
| Mantener una arquitectura escalable y mantenible. | La incorporación de una nueva entidad o regla no requiere reestructuración completa del sistema. |
| Documentar todas las decisiones técnicas. | Documentación de arquitectura, modelo CSP, decisiones de diseño y API disponibles al cierre. |
| Lograr cobertura de pruebas ≥ 70% en módulos críticos. | Reporte de herramienta de testing con resultado ≥ 70% en módulos: CSP, validaciones, autenticación. |

---

### 5. Riesgos de Alto Nivel

| ID | Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
|:---|:---|:---|:---|:---|
| RIE-01 | Complejidad en el modelado del CSP supera la capacidad del equipo. | Media | Alto | Iniciar con modelo simplificado (solo restricciones hard); iterar hacia soft constraints. |
| RIE-02 | El algoritmo de generación supera el tiempo límite de 30 segundos. | Media | Alto | Delimitar el escenario base del PMV y aplicar heurísticas de poda temprana. |
| RIE-03 | Cambios en los requisitos durante el desarrollo. | Alta | Medio | Gestión ágil del backlog; cambios de alcance requieren aprobación del Gerente de Proyecto. |
| RIE-04 | Disponibilidad parcial del equipo afecta el cronograma. | Alta | Medio | Tareas priorizadas por valor; identificación de dependencias críticas en cada sprint. |
| RIE-05 | Problemas de integración entre frontend y backend. | Media | Medio | Definición de contrato de API REST antes del inicio de implementación paralela. |
| RIE-06 | Datos de entrada incompletos o inconsistentes. | Media | Medio | Módulo de validación de datos antes de habilitar la generación del horario. |

---

### 6. Cronograma Resumido de Hitos

| N° | Hito | Entregable Verificable |
|:---|:---|:---|
| H-01 | Inicio del proyecto | Project Charter firmado, backlog inicial priorizado. |
| H-02 | Análisis y modelado del problema | Documento del problema con variables, restricciones y modelo CSP definido. |
| H-03 | Diseño de la arquitectura del sistema | Diagrama de arquitectura, contrato de API REST, modelo de datos. |
| H-04 | Implementación del módulo de gestión | CRUD funcional de estudiantes, docentes, cursos y aulas con pruebas de integración. |
| H-05 | Implementación del motor de generación de horarios | Motor CSP genera horario docente válido en ≤ 30 segundos para el escenario base. |
| H-06 | Desarrollo de la interfaz de usuario | SPA funcional integrada con la API; validación en tiempo real operativa. |
| H-07 | Integración completa del sistema | Todos los módulos integrados y funcionales end-to-end. |
| H-08 | Pruebas del sistema | Cobertura ≥ 70% en módulos críticos; cero defectos críticos abiertos. |
| H-09 | Presentación final y demostración | Demostración con caso representativo; documentación técnica entregada. |

---

### 7. Presupuesto Resumido

El proyecto es de carácter académico. No se asigna presupuesto monetario formal.

| Recurso | Tipo | Descripción |
|:---|:---|:---|
| Tiempo de desarrollo | Humano | Dedicación parcial de 5 integrantes durante el período académico. |
| Equipos de cómputo | Hardware | Equipos personales de los integrantes del equipo. |
| Herramientas de desarrollo | Software | Herramientas de software libre o licencias educativas (IDEs, frameworks, base de datos). |
| Servicios de hosting (opcional) | Infraestructura | Servidores de desarrollo/demo: gratuitos o con plan educativo. |

---

### 8. Principales Interesados (Stakeholders)

| Stakeholder | Tipo | Interés Principal |
|:---|:---|:---|
| Estudiantes universitarios | Usuario final | Obtener un horario válido, sin solapamientos y compatible con sus prerrequisitos. |
| Docentes | Usuario final | Visualizar su horario asignado según disponibilidad registrada. |
| Coordinadores académicos | Usuario operador | Supervisar, ajustar y confirmar la planificación de horarios. |
| Administradores del sistema | Usuario técnico | Gestionar entidades, usuarios y configuración del período académico. |
| Equipo de desarrollo | Ejecutor | Entregar el PMV dentro del plazo académico con calidad demostrable. |
| Institución educativa / Docente evaluador | Patrocinador académico | Validar que el sistema resuelve el problema planteado y cumple los entregables. |

---

### 9. Requisitos de Aprobación del Proyecto

El proyecto será considerado finalizado cuando se verifiquen **todas** las siguientes condiciones:

1. El sistema genera horarios docentes válidos (cero solapamientos) en ≤ 30 segundos para el escenario base del PMV.
2. El 100% de los RF-01 a RF-18 han sido implementados y verificados mediante prueba de aceptación.
3. El sistema es demostrable con un caso real o simulado ante el docente evaluador.
4. Se ha entregado la documentación técnica completa: análisis del problema, modelo CSP, arquitectura, decisiones de diseño, especificación de API y reporte de pruebas.
5. Se ha presentado un video demostrativo del sistema funcional.
6. La cobertura de pruebas en módulos críticos es ≥ 70%, verificable mediante reporte de herramienta de testing.

---

### 10. Gerente del Proyecto

**Nombre:** Tapia De La Cruz Jhann Pier

**Responsabilidades:**
- Coordinar las actividades del equipo de desarrollo.
- Gestionar el cronograma del proyecto y el seguimiento de hitos.
- Supervisar el cumplimiento de los objetivos por sprint.
- Coordinar la integración de los módulos del sistema.
- Gestionar riesgos y escalar decisiones que excedan la capacidad del equipo.

---

### 11. Patrocinador del Proyecto

**Nombre:** Daniel Gamarra Moreno

**Responsabilidades:**
- Supervisar el avance del proyecto por sprint.
- Evaluar los entregables según los criterios de éxito definidos.
- Aprobar la finalización del proyecto.
- Brindar orientación académica y técnica al equipo.

---

### 12. Autorización del Proyecto

| Rol | Nombre | Firma | Fecha |
|:---|:---|:---|:---|
| Gerente de Proyecto | Tapia De La Cruz Jhann Pier | _________________ | 24/03/2026 |
| Patrocinador Académico | Daniel Gamarra Moreno | _________________ | 24/03/2026 |