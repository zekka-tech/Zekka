/**
 * Prompt construction for the agent loop.
 *
 * Renders the agent's role, goal, the available tool catalogue (with JSON arg
 * schemas), and the running observation trail into a single text prompt, plus the
 * strict output contract the parser expects (one JSON action per turn).
 *
 * @module orchestrator/agent-prompt
 */

const MAX_OBSERVATION_CHARS = 1500;

function renderTools(tools) {
  if (!tools.length) return '(no tools available)';
  return tools
    .map((t) => `- ${t.name}: ${t.description}\n    args schema: ${JSON.stringify(t.schema)}`)
    .join('\n');
}

function clip(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof str !== 'string') return String(str);
  return str.length > MAX_OBSERVATION_CHARS
    ? `${str.slice(0, MAX_OBSERVATION_CHARS)}… [truncated]`
    : str;
}

function renderHistory(memory) {
  if (!memory.length) return '(no actions yet — this is your first step)';
  return memory
    .map((entry) => {
      if (entry.parseError) {
        return `Step ${entry.step}: your reply could not be parsed as a single JSON `
          + `action. ${entry.hint}`;
      }
      const action = entry.action.type === 'finish'
        ? 'finish'
        : `${entry.action.tool}(${JSON.stringify(entry.action.args)})`;
      return `Step ${entry.step}: ${action}\n  observation: ${clip(entry.observation)}`;
    })
    .join('\n');
}

/**
 * @param {Object} task - { agentName, goal, stage }
 * @param {Array}  tools - output of ToolRegistry.describe()
 * @param {Array}  memory - accumulated { step, action, observation } entries
 * @returns {string}
 */
function buildAgentPrompt(task, tools, memory) {
  return `You are "${task.agentName}", an autonomous engineering agent in the Zekka orchestrator.

GOAL:
${task.goal || 'Complete the assigned task.'}

You work in a loop. Each turn you choose exactly ONE action, observe its result,
then decide the next action. Continue until the goal is met, then finish.

AVAILABLE TOOLS:
${renderTools(tools)}

OUTPUT CONTRACT — reply with a SINGLE JSON object and nothing else:
  To call a tool: {"thought": "<brief reasoning>", "tool": "<name>", "args": { ... }}
  To finish:      {"thought": "<brief reasoning>", "type": "finish", "result": { "summary": "..." }}

Rules:
- Exactly one JSON object per reply. No prose outside the JSON.
- Only use tools from the list above with args matching their schema.
- Finish as soon as the goal is achieved; do not loop needlessly.

HISTORY SO FAR:
${renderHistory(memory)}

Respond with your next action as a single JSON object.`;
}

module.exports = { buildAgentPrompt };
