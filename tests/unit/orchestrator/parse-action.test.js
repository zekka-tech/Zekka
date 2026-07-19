/**
 * Unit tests for parseAction - tolerant extraction of a single structured action
 * from free-text model output.
 */

const { parseAction, extractJsonObject } = require('../../../src/orchestrator/parse-action');

describe('extractJsonObject', () => {
  it('extracts a balanced object ignoring surrounding prose', () => {
    expect(extractJsonObject('prefix {"a":1} suffix')).toBe('{"a":1}');
  });

  it('handles braces inside string literals', () => {
    expect(extractJsonObject('{"a":"}{"}')).toBe('{"a":"}{"}');
  });

  it('handles escaped quotes inside strings', () => {
    expect(extractJsonObject('{"a":"he said \\"hi\\""}')).toBe('{"a":"he said \\"hi\\""}');
  });

  it('returns null when there is no object', () => {
    expect(extractJsonObject('no braces here')).toBeNull();
  });
});

describe('parseAction', () => {
  it('parses a tool action', () => {
    const a = parseAction('{"thought":"reading","tool":"read_file","args":{"path":"a.js"}}');
    expect(a).toEqual({
      type: 'tool', tool: 'read_file', args: { path: 'a.js' }, thought: 'reading'
    });
  });

  it('parses a tool action wrapped in a markdown fence', () => {
    const a = parseAction('```json\n{"tool":"search_code","args":{"query":"foo"}}\n```');
    expect(a.type).toBe('tool');
    expect(a.tool).toBe('search_code');
    expect(a.args).toEqual({ query: 'foo' });
  });

  it('parses a finish action and preserves result', () => {
    const a = parseAction('done: {"type":"finish","result":{"summary":"ok"}}');
    expect(a).toEqual({ type: 'finish', result: { summary: 'ok' }, thought: '' });
  });

  it('finish action defaults result to null when absent', () => {
    expect(parseAction('{"type":"finish"}')).toEqual({
      type: 'finish', result: null, thought: ''
    });
  });

  it('defaults missing/invalid args to an empty object', () => {
    expect(parseAction('{"tool":"run_tests"}').args).toEqual({});
    expect(parseAction('{"tool":"run_tests","args":"nope"}').args).toEqual({});
    expect(parseAction('{"tool":"run_tests","args":[1,2]}').args).toEqual({});
  });

  it('returns null for unparseable or empty input', () => {
    expect(parseAction('no json at all')).toBeNull();
    expect(parseAction('')).toBeNull();
    expect(parseAction(null)).toBeNull();
    expect(parseAction('{ not valid json }')).toBeNull();
  });

  it('returns null for a JSON object that is neither tool nor finish', () => {
    expect(parseAction('{"thought":"hmm"}')).toBeNull();
    expect(parseAction('{"tool":""}')).toBeNull();
    expect(parseAction('[1,2,3]')).toBeNull();
  });
});
