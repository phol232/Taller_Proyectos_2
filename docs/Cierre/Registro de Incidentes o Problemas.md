# Registro de Incidentes o Problemas (Issue Log)

## Proyecto

**Planner UC – Sistema de Generación Óptima de Horarios Académicos**

---

# 1. Objetivo

El presente registro documenta los incidentes y problemas reales ocurridos durante el desarrollo de Planner UC. Cada incidencia fue registrada, priorizada, asignada a un responsable y monitoreada hasta su resolución o seguimiento, permitiendo mantener el control del proyecto y minimizar su impacto sobre el cronograma y la calidad del producto.

---

# 2. Criterios de Priorización

Las incidencias fueron clasificadas de acuerdo con el impacto generado sobre el proyecto:

* **Alta:** impide continuar con el desarrollo o afecta funcionalidades críticas.
* **Media:** afecta parcialmente el desarrollo o requiere correcciones importantes.
* **Baja:** inconvenientes menores sin impacto significativo en el cronograma.

---

# 3. Registro de Incidentes

| ID  | Fecha      | Incidente / Problema                                                                                         | Prioridad | Responsable        | Estado         | Acción Correctiva                                                                                                            | Resultado                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------ | --------- | ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| I01 | 14/04/2026 | Configuración inicial de autenticación JWT presentó errores durante la integración entre frontend y backend. | Alta      | Backend Developer  | Cerrado        | Se revisó la configuración de Spring Security y la generación de tokens JWT.                                                 | Autenticación funcionando correctamente.                    |
| I02 | 17/04/2026 | Dificultades en la implementación de protección CSRF para la SPA durante el Sprint 1.                        | Media     | Backend Developer  | Cerrado        | Se ajustó la configuración de seguridad utilizando autenticación basada en JWT y políticas apropiadas para aplicaciones SPA. | Seguridad implementada correctamente.                       |
| I03 | 20/04/2026 | Un integrante del equipo dejó el proyecto, afectando la distribución inicial de responsabilidades.           | Alta      | Project Manager    | Cerrado        | Se reorganizaron los roles del equipo y el Líder de Desarrollo asumió las responsabilidades del Backend.                     | El cronograma pudo mantenerse sin afectar los entregables.  |
| I04 | 24/04/2026 | Inconsistencias en las validaciones CRUD de estudiantes, docentes, cursos y aulas durante el Sprint 2.       | Media     | Backend Developer  | Cerrado        | Se corrigieron las validaciones y se incorporaron pruebas unitarias e integración para los módulos CRUD.                     | Validaciones funcionando correctamente.                     |
| I05 | 30/04/2026 | Tiempo de respuesta elevado durante las primeras pruebas del motor CSP.                                      | Alta      | Backend Developer  | Cerrado        | Se optimizaron consultas PostgreSQL y se aplicaron heurísticas al algoritmo CSP.                                             | Se redujo significativamente el tiempo de procesamiento.    |
| I06 | 05/05/2026 | Conflictos detectados durante pruebas de concurrencia al reservar recursos académicos.                       | Alta      | Backend Developer  | Cerrado        | Se implementó control transaccional y bloqueo de operaciones concurrentes.                                                   | Se eliminaron inconsistencias en la asignación de recursos. |
| I07 | 09/05/2026 | Errores de configuración de variables de entorno entre desarrollo y producción.                              | Media     | Project Manager    | Cerrado        | Se unificó la configuración mediante Docker Compose y archivos de entorno controlados.                                       | Despliegues consistentes entre ambientes.                   |
| I08 | 14/05/2026 | Ajustes requeridos en la integración del solver CSP con la API REST.                                         | Media     | Backend Developer  | En seguimiento | Se continúa refinando la integración y optimizando la comunicación entre FastAPI y Spring Boot.                              | Continúa en desarrollo como parte del Sprint 4.             |
| I09 | 18/05/2026 | La exportación de horarios en PDF y Excel aún no ha sido implementada (HU20).                                | Baja      | Frontend Developer | Abierto        | La funcionalidad fue planificada para la etapa final del Sprint 4.                                                           | Pendiente de implementación.                                |
| I10 | 18/05/2026 | Las pruebas finales del sistema y preparación de la demostración (HU21) aún se encuentran pendientes.        | Media     | QA Tester          | Abierto        | La ejecución de pruebas finales se realizará al concluir las funcionalidades restantes del Sprint 4.                         | Pendiente de ejecución.                                     |

---

# 4. Resumen del Estado de Incidentes

| Estado         | Cantidad |
| -------------- | -------: |
| Cerrados       |        7 |
| En seguimiento |        1 |
| Abiertos       |        2 |

---

# 5. Acciones Correctivas Implementadas

Durante el proyecto se aplicaron diversas acciones correctivas para mantener el control del desarrollo:

* Reorganización del equipo tras la salida de un integrante.
* Corrección de configuraciones de autenticación y seguridad.
* Implementación de pruebas unitarias e integración para validar funcionalidades.
* Optimización del rendimiento del motor CSP y consultas PostgreSQL.
* Implementación de control transaccional para evitar conflictos por concurrencia.
* Estandarización del entorno de despliegue mediante Docker.

---

# 6. Conclusiones

El seguimiento continuo de incidentes permitió resolver oportunamente los principales problemas surgidos durante el desarrollo del proyecto. La mayoría de las incidencias fueron corregidas antes de afectar el cronograma general.

Actualmente, los únicos incidentes abiertos corresponden a funcionalidades planificadas para la fase final del Sprint 4 (HU20 y HU21), mientras que la integración final del motor CSP continúa bajo seguimiento debido a su importancia dentro del núcleo funcional del sistema.
