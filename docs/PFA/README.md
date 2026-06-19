# Entregables PFA - Aseguramiento de Calidad Integral

**Proyecto:** Planner UC  
**Curso:** Taller de Proyectos 2 - Ingeniería de Sistemas e Informática  
**Fecha:** 2026-06-18  

Este directorio contiene los entregables técnicos del Proyecto de Fin de Asignatura (PFA) orientados al aseguramiento integral de calidad de la aplicación Web Full Stack.

## Estructura de entregables

| Archivo | Contenido | Actividad del PFA |
|---|---|---|
| [`Informe_Tecnico_Integral.md`](Informe_Tecnico_Integral.md) | Resumen ejecutivo, hallazgos críticos, métricas consolidadas y plan de mejoras | Informe técnico integral |
| [`Anexo_A_SonarQube.md`](Anexo_A_SonarQube.md) | Configuración, métricas por capa, interpretación técnica y evidencias de reducción de deuda técnica | 6.1 Evaluación de calidad de código |
| [`Anexo_B_OWASP.md`](Anexo_B_OWASP.md) | Auditoría de seguridad alineada a OWASP Top 10 2025, matriz de vulnerabilidades y mitigaciones | 6.2 Evaluación de seguridad |
| [`Anexo_C_WCAG.md`](Anexo_C_WCAG.md) | Evaluación de accesibilidad, checklist WCAG y evidencias de corrección | 6.3 Evaluación de accesibilidad |
| [`Anexo_D_SUS.md`](Anexo_D_SUS.md) | Instrumento SUS, base de resultados, cálculo e interpretación | 6.4 Evaluación de usabilidad |
| [`Anexo_E_Testing_Automatizado.md`](Anexo_E_Testing_Automatizado.md) | Inventario de pruebas unitarias, integración, E2E y cobertura | 6.5 Testing y validación automatizada |
| [`metricas_sonarqube.csv`](metricas_sonarqube.csv) | Métricas de SonarQube en formato CSV | Evidencia técnica |

## Cómo reproducir el análisis de SonarQube

Desde la raíz del repositorio, con Docker Compose disponible y el token en `.env`:

```bash
./scripts/sonar-scan-all.sh
```

El script:
1. Levanta SonarQube (`http://localhost:9000`).
2. Genera cobertura de pruebas para frontend, backend y solver.
3. Ejecuta los scanners oficiales de SonarQube.
4. Publica los resultados en los proyectos:
   - `planner-uc-frontend`
   - `planner-uc-backend`
   - `planner-uc-solver`

## Acceso a dashboards en vivo

- SonarQube UI: http://localhost:9000
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- Swagger UI: http://localhost:8080/swagger-ui.html
