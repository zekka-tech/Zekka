/**
 * parseAction - Coerce a model's free-text reply into a single structured action.
 *
 * The Zekka model client is text-in / text-out (no native tool-calling API), so
 * agent tool use rides on a structured-JSON protocol. The model is instructed to
 * reply with exactly one JSON object of one of these shapes:
 *
 *   Tool call:  { "thought": "...", "tool": "read_file", "args": { ... } }
 *   Finish:     { "thought": "...", "type": "finish", "result": { ... } }
 *
 * This parser is deliberately tolerant: models wrap JSON in markdown fences, add
 * prose around it, or emit the object mid-sentence. We extract the first balanced
 * JSON object and validate its shape. On any failure we return null — the agent
 * loop treats null as a parse error and feeds a repair hint back to the model
 * rather than crashing.
 *
 * @module orchestrator/parse-action
 */

/**
 * Extract the first balanced `{...}` JSON object substring from arbitrary text.
 * Brace-aware and string-aware (ignores braces inside JSON string literals).
 *
 * @param {string} text
 * @returns {string|null} The JSON substring, or null if none found.
 */
function extractJsonObject(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Parse a model reply into a normalized action object.
 *
 * @param {string} text - Raw model output.
 * @returns {(
 *   { type: 'finish', result: *, thought: string } |
 *   { type: 'tool', tool: string, args: Object, thought: string } |
 *   null
 * )} Normalized action, or null when the reply cannot be parsed into a valid action.
 */
function parseAction(text) {
  if (typeof text !== 'string' || text.trim() === '') return null;

  const json = extractJsonObject(text);
  if (!json) return null;

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const thought = typeof parsed.thought === 'string' ? parsed.thought : '';

  // Finish action: explicit terminal signal from the model.
  if (parsed.type === 'finish') {
    return {
      type: 'finish',
      result: Object.prototype.hasOwnProperty.call(parsed, 'result')
        ? parsed.result
        : null,
      thought
    };
  }

  // Tool action: must name a tool. `args` defaults to an empty object.
  if (typeof parsed.tool === 'string' && parsed.tool.trim() !== '') {
    const { args } = parsed;
    return {
      type: 'tool',
      tool: parsed.tool,
      args: args !== null && typeof args === 'object' && !Array.isArray(args)
        ? args
        : {},
      thought
    };
  }

  return null;
}

module.exports = { parseAction, extractJsonObject };
