# Informe Final de Lecciones Aprendidas

## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Datos Generales

| Campo | Valor |
|:---|:---|
| **Nombre del proyecto** | Planner UC – Sistema de Generación Óptima de Horarios Académicos |
| **Curso** | Taller de Proyectos 2 – Ingeniería de Sistemas e Informática |
| **Gerente de Proyecto** | Tapia De La Cruz Jhann Pier |
| **Patrocinador académico** | Daniel Gamarra Moreno |
| **Período de ejecución** | 1 de abril – 24 de junio de 2026 |
| **Fecha del informe** | 25 de junio de 2026 |

---

### 2. Propósito

Este informe compila la información de las retrospectivas y sesiones de lecciones aprendidas realizadas al cierre de cada uno de los cuatro sprints del proyecto. Su finalidad es **identificar qué salió bien para que otros equipos lo adopten** y **qué no funcionó para evitarlo en el futuro**, dejando un registro accionable que sirva como activo de conocimiento para próximos proyectos.

---

### 3. Metodología

Al cierre de cada sprint se realizó una **retrospectiva** de 60 minutos con el equipo completo, bajo el formato:

- **¿Qué salió bien?** (mantener)
- **¿Qué no funcionó?** (evitar / corregir)
- **¿Qué acciones de mejora adoptamos para el siguiente sprint?**

Las conclusiones se contrastaron con las métricas de calidad (SonarQube, cobertura, WCAG, SUS), el registro de impedimentos y el historial del repositorio.

---

### 4. Lo que Salió Bien (Adoptar)

| Categoría | Lección | Por qué funcionó |
|:---|:---|:---|
| **Arquitectura** | Desacoplar el sistema en tres componentes independientes (Frontend, Backend, Solver) con contratos REST claros. | Permitió desarrollo en paralelo sin bloqueos y aisló la carga de cómputo del solver. |
| **Gestión del riesgo técnico** | Iniciar el motor CSP solo con restricciones *hard* (H1, H2) e incorporar las *soft* de forma incremental. | Redujo el riesgo crítico R-01; se obtuvo un solver funcional desde temprano. |
| **Definición temprana de contratos** | Documentar el contrato de API REST (Swagger) antes del desarrollo paralelo. | Evitó por completo el riesgo R-07 de inconsistencias frontend–backend. |
| **Control de versiones** | Estrategia de ramas `main`/`develop`/`feature/*` con pull requests revisados por un par. | Cero pérdidas de trabajo (riesgo R-08 no se materializó). |
| **Aseguramiento de calidad** | Integrar SonarQube, axe-core, Lighthouse y SUS como práctica formal. | Permitió detectar y resolver una vulnerabilidad BLOCKER y elevar la accesibilidad de forma medible. |
| **Rendimiento** | Heurística MRV en el solver y caché de lectura con invalidación por escritura. | El solver cumplió el objetivo de ≤ 30 s; mejoró la latencia de las consultas. |
| **Usabilidad** | Validación en tiempo real y mensajes de conflicto descriptivos. | Resultado SUS promedio de 80/100 ("Bueno–Excelente"). |

---

### 5. Lo que No Funcionó (Evitar / Corregir)

| Categoría | Lección | Recomendación para futuros equipos |
|:---|:---|:---|
| **Pruebas** | Las pruebas se concentraron al final del proyecto; la cobertura inicial quedó baja, pero se cerró la deuda antes del cierre documental (frontend 70.05 %, backend 73.1 %, solver 78 %). | Escribir pruebas como parte de cada historia de usuario desde el Sprint 1, no al final (riesgo R-10). |
| **Seguridad** | Una credencial de base de datos quedó hardcodeada en el solver (hallazgo BLOCKER). | Externalizar credenciales con variables de entorno desde el primer commit y escanear secretos en el pipeline. |
| **Accesibilidad** | Las consideraciones WCAG se atendieron tarde: 34/35 rutas presentaban violaciones al primer escaneo. | Incorporar reglas de accesibilidad en los componentes base y validar con axe-core de forma continua. |
| **Estimación de esfuerzo** | El esfuerzo real (610 h de equipo) duplicó lo presupuestado (230 h). | Calibrar las estimaciones con la dedicación diaria real (2.5 h/día hábil) desde la planificación inicial. |
| **Despliegue** | Configuraciones de red de despliegue (overlay vs. bridge) generaron reversiones. | Validar la topología de despliegue en un entorno de staging antes de producción. |
| **Integración continua** | El pipeline de CI presentó fallos intermitentes (test flaky, env del solver). | Aislar dependencias de los tests y eliminar la aleatoriedad (seeds fijos) para evitar tests inestables. |
| **Alcance** | La exportación de horarios y las notificaciones por correo no alcanzaron a entregarse. | Priorizar y reservar capacidad explícita para funciones de salida si forman parte del compromiso. |

---

### 6. Retrospectiva por Sprint

#### Sprint 1 — Cimientos (1 abr – 1 may 2026)
*Foco: autenticación, control de acceso y gestión de entidades (CRUD).*

| Qué salió bien | Qué no funcionó | Acción de mejora |
|:---|:---|:---|
| Autenticación JWT en cookies `httpOnly` y control de acceso por roles operativos desde el inicio. | Cobertura de pruebas muy baja al cierre; arranque más lento de lo previsto al montar el entorno. | Establecer la Definition of Done con pruebas obligatorias por historia. |
| Contrato de API documentado en Swagger antes del trabajo en paralelo. | Estimación inicial optimista frente a la disponibilidad real del equipo. | Planificar por capacidad real declarada en el sprint planning. |

#### Sprint 2 — Motor de Generación (2 may – 16 may 2026)
*Foco: disponibilidad docente y motor CSP (horario docente).*

| Qué salió bien | Qué no funcionó | Acción de mejora |
|:---|:---|:---|
| El solver generó horarios docentes válidos sin solapamientos dentro del límite de 30 s. | Detección de credencial hardcodeada en el solver (BLOCKER de seguridad). | Externalizar credenciales y añadir escaneo de secretos al CI. |
| Estrategia incremental (hard → soft) confirmada como acertada. | Sprint corto (10 días hábiles) presionó el alcance. | Ajustar el tamaño del backlog al número real de días hábiles. |

#### Sprint 3 — Validaciones y Robustez (17 may – 10 jun 2026)
*Foco: validaciones, concurrencia, ajuste/confirmación de horarios y caché.*

| Qué salió bien | Qué no funcionó | Acción de mejora |
|:---|:---|:---|
| Control de concurrencia (hold de cupo) y consistencia transaccional funcionando. | Reversiones en la configuración de red del despliegue. | Validar topología de despliegue en staging. |
| Caché de lectura en Redis con invalidación por escritura mejoró la latencia. | Tests inestables (flaky) en el pipeline. | Fijar seeds y aislar dependencias de los tests. |

#### Sprint 4 — Cierre y Calidad (11 jun – 24 jun 2026)
*Foco: horario del estudiante, visualización y aseguramiento de calidad.*

| Qué salió bien | Qué no funcionó | Acción de mejora |
|:---|:---|:---|
| Horario del estudiante con hold de cupo, visualización y suite de calidad (SonarQube, WCAG, SUS) ejecutada. | No alcanzó el tiempo para exportación (RF-17) ni notificaciones por correo. | Reservar capacidad para funciones de salida en el backlog. |
| Cobertura elevada considerablemente (frontend 7.3 %→70.05 %; backend 28 %→73.1 %; solver ~78 %). | El esfuerzo de QA se concentró al final. | Distribuir el aseguramiento de calidad a lo largo de todos los sprints. |

---

### 7. Lecciones Aprendidas Consolidadas

| # | Lección clave | Tipo | Recomendación |
|:---:|:---|:---:|:---|
| 1 | La calidad (pruebas, seguridad, accesibilidad) debe ser continua, no un esfuerzo de cierre. | A evitar | Integrarla en la Definition of Done desde el Sprint 1. |
| 2 | El desacoplamiento arquitectónico con contratos claros habilita el paralelismo sin fricción. | A adoptar | Definir contratos REST antes de implementar en paralelo. |
| 3 | El enfoque incremental en problemas complejos (CSP hard → soft) reduce el riesgo técnico. | A adoptar | Comenzar con el núcleo mínimo y crecer por iteraciones. |
| 4 | Las estimaciones deben anclarse a la dedicación diaria real del equipo. | A evitar | Calcular capacidad = integrantes × horas/día × días hábiles. |
| 5 | Los secretos nunca deben vivir en el código. | A evitar | Variables de entorno + escaneo automático de secretos. |
| 6 | Reservar capacidad explícita para las funcionalidades comprometidas de menor prioridad. | A evitar | Proteger en el backlog las funciones de salida (exportación, notificaciones). |

---

### 8. Recomendaciones para Futuros Equipos

1. **Calidad desde el día uno:** adoptar pruebas, escaneo de seguridad y validación de accesibilidad como parte de cada historia, no como una fase final.
2. **Contratos antes que código:** acordar y documentar las interfaces (API REST) antes de desarrollar en paralelo.
3. **Iterar lo complejo:** abordar los componentes de mayor riesgo (como el motor CSP) con un modelo mínimo y crecer incrementalmente.
4. **Estimar con datos reales:** dimensionar cada sprint según los días hábiles y la dedicación diaria efectiva del equipo.
5. **Proteger el alcance comprometido:** reservar capacidad para las funciones que, aun siendo de menor prioridad, forman parte del compromiso (exportación y notificaciones quedaron pendientes por falta de capacidad reservada).
6. **Documentar para no depender de personas:** mantener las decisiones técnicas en el repositorio para mitigar el riesgo de rotación.

---

*Documento elaborado por el equipo Planner UC — Taller de Proyectos 2.*
