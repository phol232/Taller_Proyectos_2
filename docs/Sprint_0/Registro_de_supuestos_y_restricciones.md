# Registro de Supuestos y Restricciones
## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Visión General del Proyecto

Planner UC es un sistema web con motor CSP para la generación automática de horarios académicos en universidades con currículo flexible. El presente documento registra los supuestos y restricciones que delimitan el comportamiento esperado del proyecto y del sistema, constituyendo la base para la toma de decisiones durante el desarrollo.

Cada supuesto y restricción incluye su condición de verificación, de modo que pueda evaluarse objetivamente si la premisa se cumple o si es necesario aplicar un plan de contingencia.

---

## PARTE I: REGISTRO DE SUPUESTOS

### S-01 – Disponibilidad de información académica base suficiente

**Enunciado:** Se asume que la institución dispone, o podrá disponer, de información estructurada y completa sobre cursos, docentes, estudiantes, aulas, franjas horarias y reglas académicas antes de ejecutar el primer ciclo de generación de horarios.

**Justificación:** El motor CSP requiere que todas las variables y dominios estén completamente definidos antes de iniciar la búsqueda de soluciones. Sin datos de entrada válidos, el sistema no puede producir resultados consistentes.

**Condición de verificación:** Los módulos CRUD de las 4 entidades base (estudiantes, docentes, cursos, aulas) contienen al menos los datos del escenario representativo del PMV (≤ 50 estudiantes, ≤ 20 docentes, ≤ 30 cursos, ≤ 20 aulas) antes de habilitar la función de generación.

**Plan de contingencia:** Si los datos reales no están disponibles, se utilizarán datos sintéticos representativos generados por el equipo de desarrollo para las pruebas del PMV.

---

### S-02 – Simplificación controlada del problema en las primeras iteraciones

**Enunciado:** Se asume que el sistema trabajará en las primeras iteraciones con una representación simplificada del contexto real, considerando únicamente las variables y restricciones de mayor impacto sobre la validez del horario.

**Justificación:** El espacio de soluciones del problema CSP crece exponencialmente con el número de variables y restricciones. Un modelo acotado permite construir una primera solución funcional y ampliar progresivamente su cobertura.

**Condición de verificación:** El backlog del Sprint 1 incluye únicamente restricciones hard (solapamiento, disponibilidad docente, disponibilidad de aulas, prerrequisitos). Las restricciones soft (equidad de carga, preferencias horarias) están en el backlog de iteraciones posteriores.

**Plan de contingencia:** Si la simplificación produce horarios cuya calidad no es aceptable para la demostración, se priorizan las soft constraints de mayor impacto en el sprint siguiente.

---

### S-03 – Priorización de restricciones según su criticidad

**Enunciado:** Se asume que el sistema distinguirá entre restricciones obligatorias (hard constraints, cuyo incumplimiento invalida el horario) y restricciones deseables (soft constraints, cuya satisfacción mejora la calidad pero no es obligatoria para la validez).

**Justificación:** Tratar todas las restricciones con igual prioridad incrementa innecesariamente la complejidad del algoritmo y puede hacer inviable encontrar soluciones para el escenario base dentro del límite de tiempo de 30 segundos.

**Condición de verificación:** El documento de modelado del CSP clasifica explícitamente cada restricción como hard o soft, y el motor de generación garantiza el 100% de cumplimiento de las hard constraints antes de evaluar las soft constraints.

**Plan de contingencia:** Si la distinción hard/soft no es suficiente para alcanzar el tiempo límite, se aplican heurísticas de ordenamiento de variables (ej. MRV - Minimum Remaining Values) y propagación de restricciones (ej. AC-3).

---

### S-04 – Generación de horarios válidos antes que plenamente óptimos

**Enunciado:** Se asume que la primera versión del sistema estará orientada a producir horarios factibles (que cumplen todas las restricciones hard), sin garantizar optimización global en todos los casos.

**Justificación:** Obtener la solución óptima global para un CSP NP-difícil puede requerir tiempo de cómputo impracticable para el alcance del PMV. La prioridad es la validez y consistencia del horario generado.

**Condición de verificación:** El sistema produce al menos una solución válida (cero violaciones de restricciones hard) para el escenario base del PMV en ≤ 30 segundos. La ausencia de optimización global queda documentada como limitación conocida.

**Plan de contingencia:** Si no se encuentra ninguna solución válida en 30 segundos, el sistema notifica al usuario e indica qué restricciones impiden la generación, permitiendo al coordinador ajustar los datos de entrada.

---

### S-05 – Aceptación de primera versión centrada en funcionalidad esencial

**Enunciado:** Se asume que los usuarios del sistema valorarán una primera versión que resuelva el problema central de planificación (registro de entidades, validación de restricciones, generación de horarios sin conflictos), aunque no cubra todas las particularidades del entorno universitario.

**Justificación:** Una estrategia de desarrollo incremental requiere que el PMV aporte valor directo al problema principal. Las funcionalidades adicionales se incorporan en iteraciones posteriores.

**Condición de verificación:** El PMV es demostrable ante el docente evaluador con los RF-01 a RF-18 implementados, y los stakeholders validan que el sistema resuelve el caso base satisfactoriamente.

---

### S-06 – Coordinación continua del equipo durante el desarrollo

**Enunciado:** Se asume que los integrantes del proyecto podrán organizarse de forma colaborativa, distribuir tareas, comunicar avances y resolver bloqueos de forma periódica mediante los rituales de Scrum definidos.

**Justificación:** La construcción iterativa del sistema requiere articulación constante entre análisis, diseño, implementación, pruebas y documentación. Los bloqueos no comunicados en más de 24 horas aumentan el riesgo de retrasos en el sprint.

**Condición de verificación:** El equipo realiza daily stand-ups de lunes a viernes (≤ 15 minutos). Los bloqueos se reportan en el mismo día en que se identifican.

---

### S-07 – Suficiencia de la solución web para el alcance inicial

**Enunciado:** Se asume que una aplicación web (SPA + API REST) es suficiente para cubrir las necesidades del PMV en cuanto a gestión de información académica, generación de horarios y visualización de resultados.

**Justificación:** El sistema está orientado a gestionar información institucional y presentar resultados a distintos actores universitarios. Una solución web ofrece accesibilidad, centralización y facilidad de mantenimiento sin requerir desarrollo de aplicaciones nativas en el alcance del PMV.

**Condición de verificación:** El sistema opera correctamente en Chrome, Firefox y Edge (versiones actuales) sin requerir instalación de software adicional en el cliente.

---

### S-08 – Validación inicial mediante escenarios representativos

**Enunciado:** Se asume que las pruebas del PMV se realizarán con conjuntos de datos acotados pero representativos: hasta 50 estudiantes, 20 docentes, 30 cursos y 20 aulas.

**Justificación:** La validez del sistema no depende del volumen total de datos, sino de su capacidad para responder correctamente ante casos típicos y restricciones relevantes del dominio.

**Condición de verificación:** El escenario de prueba base está documentado y disponible en el repositorio del proyecto. Los resultados de las pruebas de aceptación usan este escenario.

---

### S-09 – Gestión de cambios sin alterar la finalidad del proyecto

**Enunciado:** Se asume que los ajustes en reglas, prioridades o decisiones funcionales que surjan durante el desarrollo podrán incorporarse de forma controlada sin afectar el propósito central del sistema.

**Justificación:** En proyectos ágiles, los cambios son parte del proceso. Sin embargo, los cambios de alcance no gestionados pueden comprometer la entrega del PMV.

**Condición de verificación:** Todo cambio de alcance es registrado en el backlog, evaluado en la reunión de revisión del sprint y aprobado por el Gerente de Proyecto antes de su implementación.

---

### S-10 – El sistema como herramienta de apoyo, no de reemplazo

**Enunciado:** Se asume que la solución sirve como apoyo a la toma de decisiones académicas, complementando —no reemplazando— el criterio institucional de coordinadores y administradores.

**Justificación:** La planificación de horarios involucra criterios organizacionales que el sistema no puede capturar completamente. El sistema mejora la eficiencia del proceso, pero la validación final queda a cargo del coordinador académico.

**Condición de verificación:** El flujo de confirmación del horario docente (RF-11) requiere la acción explícita del coordinador para confirmar la asignación generada automáticamente.

---

## PARTE II: REGISTRO DE RESTRICCIONES

### R-01 – Cumplimiento obligatorio de restricciones hard del dominio universitario

**Enunciado:** El sistema debe respetar las siguientes condiciones como restricciones hard (su violación invalida el horario): sin solapamiento de docente, sin solapamiento de aula, sin solapamiento de estudiante, cumplimiento de prerrequisitos y respeto de límites de créditos.

**Impacto de incumplimiento:** Un horario que viole cualquier restricción hard carece de validez académica y operativa, haciendo al sistema inútil para su propósito.

**Criterio de verificación:** El 100% de los horarios generados pasan la validación de restricciones hard definidas. Verificable mediante prueba automatizada de detección de solapamientos.

---

### R-02 – Tiempo limitado para el desarrollo del proyecto

**Enunciado:** El sistema debe ser diseñado, implementado, probado y documentado dentro del período académico del curso Taller de Proyectos 2.

**Impacto de incumplimiento:** El incumplimiento del plazo implica la no entrega del proyecto académico, con consecuencias directas en la evaluación del curso.

**Criterio de verificación:** Todos los hitos del cronograma (H-01 a H-09) se cumplen dentro de las fechas establecidas en el sprint planning.

---

### R-03 – Alcance limitado a un Producto Mínimo Viable

**Enunciado:** La solución se concentra en las funcionalidades RF-01 a RF-18. Funcionalidades fuera del alcance del PMV (integración con sistemas externos, app móvil, multi-sede) no serán implementadas en este período.

**Impacto de incumplimiento:** La expansión no controlada del alcance compromete la entrega dentro del plazo y la calidad del producto final.

**Criterio de verificación:** El backlog del producto distingue explícitamente entre ítems del PMV y ítems fuera del alcance. Los ítems fuera del alcance no se planifican en ningún sprint.

---

### R-04 – Capacidad computacional moderada

**Enunciado:** La generación de horarios debe ejecutarse en infraestructura de cómputo estándar (equipos de desarrollo del equipo o servidor básico) sin requerir procesamiento intensivo especializado.

**Impacto de incumplimiento:** Un algoritmo que requiera recursos intensivos no será ejecutable en el entorno académico disponible.

**Criterio de verificación:** El motor de generación produce resultados para el escenario base en ≤ 30 segundos en los equipos de desarrollo del equipo, sin optimizaciones de hardware especiales.

---

### R-05 – Disponibilidad parcial de los integrantes del equipo

**Enunciado:** El tiempo de desarrollo efectivo está condicionado por las responsabilidades académicas y personales de cada integrante. La dedicación no es uniforme ni exclusiva.

**Impacto de incumplimiento:** No reconocer esta restricción genera estimaciones irreales y riesgo de retrasos en el cronograma.

**Criterio de verificación:** La planificación de cada sprint tiene en cuenta la disponibilidad real declarada por cada integrante. Las tareas se dimensionan en consecuencia.

---

### R-06 – Dependencia de la calidad de los datos de entrada

**Enunciado:** La validez de los horarios generados depende directamente de la completitud, consistencia y actualización de los datos registrados en el sistema.

**Impacto de incumplimiento:** Datos incompletos o inconsistentes producen horarios inválidos o la imposibilidad de generar una solución.

**Criterio de verificación:** El módulo de gestión implementa validaciones de integridad referencial antes de permitir la ejecución del motor de generación.

---

### R-07 – Necesidad de equidad en la asignación de recursos

**Enunciado:** La solución debe procurar una distribución razonablemente equilibrada de carga horaria entre docentes, dentro de los límites de lo técnicamente alcanzable en el PMV.

**Impacto de incumplimiento:** Una distribución sistemáticamente desigual reduce la aceptación institucional del sistema, aunque los horarios sean técnicamente válidos.

**Criterio de verificación:** La equidad de carga horaria docente es implementada como soft constraint en el motor CSP. Su evaluación forma parte de los criterios de calidad de la solución generada, documentados en el modelo CSP.

---

### R-08 – Requerimientos de seguridad y protección de datos

**Enunciado:** El sistema debe implementar autenticación segura (JWT con expiración o sesiones), almacenamiento de contraseñas con hash seguro, control de acceso por roles y protección contra vulnerabilidades del OWASP Top 10 aplicables al alcance del PMV.

**Impacto de incumplimiento:** El acceso no autorizado a datos académicos compromete la integridad del sistema y puede tener consecuencias legales o institucionales.

**Criterio de verificación:** Las pruebas de seguridad verifican que: accesos sin autenticación retornan HTTP 401, accesos fuera de rol retornan HTTP 403, y las contraseñas se almacenan con hash (bcrypt o equivalente) verificable en la base de datos.

---

### R-09 – Trazabilidad y control del trabajo

**Enunciado:** Todo el desarrollo debe mantenerse organizado, documentado y versionado en GitHub. Los cambios se realizan mediante pull requests revisadas por al menos un integrante.

**Impacto de incumplimiento:** Sin control de versiones y documentación, aumentan los riesgos de pérdida de trabajo, inconsistencias y dificultades de integración.

**Criterio de verificación:** El repositorio GitHub del proyecto tiene actividad de commits en todos los sprints activos. Las decisiones técnicas relevantes están documentadas en el repositorio (ADR o equivalente).

---

### R-10 – Multiplicidad de actores con necesidades distintas

**Enunciado:** El sistema debe considerar las necesidades diferenciadas de cuatro roles: Estudiante, Docente, Coordinador Académico y Administrador, implementando vistas y funcionalidades específicas para cada uno.

**Impacto de incumplimiento:** Un sistema que no diferencia roles no puede ser adoptado institucionalmente, ya que expone funcionalidades y datos inadecuados a cada actor.

**Criterio de verificación:** El sistema implementa control de acceso por roles verificable: cada rol accede exclusivamente a las funcionalidades definidas en RF-18 y las pruebas de autorización confirman el rechazo de accesos no permitidos.