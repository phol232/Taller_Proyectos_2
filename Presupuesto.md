# Presupuesto del Proyecto — Planner UC

**Sistema de Generación Óptima de Horarios Académicos**

| Campo | Valor |
|---|---|
| Nombre del Proyecto | Planner UC – Sistema de Generación Óptima de Horarios |
| Gerente del Proyecto | Tapia De La Cruz Jhann Pier |
| Moneda | Dólares estadounidenses (USD) |
| Modalidad | Desarrollo académico |
| Duración estimada | 4 meses (abril – julio 2026) |
| Sprints planificados | 4 |

---

## 1. Análisis económico integral

El presente documento presenta el análisis económico integral del sistema **Planner UC**, orientado a la generación óptima de horarios académicos mediante un motor de optimización basado en programación por restricciones. El análisis comprende las **fuentes de costo** del proyecto, su **evolución a lo largo del tiempo**, la **distribución por Sprint**, el **costo acumulado** del proyecto y los **análisis esperados** sobre la relación entre la complejidad del problema y el costo del sistema, los factores que incrementan los costos y la evaluación de sostenibilidad bajo el enfoque *Green Software*.

---

## 2. Fuentes de costos

### 2.1. Recursos humanos

Los recursos humanos constituyen el principal componente del presupuesto. Se aplican dos tarifas diferenciadas según la naturaleza del rol:

- **Roles de gestión y soporte académico** (Gerente de Proyecto, Analista de Negocio, Arquitecto de Software, Ingeniero de Calidad): tarifa de **USD 5 por hora** bajo modalidad académica.
- **Roles técnicos de desarrollo** (Backend, Frontend, Solver): tarifa profesional de mercado de **USD 20 por hora**.

Las horas estimadas se ajustan al esfuerzo real del proyecto, considerando un equipo reducido y una duración total de cuatro meses. Se asume un promedio de 20 horas por cada rol académico o de gestión y 50 horas por cada rol técnico de desarrollo a lo largo de toda la duración del proyecto.

| Rol | Responsabilidad principal | Horas totales | Costo/hora (USD) | Subtotal (USD) |
|---|---|---:|---:|---:|
| Gerente de Proyecto | Planificación, control y gestión de riesgos | 20 | 5 | 100 |
| Analista de Negocio | Levantamiento de requerimientos y reglas académicas | 20 | 5 | 100 |
| Arquitecto de Software | Definición de la arquitectura del sistema | 20 | 5 | 100 |
| Ingeniero de Calidad | Diseño y ejecución de pruebas | 20 | 5 | 100 |
| Desarrollador Backend | Servicios de negocio y persistencia de datos | 50 | 20 | 1 000 |
| Desarrollador Frontend | Interfaz de usuario y experiencia del cliente | 50 | 20 | 1 000 |
| Ingeniero del Solver | Motor de optimización y validador de horarios | 50 | 20 | 1 000 |
| **Total Recursos Humanos** |  | **230** |  | **3 400** |

### 2.2. Infraestructura tecnológica

La infraestructura del sistema **Planner UC** se sustenta en una arquitectura distribuida que combina servicios de cómputo en la nube de **Amazon Web Services (AWS) Lightsail**, servicios de borde (*edge*) de **Cloudflare Pages** para el alojamiento de la interfaz web, y servicios complementarios para la gestión del dominio, los certificados de seguridad y la observabilidad del sistema. Esta combinación permite optimizar el costo total de propiedad, ofreciendo a la vez un rendimiento adecuado, una alta disponibilidad y una reducida latencia para los usuarios finales.

#### 2.2.1. Componentes de cómputo en la nube (AWS Lightsail)

Se utilizan dos instancias independientes de servidores virtuales administrados, cada una con un rol claramente delimitado:

| Instancia | Servicios alojados | Costo mensual (USD) |
|---|---|---:|
| **Instancia principal** | Servicio de aplicación (back-end), base de datos relacional y servicio de caché en memoria | 24 |
| **Instancia del motor de optimización** | Motor de generación óptima de horarios académicos | 12 |
| **Costo mensual total — AWS Lightsail** |  | **36** |

La separación en dos instancias obedece a una decisión arquitectónica orientada a aislar las cargas de cómputo intensivo propias del motor de optimización, asegurando de este modo la disponibilidad y los tiempos de respuesta del servicio principal incluso durante la ejecución de procesos exigentes.

#### 2.2.2. Alojamiento de la interfaz web (Cloudflare Pages)

La **interfaz web (front-end)** del sistema se despliega de manera independiente en **Cloudflare Pages**, una plataforma de alojamiento estático en la red global de borde de Cloudflare. Esta decisión arquitectónica aporta los siguientes beneficios:

- **Cero costo operativo** dentro de los límites del plan gratuito ofrecido por el proveedor.
- **Distribución global automática** de los activos de la interfaz a través de la red de centros de datos de Cloudflare, reduciendo significativamente la latencia percibida por los usuarios finales.
- **Alta disponibilidad** garantizada por la replicación automática del contenido en múltiples regiones.
- **Despliegues automatizados** vinculados al repositorio de código fuente, sin intervención manual.

| Servicio | Plan utilizado | Costo mensual (USD) |
|---|---|---:|
| Cloudflare Pages (alojamiento del front-end) | Plan gratuito | 0 |

#### 2.2.3. Dominio de Internet y servicios de gestión DNS

El **dominio de Internet** del sistema fue adquirido con anterioridad al inicio del proyecto, motivo por el cual no representa un costo adicional para la presente iniciativa. La gestión de los registros DNS se realiza a través de **Cloudflare DNS** bajo su plan gratuito, aprovechando funcionalidades adicionales tales como protección frente a denegación de servicio, almacenamiento en caché de borde y gestión simplificada de subdominios.

| Servicio | Modalidad | Costo mensual (USD) | Costo proyectado 4 meses (USD) |
|---|---|---:|---:|
| Dominio de Internet | Reutilizado (adquirido previamente) | 0 | 0 |
| Cloudflare DNS | Plan gratuito | 0 | 0 |
| Cloudflare CDN y protección perimetral | Plan gratuito | 0 | 0 |

#### 2.2.4. Certificados de seguridad

La comunicación entre los usuarios y el sistema se encuentra protegida mediante certificados de seguridad **TLS**, emitidos sin costo:

- En el front-end alojado en Cloudflare Pages, los certificados son provistos automáticamente por la plataforma.
- En el back-end alojado en AWS Lightsail, los certificados se obtienen mediante una autoridad certificadora reconocida bajo licencia gratuita, con procesos automatizados de emisión y renovación.

| Componente | Proveedor del certificado | Costo (USD) |
|---|---|---:|
| Certificado TLS — front-end | Cloudflare (gestión automática) | 0 |
| Certificado TLS — back-end | Autoridad certificadora reconocida | 0 |

#### 2.2.5. Servicios complementarios

| Servicio | Propósito | Modalidad | Costo (USD) |
|---|---|---|---:|
| Repositorio de código fuente | Gestión de versiones del código del sistema | Plan educativo / privado gratuito | 0 |
| Plataforma de integración continua | Compilación automatizada y ejecución de pruebas | Plan gratuito | 0 |
| Servicio de respaldo de la base de datos | Resguardo periódico de la información del sistema | Almacenamiento en la instancia principal | 0 |
| Monitoreo y registro de eventos | Observabilidad del sistema | Herramientas autoalojadas en la instancia principal | 0 |

#### 2.2.6. Resumen de costos de infraestructura (4 meses)

| Concepto | Costo unitario | Costo proyectado 4 meses (USD) |
|---|---|---:|
| Instancia principal AWS Lightsail (back-end, base de datos y caché) | 24 USD/mes | 96 |
| Instancia del motor de optimización AWS Lightsail | 12 USD/mes | 48 |
| Cloudflare Pages (alojamiento del front-end) | Plan gratuito | 0 |
| Cloudflare DNS, CDN y protección perimetral | Plan gratuito | 0 |
| Dominio de Internet | Reutilizado | 0 |
| Certificados de seguridad TLS (front-end y back-end) | Gratuitos | 0 |
| Repositorio de código y plataforma de integración continua | Planes gratuitos | 0 |
| Servicios de respaldo, monitoreo y registro de eventos | Autoalojados | 0 |
| **Total Infraestructura tecnológica** |  | **144** |

### 2.3. Costos indirectos

Comprenden los costos no atribuibles directamente a las actividades de desarrollo, pero necesarios para la correcta ejecución del proyecto.

| Concepto | Costo proyectado (USD) |
|---|---:|
| Material académico y bibliografía técnica | 10 |
| Imprevistos administrativos | 15 |
| Reserva de contingencia (≈ 10% sobre RR.HH. e infraestructura) | 354 |
| **Total Indirectos** | **379** |

### 2.4. Resumen consolidado de fuentes de costo

| Fuente | Monto (USD) | Participación |
|---|---:|---:|
| Recursos humanos | 3 400 | 86.7 % |
| Infraestructura tecnológica | 144 | 3.7 % |
| Costos indirectos (incluye contingencia) | 379 | 9.7 % |
| **Total general** | **3 923** | **100.0 %** |

---

## 3. Evolución de costos

### 3.1. Costos a lo largo del tiempo

La distribución de la inversión a lo largo del horizonte del proyecto considera la combinación del esfuerzo de los Sprints planificados y un costo fijo mensual de infraestructura de USD 36.

| Mes | Fase predominante | Costo del mes (USD) | Costo acumulado (USD) |
|---|---|---:|---:|
| Abril 2026 | Inicio del proyecto y Sprint 1 | 626 | 626 |
| Mayo 2026 | Sprint 2 | 1 026 | 1 652 |
| Junio 2026 | Sprint 3 | 866 | 2 518 |
| Julio 2026 | Sprint 4 y cierre del proyecto | 1 405 | 3 923 |
| **Total** |  | **3 923** |  |

### 3.2. Costos por Sprint

El detalle por Sprint se presenta a continuación, con el desglose de horas técnicas y horas de gestión y aseguramiento de la calidad asignadas a cada iteración.

| Sprint | Periodo | Foco principal | Horas técnicas | Horas gestión / QA | Costo (USD) | Participación |
|---|---|---|---:|---:|---:|---:|
| Sprint 1 | 13 abr – 26 abr 2026 | Seguridad y autenticación de usuarios | 22 | 15 | 515 | 13.1 % |
| Sprint 2 | 27 abr – 17 may 2026 | Gestión de entidades académicas y validaciones | 45 | 25 | 1 025 | 26.1 % |
| Sprint 3 | 18 may – 7 jun 2026 | Validaciones académicas y prototipo del motor de optimización | 38 | 20 | 860 | 21.9 % |
| Sprint 4 | 8 jun – 5 jul 2026 | Motor de optimización completo, vistas y reportes | 45 | 20 | 1 000 | 25.5 % |
| Reserva de contingencia |  |  | — | — | 354 | 9.0 % |
| Infraestructura e indirectos |  |  | — | — | 169 | 4.4 % |
| **Total** |  |  | **150** | **80** | **3 923** | **100.0 %** |

#### Distribución gráfica del costo por Sprint

```
Sprint 1  ███████              USD   515
Sprint 2  ████████████████     USD 1 025
Sprint 3  █████████████        USD   860
Sprint 4  ████████████████     USD 1 000
```

El Sprint 2 concentra la mayor inversión del proyecto (USD 1 025), correspondiente al modelado de datos y la implementación de la gestión de las entidades académicas. El Sprint 4 representa la segunda mayor inversión (USD 1 000) por la entrega del motor de optimización completo y los reportes finales.

### 3.3. Costo acumulado del proyecto

| Hito | Costo acumulado (USD) |
|---|---:|
| Cierre del Sprint 1 | 515 |
| Cierre del Sprint 2 | 1 540 |
| Cierre del Sprint 3 | 2 400 |
| Cierre del Sprint 4 | 3 400 |
| Infraestructura tecnológica acumulada | 3 544 |
| Costos indirectos y contingencia | 3 923 |

#### Curva de costo acumulado

```
USD 3 923 |                                              ●
USD 3 544 |                                       ●
USD 3 400 |                                ●
USD 2 400 |                       ●
USD 1 540 |              ●
USD   515 |       ●
          +---------------------------------------------
            S1     S2     S3     S4   Infra   Cierre
```

La curva acumulada presenta el patrón clásico tipo *S*: un arranque controlado durante el Sprint 1, una fase de aceleración a lo largo de los Sprints 2 a 4, y una estabilización al cierre del proyecto con la incorporación de los costos de infraestructura y la reserva de contingencia.

---

## 4. Análisis esperado

### 4.1. Relación entre la complejidad del problema y el costo del sistema

La generación de horarios académicos es un problema de optimización combinatoria de elevada complejidad computacional, formulable como un problema de satisfacción de restricciones con múltiples requisitos obligatorios (capacidad de aulas, prerrequisitos, créditos máximos, no solapamiento de franjas horarias y compatibilidad por componentes) y preferencias deseables (balance de carga docente y disponibilidad horaria). La complejidad inherente al problema impacta directamente en el costo del sistema en los siguientes aspectos:

1. **Modelado del dominio**: la definición del modelo conceptual (estudiantes, docentes, cursos, aulas, franjas horarias y períodos académicos) demandó el mayor esfuerzo del proyecto, concentrado en el Sprint 2 (USD 1 025). La precisión de este modelo determina la viabilidad del motor de optimización.
2. **Motor de optimización**: el desarrollo, ajuste y validación del motor concentran el esfuerzo de los Sprints 3 y 4. Cada nueva restricción incorporada al modelo amplía el espacio de búsqueda, incrementando los tiempos de cómputo y el costo de validación.
3. **Validación funcional**: las pruebas dirigidas a casos especiales (cursos electivos, orden de resolución y compatibilidad por componente) representan aproximadamente el 15 % del esfuerzo total. Cualquier nueva restricción puede invalidar pruebas previamente exitosas, generando retrabajo.
4. **Arquitectura de despliegue**: el aislamiento del motor de optimización en una instancia dedicada (USD 12 mensuales) constituye una decisión arquitectónica derivada directamente de la complejidad del problema, garantizando que el cómputo intensivo no afecte la disponibilidad del servicio principal.

**Conclusión**: existe una relación supralineal entre la complejidad del problema y el costo total del sistema. Esta relación fue controlada mediante la encapsulación de la complejidad en componentes especializados y la aplicación de una arquitectura modular en el servicio principal.

### 4.2. Identificación de factores de incremento de costos

Los siguientes factores fueron identificados como aceleradores potenciales del costo durante el ciclo de vida del proyecto, junto con las medidas de mitigación adoptadas para cada uno.

| Factor | Origen | Medida de mitigación |
|---|---|---|
| Cambios tardíos en el modelo de datos | Incorporación de nuevos atributos en las entidades académicas | Versionamiento de los cambios de la base de datos y pruebas de regresión |
| Restricciones nuevas en el motor de optimización | Inclusión de cursos electivos y compatibilidad por componente | Ejecución del motor con tiempos de cómputo acotados |
| Integración entre componentes heterogéneos | Coexistencia de tres tecnologías distintas | Definición temprana de contratos de integración y validación de datos |
| Concurrencia entre usuarios | Reserva, confirmación y liberación de cupos por múltiples estudiantes | Uso de mecanismos de bloqueo y gestión de concurrencia distribuida |
| Pruebas con datos representativos | Volúmenes académicos completos | Generación de conjuntos de datos sintéticos escalables |
| Cumplimiento de seguridad | Protección contra vulnerabilidades comunes | Aplicación de buenas prácticas de seguridad desde el primer Sprint |
| Deuda técnica | Acumulación progresiva en ausencia de refactorización | Refactorización continua y revisiones periódicas del código |
| Riesgos de cronograma | Dependencias entre Sprints | Reserva de contingencia equivalente al 10 % del costo directo |
| Costo recurrente de infraestructura | Operación continua de las instancias de cómputo | Selección de tamaños mínimos viables y reutilización del dominio existente |

### 4.3. Evaluación de sostenibilidad — Enfoque *Green Software*

El proyecto adopta los principios de la *Green Software Foundation* con el propósito de minimizar la huella ambiental del sistema, tanto durante su fase de desarrollo como durante su operación. La presente sección se sustenta en decisiones técnicas efectivamente implementadas en la arquitectura del sistema.

#### 4.3.1. Principios aplicados

La siguiente tabla relaciona cada principio del marco *Green Software* con su materialización en el sistema **Planner UC**.

| Principio | Aplicación en el sistema |
|---|---|
| Eficiencia de carbono | El motor de optimización se ejecuta bajo un límite de tiempo configurable definido por el administrador (10, 20 o 30 segundos), evitando el consumo de recursos más allá del óptimo práctico de la solución. |
| Eficiencia energética mediante caché | El sistema integra un servicio de caché en memoria (Redis) compartido entre el back-end y el motor de optimización. Los resultados intermedios del proceso de generación, las consultas frecuentes a la base de datos y los catálogos académicos se almacenan en caché, reduciendo el número de operaciones repetidas y, en consecuencia, el consumo energético global del sistema. |
| Acotamiento del consumo de cómputo | El servicio de aplicación principal opera bajo un límite máximo del 75 % de los recursos disponibles en su instancia, dejando un margen suficiente para la base de datos y el servicio de caché que coexisten en el mismo servidor virtual. Esta política previene la saturación del hardware y el consumo energético asociado a estados de sobrecarga. |
| Eficiencia de hardware | Las instancias de cómputo fueron dimensionadas en función de la carga real esperada, evitando el sobreaprovisionamiento de recursos. La separación entre la instancia principal y la instancia del motor de optimización permite que cada componente se ejecute en un entorno ajustado a su perfil de consumo. |
| Compromisos climáticos del proveedor | Los proveedores seleccionados para la infraestructura (Amazon Web Services y Cloudflare) mantienen compromisos públicos de neutralidad de carbono y de adopción progresiva de fuentes de energía renovable en sus centros de datos. |

#### 4.3.2. Rol del servicio de caché en la sostenibilidad

El uso del servicio de caché compartido (Redis) constituye uno de los aportes más relevantes a la eficiencia energética del sistema. Su función transversal abarca:

- **Caché del back-end**: las consultas recurrentes a la base de datos relacional (catálogos de cursos, docentes, aulas y períodos académicos) se almacenan temporalmente en memoria, evitando lecturas redundantes a disco y reduciendo el ciclo de procesamiento por solicitud.
- **Caché del motor de optimización**: los resultados intermedios del proceso de generación de horarios, así como las estructuras precomputadas (compatibilidades, disponibilidades y restricciones), se reutilizan entre ejecuciones cercanas en el tiempo, evitando recomputaciones costosas.
- **Caché compartido entre componentes**: al residir en una capa común, el servicio de caché evita la duplicación de información entre el back-end y el motor de optimización, optimizando el consumo de memoria y de red interna.

El efecto agregado de estas medidas se traduce en una reducción tangible de los ciclos de procesamiento totales del sistema y, por ende, en una menor demanda energética por unidad de trabajo útil entregado al usuario.

#### 4.3.3. Sostenibilidad económica

La sostenibilidad económica del sistema se sustenta en los siguientes elementos:

- **Costo operativo mensual**: USD 36, equivalente a USD 432 anuales, asumible para una unidad académica.
- **Costo marginal por ejecución**: prácticamente nulo, dada la naturaleza acotada del motor de optimización.
- **Mantenibilidad**: la arquitectura modular reduce el costo de modificaciones futuras.
- **Escalabilidad**: el costo crece de manera sublineal respecto al volumen de datos académicos.
- **Reutilización de componentes**: los módulos del sistema son reutilizables para otros programas o instituciones.
- **Reutilización de activos previos**: la reutilización del dominio reduce el costo total del proyecto.

---

## 5. Resumen ejecutivo

| Indicador | Valor |
|---|---:|
| Presupuesto total | USD 3 923 |
| Recursos humanos | USD 3 400 (86.7 %) |
| Infraestructura tecnológica | USD 144 (3.7 %) |
| Costos indirectos | USD 379 (9.7 %) |
| Reserva de contingencia | USD 354 (≈ 10 %) |
| Duración del proyecto | 4 meses |
| Sprints planificados | 4 |
| Sprint de mayor inversión | Sprint 2 (USD 1 025) |
| Componente de mayor costo | Recursos humanos |
| Costo operativo mensual | USD 36 |
| Estrategia de eficiencia energética | Servicio de caché compartido entre back-end y motor de optimización |
| Acotamiento de cómputo del back-end | Límite máximo del 75 % de los recursos de la instancia |
| Acotamiento de cómputo del motor | Límite de tiempo configurable por ejecución (10, 20 o 30 s) |

---

## 6. Conclusiones

1. El presupuesto total del proyecto **Planner UC** asciende a **USD 3 923**, dominado por el costo de los recursos humanos (86.7 %) bajo un esquema de tarifas mixtas que distingue entre roles académicos y de gestión (USD 5 por hora) y roles técnicos de desarrollo (USD 20 por hora).
2. La complejidad inherente al problema de generación de horarios académicos se traduce en una concentración del costo durante las fases de modelado de datos (Sprint 2) y de desarrollo del motor de optimización (Sprint 4). Esta relación fue controlada mediante la modularidad de la arquitectura.
3. La infraestructura de despliegue se sustenta en una arquitectura distribuida que combina dos instancias de **AWS Lightsail** (USD 36 mensuales en total) para el back-end, la base de datos y el motor de optimización, junto con el alojamiento de la interfaz web en **Cloudflare Pages** y los servicios de DNS, red de distribución de contenido y protección perimetral provistos por Cloudflare bajo planes gratuitos. La reutilización del dominio existente y la adopción de servicios sin costo contribuyeron significativamente a la reducción del costo total de la infraestructura.
4. Los principales factores de incremento de costos fueron identificados y mitigados mediante prácticas de ingeniería tales como el versionamiento de cambios, la definición temprana de contratos de integración, la gestión de la concurrencia y la refactorización continua.
5. El proyecto cumple con los principios del enfoque *Green Software* mediante decisiones técnicas concretas: el uso intensivo de un servicio de caché compartido entre el back-end y el motor de optimización para reducir el cómputo redundante, el acotamiento del consumo del servicio principal a un máximo del 75 % de los recursos de su instancia, la ejecución del motor de optimización bajo un límite de tiempo configurable, y la selección de proveedores de infraestructura con compromisos públicos de neutralidad de carbono.
6. La inversión total resulta sostenible desde las perspectivas económica, ambiental y técnica, dejando al proyecto preparado para futuras evoluciones del producto.

---

*Documento elaborado el 8 de mayo de 2026 — Planner UC, versión 1.0*
