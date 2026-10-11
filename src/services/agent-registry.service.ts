/**
 * Agent Registry Service
 *
 * Replaces hardcoded agent definitions with a pluggable, versioned registry.
 *
 * - Built-in agents are seeded from BUILTIN_AGENTS (is_builtin = TRUE, global
 *   scope with tenant_id NULL). Seeding is idempotent.
 * - Tenants can register their own custom agents (tenant_id set); a tenant
 *   agent with the same key shadows the global one for that tenant.
 * - Each registration creates a new version; `getAgent` resolves the latest
 *   active version, preferring a tenant-scoped definition over the global one.
 *
 * This is the foundation of an agent marketplace: agents become discoverable,
 * versioned records rather than code constants the orchestrator hardcodes.
 */
import db = require('../config/database');
import logger = require('../utils/logger');
import { AppError } from '../utils/errors';

const pool = db.pool;

export interface AgentDefinition {
  id: string;
  agent_key: string;
  version: number;
  name: string;
  tier: number;
  description: string | null;
  capabilities: string[];
  system_prompt: string | null;
  tools: string[];
  model: string | null;
  is_builtin: boolean;
  is_active: boolean;
  tenant_id: string | null;
}

export interface RegisterAgentInput {
  agentKey: string;
  name: string;
  tier?: number;
  description?: string;
  capabilities?: string[];
  systemPrompt?: string;
  tools?: string[];
  model?: string | null;
}

/**
 * Built-in agent roster. Seeded into agent_definitions on startup. Extends the
 * legacy capability-only definitions with a system prompt and default tool set
 * so the registry is immediately usable by the agent loop.
 */
export const BUILTIN_AGENTS: RegisterAgentInput[] = [
  {
    agentKey: 'pydantic-ai',
    name: 'Pydantic AI',
    tier: 1,
    description: 'Senior agent for planning, research, and high-level implementation',
    capabilities: ['planning', 'research', 'architecture', 'code-review'],
    tools: ['read_file', 'search_code'],
    systemPrompt:
      'You are a senior engineering agent. Plan carefully, research the codebase before acting, and produce high-level implementation strategies.'
  },
  {
    agentKey: 'agent-zero',
    name: 'Agent Zero',
    tier: 1,
    description: 'Meta-agent for team coordination and context management',
    capabilities: ['coordination', 'context-management', 'orchestration'],
    tools: ['read_file', 'search_code'],
    systemPrompt:
      'You coordinate other agents and manage shared context. Keep the team aligned and avoid conflicting changes.'
  },
  {
    agentKey: 'auto-agent',
    name: 'AutoAgent',
    tier: 2,
    description: 'Mid-level code implementation and debugging',
    capabilities: ['coding', 'implementation', 'debugging'],
    tools: ['read_file', 'search_code', 'write_file', 'run_tests'],
    systemPrompt:
      'You implement features and fix bugs. Read relevant files first, make focused edits, and run tests to verify.'
  },
  {
    agentKey: 'augment-code',
    name: 'AugmentCode',
    tier: 2,
    description: 'Backend, API, and database implementation',
    capabilities: ['backend', 'api-development', 'database'],
    tools: ['read_file', 'search_code', 'write_file', 'run_tests', 'db_introspect'],
    systemPrompt:
      'You build backend services, APIs, and data layers. Inspect the schema before writing data-access code.'
  },
  {
    agentKey: 'coderabbit',
    name: 'CodeRabbit',
    tier: 3,
    description: 'Code review and quality analysis',
    capabilities: ['code-review', 'quality-analysis', 'best-practices'],
    tools: ['read_file', 'search_code'],
    systemPrompt:
      'You review code for correctness, security, and best practices. Report concrete, actionable findings.'
  },
  {
    agentKey: 'devin',
    name: 'Devin',
    tier: 3,
    description: 'Advanced autonomous coding tasks',
    capabilities: ['autonomous-coding', 'complex-problem-solving', 'architecture'],
    tools: [
      'read_file', 'search_code', 'write_file', 'run_tests', 'git',
      'web_fetch', 'browser', 'code_exec'
    ],
    systemPrompt:
      'You autonomously complete complex engineering tasks end to end: plan, implement, test, and iterate until the goal is met.'
  },
  {
    agentKey: 'mintlify',
    name: 'Mintlify',
    tier: 4,
    description: 'Documentation generation',
    capabilities: ['documentation', 'api-docs', 'markdown'],
    tools: ['read_file', 'search_code', 'write_file'],
    systemPrompt:
      'You write clear developer documentation. Base docs on the actual code, not assumptions.'
  }
];

const GLOBAL_SENTINEL = '00000000-0000-0000-0000-000000000000';

function mapRow(row: Record<string, unknown>): AgentDefinition {
  const parse = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[];
    if (typeof v === 'string') {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  return {
    id: row['id'] as string,
    agent_key: row['agent_key'] as string,
    version: row['version'] as number,
    name: row['name'] as string,
    tier: row['tier'] as number,
    description: (row['description'] as string | null) ?? null,
    capabilities: parse(row['capabilities']),
    system_prompt: (row['system_prompt'] as string | null) ?? null,
    tools: parse(row['tools']),
    model: (row['model'] as string | null) ?? null,
    is_builtin: Boolean(row['is_builtin']),
    is_active: Boolean(row['is_active']),
    tenant_id: (row['tenant_id'] as string | null) ?? null
  };
}

export class AgentRegistryService {
  /** Idempotently seed the built-in agents (global scope). */
  async seedBuiltins(): Promise<number> {
    let inserted = 0;
    for (const agent of BUILTIN_AGENTS) {
      const res = await pool.query(
        `INSERT INTO agent_definitions
           (agent_key, version, name, tier, description, capabilities,
            system_prompt, tools, model, is_builtin, is_active, tenant_id)
         SELECT $1, 1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, TRUE, TRUE, NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM agent_definitions
           WHERE agent_key = $1 AND tenant_id IS NULL
         )`,
        [
          agent.agentKey,
          agent.name,
          agent.tier ?? 2,
          agent.description ?? null,
          JSON.stringify(agent.capabilities ?? []),
          agent.systemPrompt ?? null,
          JSON.stringify(agent.tools ?? []),
          agent.model ?? null
        ]
      );
      inserted += res.rowCount ?? 0;
    }
    if (inserted > 0) {
      logger.info(`agent-registry: seeded ${inserted} built-in agent(s)`);
    }
    return inserted;
  }

  /**
   * List the latest active version of every agent available to a scope:
   * global built-ins plus the tenant's own custom agents, with a tenant
   * definition shadowing a global one that shares its key.
   */
  async listAgents(tenantId: string | null = null): Promise<AgentDefinition[]> {
    const res = await pool.query(
      `SELECT DISTINCT ON (agent_key) *
       FROM agent_definitions
       WHERE is_active = TRUE
         AND (tenant_id IS NULL OR tenant_id = $1)
       ORDER BY agent_key,
                (tenant_id = $1) DESC NULLS LAST,  -- prefer tenant-scoped
                version DESC`,
      [tenantId]
    );
    return res.rows.map(mapRow);
  }

  /** Resolve the latest active version of a single agent for a scope. */
  async getAgent(
    agentKey: string,
    tenantId: string | null = null
  ): Promise<AgentDefinition | null> {
    const res = await pool.query(
      `SELECT *
       FROM agent_definitions
       WHERE agent_key = $1
         AND is_active = TRUE
         AND (tenant_id IS NULL OR tenant_id = $2)
       ORDER BY (tenant_id = $2) DESC NULLS LAST, version DESC
       LIMIT 1`,
      [agentKey, tenantId]
    );
    return res.rows[0] ? mapRow(res.rows[0]) : null;
  }

  /** All versions of an agent key within a scope (newest first). */
  async getVersions(
    agentKey: string,
    tenantId: string | null = null
  ): Promise<AgentDefinition[]> {
    const res = await pool.query(
      `SELECT * FROM agent_definitions
       WHERE agent_key = $1
         AND (tenant_id IS NULL OR tenant_id = $2)
       ORDER BY version DESC`,
      [agentKey, tenantId]
    );
    return res.rows.map(mapRow);
  }

  /**
   * Register a new agent (or a new version of an existing key) within a scope.
   * Version = max(existing in scope) + 1. Built-in global agents cannot be
   * overwritten in the global scope; tenants register under their own scope.
   */
  async registerAgent(
    input: RegisterAgentInput,
    tenantId: string | null = null
  ): Promise<AgentDefinition> {
    if (!input.agentKey || !input.name) {
      throw new AppError('agentKey and name are required', 400);
    }

    const scopeId = tenantId ?? GLOBAL_SENTINEL;
    const versionRes = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next
       FROM agent_definitions
       WHERE agent_key = $1
         AND COALESCE(tenant_id, $3::uuid) = COALESCE($2::uuid, $3::uuid)`,
      [input.agentKey, tenantId, GLOBAL_SENTINEL]
    );
    const version = (versionRes.rows[0]?.next as number) ?? 1;
    void scopeId;

    const res = await pool.query(
      `INSERT INTO agent_definitions
         (agent_key, version, name, tier, description, capabilities,
          system_prompt, tools, model, is_builtin, is_active, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9, FALSE, TRUE, $10)
       RETURNING *`,
      [
        input.agentKey,
        version,
        input.name,
        input.tier ?? 2,
        input.description ?? null,
        JSON.stringify(input.capabilities ?? []),
        input.systemPrompt ?? null,
        JSON.stringify(input.tools ?? []),
        input.model ?? null,
        tenantId
      ]
    );
    logger.info(
      `agent-registry: registered ${input.agentKey} v${version}${tenantId ? ` (tenant ${tenantId})` : ' (global)'}`
    );
    return mapRow(res.rows[0]);
  }

  /** Deactivate a specific version (soft retire). */
  async deactivateAgent(
    agentKey: string,
    version: number,
    tenantId: string | null = null
  ): Promise<void> {
    const res = await pool.query(
      `UPDATE agent_definitions
       SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE agent_key = $1 AND version = $2
         AND COALESCE(tenant_id, $4::uuid) = COALESCE($3::uuid, $4::uuid)`,
      [agentKey, version, tenantId, GLOBAL_SENTINEL]
    );
    if ((res.rowCount ?? 0) === 0) {
      throw new AppError('Agent version not found in this scope', 404);
    }
  }
}

export const agentRegistryService = new AgentRegistryService();
