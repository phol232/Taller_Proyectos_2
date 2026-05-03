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
