# Auditoría de Optimizaciones — Solver CSP (Planner UC)

Optimizaciones implementadas en el solver de horarios.

---

## 🗄️ Caché

- [x] **Caché de disponibilidad** docente × aula en Redis — persistente entre generaciones del mismo período.
- [x] **Caché de criticidad de aulas** (aulas con un solo uso posible por componente).
- [x] **Invalidación automática**: si cambian los datos, la caché se regenera sola.
- [x] **Tiempo de vida configurable** (24h por defecto) para controlar el uso de memoria.
- [x] **Funciona sin Redis**: si la caché no está disponible, el solver sigue operando igual.
- [x] **Cálculos reutilizados dentro de cada generación** (aulas elegibles, bloques horarios, etc.) — se calculan una sola vez.

## 🔍 Calidad de la solución

- [x] **Mejora local del horario** tras la construcción inicial (reubica clases, aulas y docentes para reducir huecos y conflictos).
- [x] **Selección inteligente de mejoras**: prioriza los ajustes que más resultados dan.
- [x] **Escape de soluciones estancadas** mediante reordenamientos puntuales.
- [x] **Recálculo incremental**: solo recalcula lo que cambió, no todo el horario.

## ⏱️ Gestión del tiempo

- [x] **Múltiples intentos** desde distintos puntos de partida, quedándose con el mejor.
- [x] **Corte temprano** cuando dos intentos dan resultados similares (no malgasta tiempo).
- [x] **Reparto del presupuesto** entre construir el horario y mejorarlo.
- [x] **Descarte de intentos malos** y tiempos seleccionables (10/20/30s).

## ⚡ Paralelismo

- [x] **Varios intentos a la vez**, no uno tras otro: se ejecutan en paralelo y se elige el mejor.
- [x] **Uso de los 2 núcleos del servidor**: el segundo núcleo deja de estar ocioso durante la generación.
- [x] **Sin duplicar memoria**: los procesos comparten los datos de entrada.
- [x] **Caché compartida** entre los procesos en paralelo.
- [x] **Corte temprano entre tandas** si ya se llegó a un buen resultado.
- [x] **Métricas combinadas** de todos los intentos.

## 🎛️ Ajustable sin tocar código

- [x] Número de intentos en paralelo, tiempo por intento y profundidad de la mejora — todo configurable por variables de entorno (dial entre **velocidad** y **calidad**).

## 📊 Seguimiento

- [x] Métricas detalladas de cada generación (puntaje, duración, intentos, huecos, etc.).
- [x] Progreso en vivo durante la generación.

