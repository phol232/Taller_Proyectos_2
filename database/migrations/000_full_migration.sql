-- Migración global acumulativa del sprint 202605
-- Ejecuta las migraciones incrementales en orden.

\i migrations/202605_add_sections_nrc.sql
\i migrations/202605_expand_classroom_courses_for_sections.sql
\i migrations/202605_rebalance_solver_classroom_authorizations.sql
\i migrations/202605_rebalance_solver_classroom_authorizations_phase2.sql
\i migrations/202605_weekly_hours_int_to_numeric.sql
\i migrations/202605_sync_course_weekly_hours_contract.sql
\i migrations/202605_solver_master_blocks.sql
\i migrations/202605_schedule_generation_options.sql

\i migrations/202605_solver_classroom_component_quality.sql
\i migrations/202605_solver_elective_course_rules.sql
\i migrations/202605_academic_period_is_active.sql

-- ── Sprint 202605/202606 — horarios estudiante y builder ─────
\i migrations/202605_student_schedule_view.sql
\i migrations/202606_seat_holds.sql
\i migrations/202606_seat_holds_functions.sql
\i migrations/202607_student_schedule_builder.sql
\i migrations/202608_fix_builder_hold_reimport.sql
\i migrations/202609_fix_builder_get_draft_components.sql
\i migrations/202610_fix_builder_open_option_in_place.sql
