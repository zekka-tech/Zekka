/**
 * Agent Memory Service
 *
 * Retrieval-backed cross-run memory for agents. Unlike the in-run `memory[]`
 * array (discarded when a run ends), these facts persist and are scoped by
 * tenant / user / agent so an agent can recall earlier context on later runs.
 *
 * Retrieval uses Postgres full-text search (to_tsvector/plainto_tsquery) with
 * a graceful fallback to recency when no query is supplied.
 *
 * @module services/agent-memory.service
 */

const { pool } = require('../config/database');

class AgentMemoryService {
  /**
   * Persist a memory.
   * @param {{tenantId?:string,userId?:string,agentKey?:string,projectId?:string,
   *          kind?:string,content:string,importance?:number,metadata?:object}} input
   */
  async remember(input = {}) {
    const {
      tenantId = null,
      userId = null,
      agentKey = null,
      projectId = null,
      kind = 'fact',
      content,
      importance = 1,
      metadata = {}
    } = input;

    if (!content || typeof content !== 'string') {
      throw new Error('memory content is required');
    }

    const res = await pool.query(
      `INSERT INTO agent_memory
         (tenant_id, user_id, agent_key, project_id, kind, content, importance, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING *`,
      [
        tenantId, userId, agentKey, projectId, kind, content,
        Math.max(1, Math.min(importance, 10)), JSON.stringify(metadata)
      ]
    );
    return res.rows[0];
  }

  /**
   * Recall memories for a scope, optionally ranked by relevance to `query`.
   * @param {{tenantId?:string,userId?:string,agentKey?:string,query?:string,limit?:number}} opts
   * @returns {Promise<Array>}
   */
  async recall({
    tenantId = null,
    userId = null,
    agentKey = null,
    query = null,
    limit = 10
  } = {}) {
    const params = [];
    const scope = [];
    const scopeFilter = (col, val) => {
      // Match the exact scope OR global (NULL) memories.
      params.push(val);
      scope.push(`(${col} = $${params.length} OR ${col} IS NULL)`);
    };
    if (tenantId !== null) scopeFilter('tenant_id', tenantId);
    if (userId !== null) scopeFilter('user_id', userId);
    if (agentKey !== null) scopeFilter('agent_key', agentKey);

    const where = scope.length ? `WHERE ${scope.join(' AND ')}` : '';
    const cappedLimit = Math.min(Math.max(limit, 1), 100);

    let sql;
    if (query && query.trim()) {
      params.push(query);
      const q = `$${params.length}`;
      params.push(cappedLimit);
      sql = `
        SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${q})) AS rank
        FROM agent_memory
        ${where}
        ORDER BY rank DESC, importance DESC, created_at DESC
        LIMIT $${params.length}`;
    } else {
      params.push(cappedLimit);
      sql = `
        SELECT * FROM agent_memory
        ${where}
        ORDER BY importance DESC, created_at DESC
        LIMIT $${params.length}`;
    }

    const res = await pool.query(sql, params);

    // Best-effort: bump last_accessed_at for the returned rows.
    const ids = res.rows.map((r) => r.id);
    if (ids.length > 0) {
      await pool.query(
        'UPDATE agent_memory SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ANY($1)',
        [ids]
      );
    }
    return res.rows;
  }

  async forget(id) {
    const res = await pool.query('DELETE FROM agent_memory WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

const agentMemoryService = new AgentMemoryService();

module.exports = { AgentMemoryService, agentMemoryService };
