# Legacy migrations (retired, kept for reference)

Migrations 001–007 were retired from the auto-run chain on 2026-07-19 and
replaced by `009_fresh_deployment_baseline.sql`.

## Why

They could never run as a chain, on any database:

- `002` fails after `001`: both define an `api_keys` table with different
  shapes, so 002's `CREATE TABLE IF NOT EXISTS` silently skips and its
  `CREATE INDEX ... ON api_keys(key_id)` errors on the missing column.
- `003`–`004` define a UUID-keyed `users`/`projects` lineage that conflicts
  with both 001's integer-keyed `users` and with the schema the application
  code actually queries (VARCHAR ids issued by the auth layer, e.g.
  `user_<timestamp>_<random>`).
- The orchestrator's tables (`projects` keyed by `project_id`, `tasks`) came
  from `init-db.sql`, colliding with the v1 API's `projects` by name; 009
  renames them to `orchestration_projects` / `orchestration_tasks`.

Because the chain never completed anywhere, no deployment's schema depends on
these files executing; real schemas came from `init-db.sql`,
`create-minimal-schema.sql`, or the runtime initializer. 009 reconciles all
of those lineages idempotently.

## Do not

- Re-add these files to `migrations/` — the runner would pick them up again.
- Use them as a reference for current table shapes; the source of truth is
  `009_fresh_deployment_baseline.sql` plus the code's own queries.
