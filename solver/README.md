# Solver Microservice — Planner UC

CSP-based academic schedule generator (Phase 1: institutional teaching schedule, Phase 2: student personal schedules). Implementation of the design specified in `Prompt_Microservicio_Solver.md`.

## Stack
- Python 3.11+
- FastAPI
- psycopg3 (raw SQL against PostgreSQL functions / tables)
- Pure-Python CSP backtracking solver (no external CP-SAT dependency)

## Layout
```
solver/
  app/
    api/                 # REST endpoints
    core/                # config, logging, db pool
    domain/              # plain dataclasses for the solver's mental model
    infrastructure/      # SolverInputLoader, persistence writers
    services/            # solver orchestration + components
      orchestrator.py
      demand_projector.py
      teacher_solver.py
      student_solver.py
      travel_time.py
      vacancy_tracker.py
      corequisite_grouper.py
      shift_filter.py
      constraint_validator.py
      conflict_reporter.py
    main.py              # FastAPI entrypoint
  tests/
  Dockerfile
  requirements.txt
```

## Run locally
```bash
cd solver
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export SOLVER_DB_DSN="postgresql://<USER>:<PASSWORD>@localhost:5432/horarios_db"
uvicorn app.main:app --reload --port 8090
```

## Endpoints
- `POST /api/solver/run` — body `{ "academic_period_id": uuid, "run_type": "TEACHER" | "STUDENT", "student_id"?: uuid, "time_limit_ms"?: int }`
- `GET  /api/solver/runs/{id}` — fetch run status + conflicts
- `GET  /healthz`

The microservice writes directly to `teaching_schedules`, `course_schedule_assignments`, `course_assignment_slots`, `student_schedules`, `student_schedule_items`, `solver_runs`, `solver_run_conflicts`.
