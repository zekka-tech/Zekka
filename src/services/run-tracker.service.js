/**
 * Run Tracker Service
 *
 * Durable, resumable record of an agent loop run plus a live event stream.
 *
 * - `startRun` opens an `agent_runs` row (status = running).
 * - `recordEvent` appends an `agent_run_events` row and broadcasts it over
 *   Socket.IO to `run:<runId>` and `project:<projectId>` so the frontend run
 *   inspector sees each step as it happens.
 * - `completeRun` closes the run with a terminal status + totals.
 *
 * Socket.IO is resolved lazily via the websocket middleware and is optional,
 * so the tracker also works in headless / test contexts.
 *
 * @module services/run-tracker.service
 */

const { pool } = require('../config/database');
const logger = require('../utils/logger');

let getIO = () => null;
try {
  // Lazy, defensive require so unit tests that don't mock websocket still load.
  ({ getIO } = require('../middleware/websocket'));
} catch {
  /* websocket not available in this context */
}

class RunTrackerService {
  /**
   * Open a new run.
   * @returns {Promise<string>} runId (UUID)
   */
  async startRun({
    taskId = null,
    projectId = null,
    tenantId = null,
    agentKey = null,
    agentName = null,
    goal = null
  } = {}) {
    const result = await pool.query(
      `INSERT INTO agent_runs
         (task_id, project_id, tenant_id, agent_key, agent_name, goal, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'running')
       RETURNING id`,
      [taskId, projectId, tenantId, agentKey, agentName, goal]
    );
    const runId = result.rows[0].id;
    this._emit(runId, projectId, 'run:started', {
      runId, taskId, projectId, agentKey, agentName, goal
    });
    return runId;
  }

  /**
   * Append a step event and stream it to subscribers.
   * @param {string} runId
   * @param {{step:number,type:string,tool?:string,payload?:object,projectId?:string}} event
   */
  async recordEvent(runId, event = {}) {
    const {
      step = 0, type = 'observe', tool = null, payload = {}, projectId = null
    } = event;

    await pool.query(
      `INSERT INTO agent_run_events (run_id, step, type, tool, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [runId, step, type, tool, JSON.stringify(payload)]
    );
    // Keep the run row's step counter fresh for pollers.
    await pool.query(
      'UPDATE agent_runs SET steps = GREATEST(steps, $2), updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [runId, step]
    );

    this._emit(runId, projectId, 'run:event', {
      runId, step, type, tool, payload
    });
  }

  /**
   * Close a run with a terminal status and totals.
   */
  async completeRun(runId, {
    status = 'completed',
    reason = null,
    steps = 0,
    filesWritten = [],
    costUsd = 0,
    result = null,
    projectId = null
  } = {}) {
    await pool.query(
      `UPDATE agent_runs
       SET status = $2, reason = $3, steps = $4, files_written = $5::jsonb,
           cost_usd = $6, result = $7::jsonb,
           finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        runId,
        status,
        reason,
        steps,
        JSON.stringify(filesWritten),
        costUsd,
        result === null ? null : JSON.stringify(result)
      ]
    );
    this._emit(runId, projectId, 'run:completed', {
      runId, status, reason, steps, filesWritten, costUsd
    });
  }

  async getRun(runId) {
    const res = await pool.query('SELECT * FROM agent_runs WHERE id = $1', [runId]);
    return res.rows[0] || null;
  }

  async listEvents(runId, afterId = 0) {
    const res = await pool.query(
      `SELECT id, step, type, tool, payload, created_at
       FROM agent_run_events
       WHERE run_id = $1 AND id > $2
       ORDER BY id ASC`,
      [runId, afterId]
    );
    return res.rows;
  }

  async listRuns({ projectId = null, tenantId = null, limit = 50 } = {}) {
    const clauses = [];
    const params = [];
    if (projectId) {
      params.push(projectId);
      clauses.push(`project_id = $${params.length}`);
    }
    if (tenantId) {
      params.push(tenantId);
      clauses.push(`tenant_id = $${params.length}`);
    }
    params.push(Math.min(Math.max(limit, 1), 200));
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const res = await pool.query(
      `SELECT * FROM agent_runs ${where} ORDER BY started_at DESC LIMIT $${params.length}`,
      params
    );
    return res.rows;
  }

  _emit(runId, projectId, event, data) {
    try {
      const io = getIO();
      if (!io) return;
      io.to(`run:${runId}`).emit(event, data);
      if (projectId) io.to(`project:${projectId}`).emit(event, data);
    } catch (err) {
      logger.warn(`run-tracker emit failed: ${err.message}`);
    }
  }
}

const runTrackerService = new RunTrackerService();

module.exports = { RunTrackerService, runTrackerService };
