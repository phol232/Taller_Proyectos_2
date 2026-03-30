# Selección del Enfoque del Proyecto
## Planner UC – Sistema de Generación Óptima de Horarios Académicos

---

### 1. Visión General del Proyecto

**Planner UC** es un sistema web con motor CSP para la generación automática de horarios académicos en universidades con currículo flexible. El presente documento justifica la selección del enfoque de desarrollo, basándose en una evaluación cuantitativa de las características del proyecto y en los principios de gestión de proyectos de software.

---

### 2. Evaluación Cuantitativa del Proyecto

La siguiente tabla consolida las variables evaluadas y su puntuación en una escala de 1 (mínimo) a 5 (máximo), donde el valor 5 indica la condición que favorece el enfoque ágil.

| Variable | Valor (1-5) | Interpretación |
|:---|:---|:---|
| Innovación tecnológica | 3 | El problema CSP no es nuevo, pero su implementación en este contexto universitario específico requiere experimentación. |
| Inestabilidad del alcance | 5 | Los requisitos del motor CSP y las restricciones académicas evolucionan con cada iteración de validación. |
| Incertidumbre de requisitos | 5 | El modelo de solución (CSP/optimización) requiere refinamiento progresivo; no es completamente especificable al inicio. |
| Facilidad de cambio | 5 | El sistema debe adaptarse continuamente a nuevas restricciones y escenarios académicos. |
| Riesgo técnico | 5 | La implementación del motor CSP y los algoritmos de generación implican incertidumbre técnica alta. |
| Baja criticidad de fallas | 5 | El sistema es académico; las fallas no generan consecuencias graves, lo que permite iterar y corregir sin impacto crítico. |
| Participación activa de stakeholders | 5 | Estudiantes, docentes y coordinadores están disponibles para retroalimentación continua durante el desarrollo. |
| Posibilidad de entregas incrementales | 5 | El sistema es modular: registro de entidades → validación → generación → visualización. Cada módulo es entregable de forma independiente. |
| Seguridad y regulación | 4 | Se requiere protección básica de datos, pero no existen restricciones regulatorias estrictas que limiten la flexibilidad. |
| Disponibilidad de fondos | 4 | Proyecto académico sin presupuesto formal; los recursos son estables pero limitados. |
| Estructura organizacional | 5 | El equipo es pequeño (5 integrantes) y trabaja de forma colaborativa. |
| Cultura del equipo | 5 | El equipo está orientado a la mejora continua y acepta cambios como parte del proceso. |
| Experiencia y compromiso del equipo | 5 | El equipo cuenta con experiencia en desarrollo de software y está comprometido con la entrega. |

**Puntaje promedio:** 4.8 / 5 — Perfil consistente con enfoque ágil.

---

### 3. Análisis de Variables Clave

#### 3.1 Alta Inestabilidad del Alcance (5/5)

El modelo de restricciones del CSP no puede especificarse completamente al inicio del proyecto. Las reglas académicas (prerrequisitos, límites de créditos, criterios de equidad) se refinan a medida que el equipo valida soluciones con los stakeholders. Un enfoque predictivo (cascada) requeriría congelar estos requisitos desde el inicio, lo que produciría un modelo desalineado con las necesidades reales.

**Implicación para el desarrollo:** Los requisitos de alto nivel del motor CSP se refinan sprint a sprint, comenzando por las restricciones hard (no solapamiento, disponibilidad docente) y progresando hacia las soft constraints (equidad de carga, preferencias horarias).

#### 3.2 Alto Riesgo Técnico (5/5)

La implementación de algoritmos de generación automática de horarios (CSP NP-difícil) implica incertidumbre técnica significativa: selección de heurísticas de búsqueda, tiempos de convergencia, calidad de las soluciones generadas. No es posible estimar con precisión estos factores sin iteraciones de experimentación.

**Implicación para el desarrollo:** El Sprint dedicado al motor CSP incluye un spike técnico para validar la viabilidad del algoritmo seleccionado antes de comprometer la implementación completa.

#### 3.3 Baja Criticidad de Fallas (5/5)

El sistema es de naturaleza académica y de apoyo a la decisión. Las fallas no generan consecuencias irreversibles (no hay vidas en riesgo, ni transacciones financieras críticas). Esto permite iterar con rapidez, introducir cambios frecuentes y corregir errores sin impactos graves.

**Implicación para el desarrollo:** El equipo puede asumir riesgos técnicos calculados en cada sprint sin necesidad de procesos de validación excesivamente rigurosos en etapas tempranas.

#### 3.4 Participación Activa de Stakeholders (5/5)

Los usuarios finales (estudiantes, docentes, coordinadores) pueden participar en revisiones de sprint, validar funcionalidades y proporcionar retroalimentación continua. Esta disponibilidad es una condición habilitante para el enfoque ágil.

**Implicación para el desarrollo:** Cada revisión de sprint incluye una demostración de las funcionalidades completadas a los stakeholders relevantes, cuya retroalimentación alimenta el backlog del siguiente sprint.

#### 3.5 Entregas Incrementales (5/5)

La arquitectura modular del sistema permite dividir el desarrollo en módulos funcionales entregables de forma independiente: (1) gestión de entidades, (2) validación académica, (3) motor de generación de horarios, (4) interfaz de usuario y visualización. Cada módulo aporta valor independiente y puede validarse por separado.

**Implicación para el desarrollo:** El backlog del producto está organizado por módulos. Los sprints priorizan la entrega de funcionalidades completas y demostrables sobre la entrega de funcionalidades parciales de múltiples módulos.

---

### 4. Selección del Enfoque de Desarrollo

**Enfoque seleccionado: Ágil – Scrum**

Con un puntaje promedio de 4.8/5 y todas las variables clave orientadas hacia el enfoque ágil, se determina que **Scrum** es el marco de trabajo más adecuado para el desarrollo de Planner UC.

---

### 5. Justificación Técnica

#### 5.1 Adaptabilidad a Cambios

Scrum permite incorporar cambios de requisitos al backlog del producto entre sprints, sin detener el desarrollo. Para Planner UC, donde el modelo de restricciones CSP evoluciona con cada validación, esta adaptabilidad es crítica. **Métrica:** Los cambios de requisitos se incorporan al backlog en ≤ 1 día tras ser identificados en la revisión de sprint.

#### 5.2 Desarrollo Iterativo e Incremental

Los sprints cortos (1-2 semanas) permiten validar progresivamente el motor CSP y los algoritmos de generación. Cada sprint produce un incremento demostrable del sistema, lo que reduce el riesgo de descubrir problemas fundamentales al final del proyecto. **Métrica:** Cada sprint entrega al menos 1 funcionalidad completamente implementada, probada y demostrable (Definition of Done cumplida).

#### 5.3 Gestión del Riesgo Técnico

Las iteraciones continuas y las pruebas frecuentes permiten detectar tempranamente problemas en el motor CSP (tiempos de convergencia, calidad de soluciones, casos sin solución). Los spikes técnicos en sprints tempranos mitigan el riesgo de descubrir problemas irreversibles en etapas avanzadas. **Métrica:** Cada riesgo identificado en el registro de riesgos tiene un sprint propietario para su mitigación.

#### 5.4 Participación Continua de Stakeholders

Las revisiones de sprint formalizan la interacción con stakeholders, asegurando que el sistema evoluciona hacia las necesidades reales del usuario final. La retroalimentación se captura como ítems del backlog con prioridad asignada. **Métrica:** Cada revisión de sprint incluye validación con al menos 1 stakeholder externo al equipo.

#### 5.5 Entrega Continua de Valor

La división del sistema en módulos funcionales permite demostrar valor desde el Sprint 1 (gestión de entidades), incrementando progresivamente la complejidad hasta el motor CSP completo. Esto reduce el riesgo de entrega fallida total y aumenta la confianza del patrocinador académico. **Métrica:** Al término del 50% del período académico, el sistema debe tener al menos el módulo de gestión de entidades y validación académica completamente funcionales.

---

### 6. Estructura del Proceso Scrum Adoptado

| Elemento Scrum | Definición para Planner UC |
|:---|:---|
| **Product Owner** | Gerente de Proyecto (Tapia De La Cruz Jhann Pier) – prioriza el backlog según valor de negocio. |
| **Scrum Master** | Líder de Desarrollo (Taquiri Rojas Phol Edwin) – facilita el proceso y elimina impedimentos técnicos. |
| **Development Team** | Desarrollador Backend, Desarrollador Frontend, Tester (QA). |
| **Sprint Duration** | 1-2 semanas según el cronograma académico. |
| **Sprint Planning** | Al inicio de cada sprint: selección de ítems del backlog y estimación de esfuerzo. |
| **Daily Stand-up** | Lunes a viernes, ≤ 15 minutos. Formato: ¿Qué hice? ¿Qué haré? ¿Tengo bloqueos? |
| **Sprint Review** | Al cierre de cada sprint: demostración de incremento con stakeholders. |
| **Sprint Retrospective** | Al cierre de cada sprint: identificación de ≥ 2 mejoras accionables. |
| **Backlog Refinement** | Continuo, a demanda del equipo según necesidad. |

---

### 7. Conclusión

En función de la evaluación cuantitativa realizada (puntaje promedio 4.8/5) y las características específicas del problema — alta inestabilidad de requisitos, riesgo técnico significativo en el motor CSP, participación activa de stakeholders y posibilidad de entregas incrementales — se concluye que el **enfoque ágil con Scrum** es el más adecuado para el desarrollo de Planner UC.

Este enfoque permite abordar la complejidad técnica del problema de forma iterativa, gestionar el riesgo mediante spikes y validaciones tempranas, y asegurar la entrega de un sistema funcional y demostrable dentro del período académico establecido.

**Criterio de éxito del enfoque:** Al finalizar el proyecto, el sistema habrá sido desarrollado en sprints incrementales, con al menos 1 demostración funcional por sprint, retroalimentación de stakeholders incorporada al backlog, y cobertura de pruebas ≥ 70% en módulos críticos.