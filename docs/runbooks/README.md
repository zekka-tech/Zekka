# Zekka Alert Runbooks

Triage guides for Prometheus alerts defined in `prometheus/alerts.yml`.
Each anchor below matches the `runbook_url` on its alert.

## Conventions

1. **Acknowledge** in Alertmanager within 5 min of page.
2. **Confirm** the signal is real (check Grafana `api-latency` + `error-rate` boards).
3. **Mitigate** per section.
4. **Record** timeline in the incident channel; post-mortem if user-visible > 15 min.

---

## HighErrorRate

5xx rate > 5% for 5 min.

- Check Sentry for a new exception spike; identify top error.
- Check `kubectl logs` on `zekka-app` pods for stack traces.
- If the spike correlates with a deploy: roll back via `kubectl rollout undo deployment/zekka-app`.
- If external dependency (OpenAI, Anthropic): verify status pages, engage circuit breaker if not already open.

## HighResponseTime

p95 > 500 ms for 5 min.

- Inspect the slow-query dashboard — is a new query hot?
- Check Redis cache hit rate; if low, see **LowCacheHitRate**.
- `kubectl top pods` — scale HPA manually if CPU-bound.

## ApplicationDown

`up{job="zekka-app"} == 0` for 1 min.

- Verify pod status: `kubectl get pods -l app=zekka-app`.
- Check readiness probes; if crash loop, pull logs before restart.
- If all replicas down: escalate to infra on-call; roll back the last deploy.

## HighFailedLoginRate

> 10 failed logins/s for 3 min.

- Check Grafana `security` board for source IP clustering.
- If single IP: add to WAF denylist.
- If distributed (credential stuffing): enable stricter rate limit in `src/middleware/rateLimit.js` and notify security team.

## BruteForceAttack

Account lockouts > 5/s for 2 min. **Critical — page security.**

- Confirm in audit log (`SELECT ... FROM audit_log WHERE action='account_locked'`).
- Temporarily tighten `authLimiter` window.
- Verify MFA enrollment status for affected accounts.

## SuspiciousActivity

Suspicious-event rate > 5/s for 5 min.

- Pull recent entries from `src/utils/security-monitor.js` log stream.
- Correlate with `audit_suspicious_events_total` label dimensions (user, action).

## DatabaseDown

`up{job="postgres-exporter"} == 0` for 1 min. **Critical.**

- Check PG pod: `kubectl get pods -l app=postgres`.
- Check `/readyz` on app — should report DB down.
- Failover to replica if configured; otherwise restore from last backup (see `docs/backup-restore-runbook.md`).

## HighDatabaseConnections

Connections > 80% of max for 5 min.

- Identify connection hogs: `SELECT pid, state, query FROM pg_stat_activity ORDER BY query_start`.
- Look for connection leaks in app logs; recent deploy may have introduced an unreleased pool handle.
- Scale up `max_connections` only as a stopgap.

## SlowQueries

Average query time > 1s for 5 min.

- `pg_stat_statements` top queries by `mean_exec_time`.
- Check for missing index on recently-added column.
- Analyze `EXPLAIN ANALYZE` on the offender.

## DatabaseDiskSpaceLow

`/var/lib/postgresql` < 10% free. **Critical.**

- Check WAL accumulation: `SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')`.
- Vacuum any bloated tables.
- Expand PVC if legitimately full.

## RedisDown

Redis `up == 0` for 1 min. **Critical.**

- Check pod, network policy, persistence volume.
- App degrades to DB-only session store (`src/app.js` MemoryStore fallback is test-only — prod needs Redis).
- Restart; validate AUTH + TLS.

## LowCacheHitRate

Hit rate < 70% for 10 min.

- Check whether cache keys changed in a recent deploy (new schema versions invalidate everything).
- Evaluate TTL — too short?
- Prewarm if specific endpoint (e.g., analytics) regressed.

## HighCacheMemoryUsage

Redis memory > 90% of max for 5 min.

- Check `maxmemory-policy` — must be `allkeys-lru` or similar eviction.
- Look for a new key pattern with no expiry.
- Scale Redis memory if legitimately growing.

## HighCPUUsage

Node CPU > 80% for 5 min.

- Correlate with pod-level CPU (`kubectl top pods`).
- If a specific pod: profile with `clinic flame` on a staging replica.
- Consider increasing HPA target or scaling node pool.

## HighMemoryUsage

Node memory > 85% for 5 min.

- `kubectl top pods --sort-by=memory` — identify leaker.
- Heap snapshot via `/debug/heap` (if enabled) on the hot pod.
- Restart the pod as an immediate mitigation while you investigate.

## DiskSpaceLow

Any non-tmpfs mount < 10% free. **Critical.**

- Find offenders: `du -x -sh /* | sort -h` on the node.
- Rotate logs if logrotate stalled.
- Clean orphaned Docker images / PVC snapshots.

## HighRateLimitHitRate

Rate-limit exceedances > 50/s for 5 min.

- Check which route in `rate_limit_exceeded_total` labels.
- Legitimate traffic spike: raise limit temporarily.
- Abuse: identify source and block at WAF.

## CircuitBreakerOpen

Any circuit breaker open > 2 min.

- Identify the `service` label — which downstream?
- Verify that downstream is actually unhealthy (don't blame the breaker).
- When the downstream recovers, the breaker half-opens automatically; do not force-close unless absolutely needed.
