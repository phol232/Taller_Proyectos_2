# Desarrollo Web Responsable y Reducción del Impacto Ambiental en Planner UC

## 1. Análisis del Impacto Ambiental del Software

### 1.1 Introducción

El desarrollo de software también genera impactos ambientales debido al consumo de recursos computacionales durante su construcción, despliegue y operación. Aunque estos impactos no son visibles de forma inmediata, el uso intensivo de procesadores, memoria, almacenamiento y redes incrementa el consumo energético de los servidores y dispositivos utilizados por los usuarios.

Planner UC es una aplicación web compuesta por un frontend desarrollado con Next.js, un backend desarrollado con Spring Boot, un motor CSP desarrollado con FastAPI y una base de datos PostgreSQL desplegados mediante contenedores Docker. Debido a la naturaleza computacionalmente intensiva del motor de generación de horarios, resulta importante identificar los principales impactos ambientales asociados a su funcionamiento.

---

## 1.2 Impactos Ambientales Identificados

### Impacto 1: Alto consumo de CPU durante la generación de horarios

El motor CSP explora múltiples combinaciones posibles de asignación de docentes, aulas y franjas horarias para encontrar soluciones válidas.

#### Justificación técnica

Los algoritmos de satisfacción de restricciones pueden requerir una gran cantidad de operaciones de búsqueda y validación, incrementando significativamente el uso del procesador.

#### Impacto ambiental

Un mayor uso de CPU implica un mayor consumo energético del servidor y, por tanto, una mayor huella de carbono asociada a la ejecución del sistema.

---

### Impacto 2: Consumo elevado de memoria durante la resolución del CSP

Durante la generación de horarios se almacenan estructuras de datos relacionadas con restricciones, recursos disponibles y soluciones parciales.

#### Justificación técnica

Mientras más compleja sea la búsqueda, mayor cantidad de memoria será utilizada para almacenar estados intermedios y cálculos auxiliares.

#### Impacto ambiental

El uso intensivo de memoria aumenta la demanda energética de los servidores y puede requerir infraestructura con mayores capacidades de hardware.

---

### Impacto 3: Consultas repetitivas a la base de datos

La gestión de estudiantes, docentes, cursos y aulas implica numerosas consultas a PostgreSQL.

#### Justificación técnica

Consultas ineficientes o repetidas generan más operaciones de lectura y escritura sobre disco y memoria.

#### Impacto ambiental

El incremento de operaciones sobre la base de datos aumenta el tiempo de procesamiento y el consumo energético asociado al almacenamiento.

---

### Impacto 4: Transferencia excesiva de datos al cliente

Las interfaces administrativas pueden manejar grandes volúmenes de información académica.

#### Justificación técnica

Enviar grandes cantidades de datos en cada solicitud incrementa el tráfico de red y el procesamiento tanto del servidor como del navegador.

#### Impacto ambiental

La transferencia innecesaria de datos incrementa el consumo energético de la infraestructura de red y de los dispositivos cliente.

---

### Impacto 5: Solicitudes HTTP redundantes

Las aplicaciones SPA suelen generar múltiples llamadas a la API para obtener información relacionada.

#### Justificación técnica

Solicitudes innecesarias aumentan la carga del backend y generan más procesamiento de datos.

#### Impacto ambiental

Cada solicitud implica consumo de CPU, memoria y recursos de red que podrían evitarse mediante estrategias de optimización.

---

### Impacto 6: Consumo energético asociado a contenedores Docker

Planner UC utiliza contenedores para desplegar los diferentes componentes del sistema.

#### Justificación técnica

Cada contenedor consume recursos de CPU, memoria y almacenamiento incluso cuando la carga del sistema es baja.

#### Impacto ambiental

La ejecución permanente de servicios incrementa el consumo energético del entorno de despliegue.

---

### Impacto 7: Procesamiento repetitivo dentro del solver CSP

Sin mecanismos de reutilización, el motor podría recalcular continuamente información ya conocida.

#### Justificación técnica

Repetir cálculos de disponibilidad, criticidad de aulas o evaluaciones de restricciones genera trabajo computacional redundante.

#### Impacto ambiental

El incremento innecesario del tiempo de ejecución produce un mayor consumo energético por cada generación de horarios.

---

## 1.3 Análisis Crítico

El principal impacto ambiental de Planner UC se encuentra en el motor CSP debido a que concentra la mayor parte del procesamiento computacional del sistema. Sin embargo, también existen impactos relevantes en la base de datos, la comunicación entre servicios y la transferencia de información hacia el cliente.

Por esta razón, las estrategias de sostenibilidad deben enfocarse tanto en optimizar el algoritmo de generación como en reducir el consumo de recursos asociados a consultas, comunicaciones y almacenamiento.

La adopción de buenas prácticas de desarrollo sostenible permite mejorar simultáneamente el rendimiento del sistema y disminuir el consumo energético necesario para operar la plataforma.

---

# 2. Identificación de Oportunidades de Mejora

## 2.1 Optimización de Consultas PostgreSQL

### Situación identificada

Algunas operaciones administrativas requieren consultar grandes volúmenes de información relacionada con estudiantes, docentes, cursos y aulas.

### Mejora propuesta

Optimizar consultas SQL mediante índices apropiados, reducción de consultas redundantes y análisis mediante EXPLAIN ANALYZE.

### Justificación

* Reduce tiempo de respuesta.
* Disminuye operaciones de lectura y escritura.
* Reduce carga sobre CPU y memoria del servidor.
* Disminuye consumo energético asociado al acceso a datos.

### Beneficio esperado

Menor tiempo de ejecución de consultas y reducción de recursos utilizados por PostgreSQL.

---

## 2.2 Implementación de Paginación

### Situación identificada

Las vistas administrativas pueden llegar a mostrar grandes cantidades de registros simultáneamente.

### Mejora propuesta

Incorporar paginación en los listados de estudiantes, docentes, cursos y aulas.

### Justificación

* Reduce el volumen de datos transferidos.
* Disminuye el uso de memoria en el navegador.
* Reduce el tiempo de renderizado de la interfaz.

### Beneficio esperado

Menor tráfico de red y menor consumo de recursos tanto en el servidor como en el cliente.

---

## 2.3 Reducción de Solicitudes HTTP

### Situación identificada

Algunas pantallas pueden requerir múltiples llamadas consecutivas a la API para obtener información relacionada.

### Mejora propuesta

Agrupar consultas relacionadas y reutilizar información previamente obtenida.

### Justificación

* Reduce la carga del backend.
* Disminuye el número de conexiones realizadas.
* Reduce el tráfico de red.

### Beneficio esperado

Mejor rendimiento general y menor consumo energético asociado a las comunicaciones.

---

## 2.4 Implementación de Caché de Recursos

### Situación identificada

Información consultada frecuentemente puede ser recalculada o recuperada repetidamente.

### Mejora propuesta

Utilizar mecanismos de caché para almacenar temporalmente resultados reutilizables.

### Justificación

Planner UC ya implementa caché para:

* Disponibilidad docente–aula.
* Criticidad de aulas.
* Resultados reutilizables del solver.

Esto evita consultas y cálculos repetitivos.

### Beneficio esperado

* Menor uso de CPU.
* Menor carga sobre PostgreSQL.
* Menor tiempo de generación de horarios.
* Menor consumo energético.

---

## 2.5 Optimizaciones Adicionales Implementadas en el Solver CSP

Además de las mejoras anteriores, el proyecto incorpora optimizaciones específicas en el motor CSP:

* Caché de disponibilidad docente-aula.
* Caché de criticidad de aulas.
* Reutilización de cálculos internos.
* Corte temprano de ejecuciones poco prometedoras.
* Paralelismo utilizando múltiples núcleos.
* Recálculo incremental.
* Mejora local de soluciones.

Estas optimizaciones reducen significativamente el tiempo de procesamiento necesario para generar horarios válidos, contribuyendo directamente a la sostenibilidad del sistema mediante una utilización más eficiente de los recursos computacionales.

---

## 2.6 Conclusión

La identificación de oportunidades de mejora permitió detectar componentes del sistema con potencial de optimización desde la perspectiva del rendimiento y la sostenibilidad. Las mejoras propuestas e implementadas buscan reducir el consumo de CPU, memoria, almacenamiento y red, contribuyendo tanto a la eficiencia operativa de Planner UC como a la reducción de su impacto ambiental.
