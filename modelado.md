# SPECS.md

# Descripción General del Proyecto

**Planner UC** es un sistema web para la generación automática de horarios académicos óptimos, diseñado para resolver conflictos derivados de múltiples restricciones académicas, operativas y contextuales.

El sistema utiliza un enfoque basado en **Constraint Satisfaction Problem (CSP)** mediante un microservicio especializado, garantizando la generación de horarios válidos y optimizados.

---

# Objetivos del Sistema

* Automatizar la generación de horarios académicos
* Eliminar conflictos entre docentes, aulas y estudiantes
* Optimizar la distribución del tiempo y recursos
* Proveer una arquitectura escalable y modular

---

# Arquitectura del Sistema

El sistema está compuesto por tres componentes principales:

* **Frontend**: Next.js (interfaz de usuario)
* **Backend**: Spring Boot (API REST y lógica de negocio)
* **Servicio CSP**: FastAPI (motor de generación de horarios)

---

# Modelado del Problema (CSP)

## Variables

* **C (Cursos)**: Asignaturas disponibles en un periodo académico
* **D (Docentes)**: Profesores disponibles
* **E (Estudiantes)**: Usuarios matriculados
* **A (Aulas)**: Espacios físicos o virtuales disponibles
* **H (Franjas horarias)**: Bloques de tiempo semanales

---

## Restricciones Hard (Obligatorias)

R1: Un docente no puede ser asignado a más de un curso en el mismo horario
R2: Un aula no puede ser utilizada por más de un curso simultáneamente
R3: Un estudiante no puede tener cursos superpuestos
R4: Se deben cumplir los prerrequisitos de los cursos
R5: Se debe respetar el límite de créditos (20–22 por periodo)
R6: Se debe respetar la disponibilidad del docente
R7: No se debe exceder la capacidad del aula

---

## Restricciones Soft (Optimización)

O1: Minimizar los espacios vacíos en los horarios
O2: Distribuir la carga académica de forma equilibrada durante la semana
O3: Balancear la carga de trabajo entre docentes
O4: Evitar horarios extremos (muy temprano o muy tarde)

---

# Requerimientos Funcionales

## Coordinador Académico

Como coordinador académico, el sistema debe permitir:

* Generar horarios académicos automáticamente
* Validar horarios según las restricciones definidas
* Aprobar o ajustar horarios generados

---
# Casos de Uso y Criterios de Validación (Spec-Driven Development)

## Caso de Uso 1: Generar horario académico

**Descripción:**
El sistema genera automáticamente un horario académico a partir de los datos disponibles (cursos, docentes, aulas, estudiantes y franjas horarias).

**Entrada:**

* Lista de cursos
* Disponibilidad de docentes
* Aulas disponibles
* Franjas horarias

**Salida:**

* Horario académico generado

**Criterios de validación:**

* No existen conflictos de docentes (R1)
* No existen conflictos de aulas (R2)
* No existen conflictos de estudiantes (R3)
* Se respetan prerrequisitos (R4)
* Se respetan límites de créditos (R5)
* Se respeta disponibilidad docente (R6)
* Se respeta la capacidad de aulas (R7)
* El sistema detecta si no existe solución válida

---

## Caso de Uso 2: Validar horario académico

**Descripción:**
El sistema permite validar un horario generado manualmente o automáticamente.

**Entrada:**

* Horario académico

**Salida:**

* Resultado de validación (válido / inválido)

**Criterios de validación:**

* Identificación de conflictos de docentes
* Identificación de conflictos de aulas
* Identificación de conflictos de estudiantes
* Verificación de cumplimiento de todas las restricciones (R1–R7)

---

## Caso de Uso 3: Gestionar datos académicos

**Descripción:**
Permite registrar y administrar cursos, docentes, estudiantes y aulas.

**Entrada:**

* Datos de entidades (CRUD)

**Salida:**

* Datos actualizados en el sistema

**Criterios de validación:**

* Los datos ingresados son válidos
* No existen duplicidades
* Las relaciones entre entidades son consistentes

---

# Enfoque Conceptual (Google Antigravity)

El desarrollo del sistema adopta un enfoque de análisis previo basado en el principio de "Google Antigravity", el cual implica evaluar el problema desde múltiples perspectivas antes de su implementación.

Se consideran los siguientes aspectos:

* Identificación de conflictos entre docentes, aulas y estudiantes
* Evaluación de escenarios con alta carga académica
* Análisis de disponibilidad limitada de recursos
* Consideración de casos donde no existe solución válida
* Validación de restricciones antes de ejecutar el algoritmo

Este enfoque permite definir criterios de validación más precisos y asegurar la consistencia del sistema.

---

## Administrador

Como administrador, el sistema debe permitir:

* Gestionar estudiantes, docentes, cursos y aulas
* Configurar parámetros del sistema (disponibilidad, límites, etc.)
* Supervisar el funcionamiento del sistema

---

## Docente

Como docente, el sistema debe permitir:

* Visualizar su horario asignado
* Verificar que no existan conflictos

---

## Estudiante

Como estudiante, el sistema debe permitir:

* Seleccionar cursos
* Visualizar su horario
* Evitar conflictos en su planificación

---

# Funcionalidades del Sistema

| Funcionalidad                 | Estado    |
| ----------------------------- | --------- |
| Generación de horarios (CSP)  | Requerido |
| Validación de restricciones   | Requerido |
| Gestión de estudiantes (CRUD) | Requerido |
| Gestión de docentes (CRUD)    | Requerido |
| Gestión de cursos (CRUD)      | Requerido |
| Gestión de aulas (CRUD)       | Requerido |
| Visualización de horarios     | Requerido |
| Ajuste manual con validación  | Requerido |
| Exportación (PDF/Excel)       | Opcional  |

---

# Especificación de API

## Backend (Spring Boot)

POST /api/schedules/generate
→ Genera un horario utilizando el servicio CSP

POST /api/schedules/validate
→ Valida un horario ingresado manualmente

GET /api/schedules/{id}
→ Obtiene un horario generado

GET /api/courses
GET /api/teachers
GET /api/classrooms

---

## Servicio CSP (FastAPI)

POST /generate
→ Recibe datos y devuelve un horario válido

POST /validate
→ Verifica restricciones sobre un horario

---

# 🗄 Modelo de Datos

Entidades principales:

* Estudiantes
* Docentes
* Cursos
* Aulas
* Horarios
* Franjas Horarias

---

# 📊 Requisitos No Funcionales

## Rendimiento

* Generación de horarios generales: ≤ 30 segundos
* Generación de horarios individuales: ≤ 5 segundos
* Validaciones en tiempo real: ≤ 1 segundo

---

## Escalabilidad

El sistema debe soportar como mínimo:

* 50 estudiantes
* 20 docentes
* 30 cursos
* 20 aulas

---

## Confiabilidad

* No se deben generar horarios inválidos
* El sistema debe prevenir violaciones de restricciones

---

## Seguridad

* Autenticación mediante JWT
* Control de acceso por roles
* Validación de entradas en todos los endpoints

---

## Mantenibilidad

* Arquitectura modular basada en microservicios
* Separación clara de responsabilidades
* Código documentado y legible

---

# Requisitos de Interfaz (UI)

El sistema debe incluir:

* Dashboard de gestión
* Visualización de horarios en formato de grilla
* Formularios para gestión de entidades
* Validación en tiempo real

---

# Criterios de Aceptación

El sistema se considera completo cuando:

* Todas las restricciones obligatorias (R1–R7) se cumplen
* No existen conflictos en los horarios generados
* Todas las funcionalidades requeridas están operativas
* Todas las pruebas han sido superadas
* Los endpoints de la API funcionan correctamente
* La generación de horarios produce resultados consistentes

---

# Estrategia de Pruebas (TDD)

* Cada restricción debe tener al menos un caso de prueba
* Pruebas unitarias para:

  * Validación de restricciones
  * Lógica del algoritmo CSP
* Pruebas de integración para:

  * Comunicación Backend ↔ CSP
* Validación completa del flujo de generación

---

# Mejoras Futuras

* Implementación de algoritmos avanzados de optimización
* Soporte para múltiples instituciones
* Recomendaciones basadas en inteligencia artificial
* Planificación colaborativa en tiempo real

---
