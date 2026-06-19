#!/usr/bin/env bash
# Ejecuta cobertura + análisis SonarQube de frontend, backend y solver.
#
# Requisitos:
#   - Docker Compose
#   - pnpm (frontend)
#   - Java 21 + Gradle wrapper (backend)
#   - Python 3.11+ con dependencias del solver instaladas
#   - SONAR_TOKEN exportado (http://localhost:9000 → My Account → Security)
#
# Uso:
#   export SONAR_TOKEN=tu_token
#   ./scripts/sonar-scan-all.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Carga automáticamente SONAR_TOKEN (y otras variables) desde .env si existe.
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "Error: define SONAR_TOKEN antes de ejecutar este script." >&2
  echo "  export SONAR_TOKEN=tu_token" >&2
  echo "  Genera el token en http://localhost:9000 → My Account → Security" >&2
  exit 1
fi

wait_for_sonarqube() {
  # NOTA: docker compose wait puede bloquearse en algunos entornos a pesar de que
  # el contenedor ya esté healthy, por lo que usamos polling directo vía curl.
  echo "Esperando a que SonarQube responda en http://localhost:9000 ..."
  for _ in $(seq 1 60); do
    if curl -sf http://localhost:9000/api/system/status | grep -q '"status":"UP"'; then
      echo "SonarQube listo."
      return 0
    fi
    sleep 5
  done

  echo "Error: SonarQube no quedó listo a tiempo." >&2
  exit 1
}

run_scanner() {
  local service="$1"
  echo ""
  echo "==> SonarQube: ${service}"
  docker compose --profile sonar run --rm "${service}"
}

echo "==> Levantando SonarQube..."
docker compose up -d sonarqube-db sonarqube
wait_for_sonarqube

echo ""
echo "==> Frontend: generando cobertura (Vitest)..."
(
  cd frontend
  pnpm test:coverage
)
run_scanner sonar-scanner-frontend

echo ""
echo "==> Backend: generando cobertura (JaCoCo)..."
(
  cd backend/horarios_api
  ./gradlew test jacocoTestReport --no-daemon
)
run_scanner sonar-scanner-backend

echo ""
echo "==> Solver: generando cobertura (pytest)..."
(
  cd solver
  if [[ -f .venv/bin/python ]]; then
    PYTHON=.venv/bin/python
  else
    PYTHON=python3
  fi
  "${PYTHON}" -m pytest tests/test_components.py tests/test_parallel.py -q
)
run_scanner sonar-scanner-solver

echo ""
echo "Análisis completado. Revisa los proyectos en http://localhost:9000:"
echo "  - planner-uc-frontend"
echo "  - planner-uc-backend"
echo "  - planner-uc-solver"
