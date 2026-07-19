/**
 * AgentRunner - the perceive → plan → act → observe → reflect loop.
 *
 * Replaces the old `simulateAgentWork` stub: instead of a random-delay simulation,
 * an agent now repeatedly asks the model for one structured action, executes it via
 * the ToolRegistry, feeds the observation back, and continues until the model emits
 * a `finish` action or a guard trips.
 *
 * Guards (any one terminates the loop, always with a durable terminal status):
 *   - MAX_STEPS          hard iteration cap
 *   - budget             tokenEconomics.getBudgetStatus() exhausted
 *   - no-progress        the same action repeated N times in a row
 *   - finish             the model declared the goal met
 *
 * @module orchestrator/agent-runner
 */

const { parseAction } = require('./parse-action');
const { buildAgentPrompt } = require('./agent-prompt');

const DEFAULTS = {
  maxSteps: 12,
  budgetThresholdPercent: 100,
  noProgressLimit: 3
};

class AgentRunner {
  /**
   * @param {Object} options
   * @param {Object} options.modelClient - must expose generateOrchestratorResponse()
   * @param {Object} options.toolRegistry - ToolRegistry instance
   * @param {Object} [options.tokenEconomics] - for model selection + budget guard
   * @param {Object} [options.contextBus] - for per-step state persistence
   * @param {Object} [options.logger]
   * @param {Object} [options.toolContext] - base ctx passed to every tool (workspaceRoot, exec…)
   * @param {number} [options.maxSteps]
   * @param {number} [options.budgetThresholdPercent]
   * @param {number} [options.noProgressLimit]
   */
  constructor(options = {}) {
    if (!options.modelClient) throw new Error('AgentRunner requires a modelClient');
    if (!options.toolRegistry) throw new Error('AgentRunner requires a toolRegistry');

    this.modelClient = options.modelClient;
    this.toolRegistry = options.toolRegistry;
    this.tokenEconomics = options.tokenEconomics || null;
    this.contextBus = options.contextBus || null;
    this.logger = options.logger || console;
    this.toolContext = options.toolContext || {};

    this.maxSteps = options.maxSteps || DEFAULTS.maxSteps;
    this.budgetThresholdPercent = options.budgetThresholdPercent
      ?? DEFAULTS.budgetThresholdPercent;
    this.noProgressLimit = options.noProgressLimit || DEFAULTS.noProgressLimit;
  }

  /**
   * @param {Object} task - { taskId, projectId, agentName, goal, complexity, stage }
   * @returns {Promise<{
   *   status: 'completed'|'failed'|'budget_exhausted'|'max_steps'|'no_progress',
   *   reason: string, steps: number, result: *, filesWritten: string[], memory: Array
   * }>}
   */
  async run(task) {
    const memory = [];
    const filesWritten = [];
    const recentSignatures = [];

    for (let step = 0; step < this.maxSteps; step += 1) {
      // --- budget guard ---
      if (await this._overBudget(task.projectId)) {
        return this._terminate('budget_exhausted', 'budget exhausted before step', {
          task, step, memory, filesWritten
        });
      }

      // --- PLAN ---
      const model = await this._selectModel(task);
      const prompt = buildAgentPrompt(task, this.toolRegistry.describe(), memory);

      let text;
      try {
        const response = await this.modelClient.generateOrchestratorResponse(prompt, {
          projectId: task.projectId,
          taskId: task.taskId,
          model
        });
        text = response && response.text;
      } catch (err) {
        return this._terminate('failed', `model call failed: ${err.message}`, {
          task, step, memory, filesWritten
        });
      }

      // --- PARSE (repair on failure rather than crash) ---
      const action = parseAction(text);
      if (!action) {
        memory.push({
          step,
          parseError: true,
          hint: 'Reply with exactly one JSON action object matching the output contract.'
        });
        continue;
      }

      if (action.type === 'finish') {
        return this._terminate('completed', 'agent finished', {
          task, step: step + 1, memory, filesWritten, result: action.result
        });
      }

      // --- ACT ---
      const observation = await this.toolRegistry.invoke(
        action.tool,
        action.args,
        this.toolContext
      );

      // --- OBSERVE ---
      memory.push({ step, action, observation });
      if (Array.isArray(observation.writes)) {
        for (const w of observation.writes) {
          if (!filesWritten.includes(w)) filesWritten.push(w);
        }
      }
      await this._persistStep(task, step, action, observation, filesWritten);

      // --- no-progress guard: same action signature N times in a row ---
      const signature = `${action.tool}:${JSON.stringify(action.args)}`;
      recentSignatures.push(signature);
      if (recentSignatures.length > this.noProgressLimit) recentSignatures.shift();
      if (
        recentSignatures.length === this.noProgressLimit
        && recentSignatures.every((s) => s === signature)
      ) {
        return this._terminate('no_progress', `repeated "${action.tool}" ${this.noProgressLimit}x`, {
          task, step: step + 1, memory, filesWritten
        });
      }
    }

    return this._terminate('max_steps', `hit MAX_STEPS (${this.maxSteps})`, {
      task, step: this.maxSteps, memory, filesWritten
    });
  }

  async _overBudget(projectId) {
    if (!this.tokenEconomics || typeof this.tokenEconomics.getBudgetStatus !== 'function') {
      return false;
    }
    try {
      const status = await this.tokenEconomics.getBudgetStatus(projectId);
      const daily = status && status.daily;
      const monthly = status && status.monthly;
      const exhausted = (b) => b && (b.remaining <= 0 || b.percent >= this.budgetThresholdPercent);
      return exhausted(daily) || exhausted(monthly);
    } catch (err) {
      this.logger.warn(`budget check failed, continuing: ${err.message}`);
      return false;
    }
  }

  async _selectModel(task) {
    if (this.tokenEconomics && typeof this.tokenEconomics.selectModel === 'function') {
      try {
        return await this.tokenEconomics.selectModel(task.complexity, task.projectId);
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  async _persistStep(task, step, action, observation, filesWritten) {
    if (!this.contextBus || typeof this.contextBus.setAgentState !== 'function') return;
    try {
      await this.contextBus.setAgentState(task.taskId, task.agentName, {
        status: 'running',
        step,
        lastTool: action.tool,
        lastOk: observation.ok,
        filesWritten
      });
    } catch (err) {
      this.logger.warn(`persist step failed: ${err.message}`);
    }
  }

  _terminate(status, reason, ctx) {
    const {
      task, step, memory, filesWritten, result = null
    } = ctx;
    const success = status === 'completed';
    this.logger[success ? 'info' : 'warn'](
      `agent ${task.agentName} (${task.taskId}) → ${status}: ${reason} [${step} steps]`
    );
    return {
      status, reason, steps: step, result, filesWritten, memory
    };
  }
}

module.exports = { AgentRunner };
