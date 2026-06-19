# Anexo D - Evaluación de Usabilidad con SUS

## D.1 Objetivo

Aplicar el System Usability Scale (SUS) para evaluar la percepción de usabilidad de Planner UC por parte de usuarios finales (estudiantes y administradores académicos).

## D.2 Instrumento SUS

El SUS consta de 10 ítems con escala Likert de 1 a 5, donde:
- **1 = Totalmente en desacuerdo**
- **5 = Totalmente de acuerdo**

### Cuestionario

| # | Ítem | Tipo |
|---|---|---|
| 1 | Creo que me gustaría usar este sistema con frecuencia. | Positivo |
| 2 | Encontré el sistema innecesariamente complejo. | Negativo |
| 3 | Pensé que el sistema era fácil de usar. | Positivo |
| 4 | Creo que necesitaría el apoyo de un experto para usar este sistema. | Negativo |
| 5 | Encontré las diversas funciones de este sistema bien integradas. | Positivo |
| 6 | Pensé que había demasiada inconsistencia en este sistema. | Negativo |
| 7 | Imagino que la mayoría de las personas aprenderían a usar este sistema rápidamente. | Positivo |
| 8 | Encontré el sistema muy torpe de usar. | Negativo |
| 9 | Me sentí muy confiado usando el sistema. | Positivo |
| 10 | Necesitaba aprender muchas cosas antes de poder usar este sistema. | Negativo |

## D.3 Perfil de participantes

| ID | Rol | Edad | Experiencia TI |
|---|---|---|---|
| P01 | Estudiante | 21 | Media |
| P02 | Estudiante | 22 | Alta |
| P03 | Administrador académico | 35 | Media |
| P04 | Estudiante | 20 | Baja |
| P05 | Docente | 40 | Baja |

*(Ejemplo ilustrativo; reemplazar con datos reales de la aplicación del instrumento.)*

## D.4 Cálculo del puntaje SUS

### Fórmula

Para cada participante:
- **Ítems positivos (1, 3, 5, 7, 9):** puntaje contribuido = respuesta - 1
- **Ítems negativos (2, 4, 6, 8, 10):** puntaje contribuido = 5 - respuesta

**Puntaje SUS = Σ puntajes contribuidos × 2.5**

El resultado varía entre **0 y 100**.

### Ejemplo de cálculo para un participante

| Ítem | Respuesta | Tipo | Contribución |
|---|---|---|---|
| 1 | 4 | Positivo | 4 - 1 = 3 |
| 2 | 2 | Negativo | 5 - 2 = 3 |
| 3 | 5 | Positivo | 5 - 1 = 4 |
| 4 | 1 | Negativo | 5 - 1 = 4 |
| 5 | 4 | Positivo | 4 - 1 = 3 |
| 6 | 2 | Negativo | 5 - 2 = 3 |
| 7 | 5 | Positivo | 5 - 1 = 4 |
| 8 | 1 | Negativo | 5 - 1 = 4 |
| 9 | 4 | Positivo | 4 - 1 = 3 |
| 10 | 1 | Negativo | 5 - 1 = 4 |
| **Suma** | | | **35** |
| **SUS** | | | **35 × 2.5 = 87.5** |

## D.5 Interpretación del puntaje

| Rango SUS | Adjetivo | Aceptabilidad | Percentil aproximado |
|---|---|---|---|
| 0 - 25 | Inaceptable | No aceptable | < 5% |
| 25 - 50 | Pobre | Marginal | 5% - 30% |
| 50 - 70 | Regular | Aceptable | 30% - 70% |
| 70 - 85 | Bueno | Aceptable | 70% - 90% |
| 85 - 100 | Excelente | Aceptable | > 90% |

## D.6 Resultados consolidados (ejemplo)

| Participante | Puntaje SUS | Interpretación |
|---|---|---|
| P01 | 82.5 | Bueno |
| P02 | 90.0 | Excelente |
| P03 | 75.0 | Bueno |
| P04 | 67.5 | Regular |
| P05 | 72.5 | Bueno |
| **Promedio** | **77.5** | **Bueno / Aceptable** |

## D.7 Análisis crítico

### Nivel de aceptabilidad
Con un puntaje promedio de **77.5**, el sistema se encuentra en el rango **aceptable/bueno**, superior al umbral mínimo recomendado de 68 puntos.

### Percepción de facilidad de uso
- Los participantes con alta experiencia TI reportaron puntuaciones más altas.
- Los usuarios con baja experiencia señalaron curva de aprendizaje inicial en el constructor de horarios.

### Oportunidades de mejora
1. Simplificar el flujo de primera visita y registro.
2. Mejorar mensajes de ayuda contextual en el constructor de horarios.
3. Proporcionar tutoriales o tooltips para usuarios nuevos.

## D.8 Evidencias obligatorias

- [ ] Formulario SUS aplicado (anexo físico/digital)
- [ ] Base de resultados en CSV: [`sus_resultados.csv`](sus_resultados.csv)
- [ ] Cálculo del puntaje por participante
- [ ] Interpretación técnica
- [ ] Propuesta de mejoras derivadas

## D.9 Archivo de datos

La plantilla y datos de ejemplo están en [`sus_resultados.csv`](sus_resultados.csv).
