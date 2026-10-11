/**
 * Run Tracker Service tests — persistence + Socket.IO streaming.
 */
const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));

jest.mock('../../../src/config/database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../../../src/middleware/websocket', () => ({
  getIO: jest.fn(() => ({ to: mockTo }))
}));
jest.mock('../../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { pool } = require('../../../src/config/database');
const { RunTrackerService } = require('../../../src/services/run-tracker.service');

const RUN_ID = 'r1b2c3d4-0000-0000-0000-000000000001';
let svc;

beforeEach(() => {
  jest.clearAllMocks();
  svc = new RunTrackerService();
  pool.query.mockResolvedValue({ rows: [{ id: RUN_ID }] });
});

describe('startRun', () => {
  it('inserts a run row and emits run:started', async () => {
    const id = await svc.startRun({ projectId: 'p1', agentName: 'devin', goal: 'do x' });
    expect(id).toBe(RUN_ID);
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO agent_runs');
    expect(mockTo).toHaveBeenCalledWith(`run:${RUN_ID}`);
    expect(mockTo).toHaveBeenCalledWith('project:p1');
    expect(mockEmit).toHaveBeenCalledWith('run:started', expect.objectContaining({ runId: RUN_ID }));
  });
});

describe('recordEvent', () => {
  it('appends an event and streams run:event', async () => {
    await svc.recordEvent(RUN_ID, {
      step: 2, type: 'act', tool: 'write_file', payload: { path: 'a.js' }, projectId: 'p1'
    });
    expect(pool.query.mock.calls[0][0]).toContain('INSERT INTO agent_run_events');
    expect(pool.query.mock.calls[1][0]).toContain('UPDATE agent_runs SET steps');
    expect(mockEmit).toHaveBeenCalledWith('run:event', expect.objectContaining({
      step: 2, type: 'act', tool: 'write_file'
    }));
  });
});

describe('completeRun', () => {
  it('closes the run with a terminal status and emits run:completed', async () => {
    await svc.completeRun(RUN_ID, {
      status: 'completed', steps: 5, filesWritten: ['a.js'], projectId: 'p1'
    });
    expect(pool.query.mock.calls[0][0]).toContain('finished_at = CURRENT_TIMESTAMP');
    expect(mockEmit).toHaveBeenCalledWith('run:completed', expect.objectContaining({ status: 'completed' }));
  });
});
