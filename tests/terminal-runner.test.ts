import test from 'node:test';
import assert from 'node:assert/strict';
import { runInteractiveTui } from '../src/terminal-runner.ts';

function mockContext() {
  let stopped = 0;
  let started = 0;
  let rendered = 0;
  const ctx = {
    mode: 'tui',
    hasUI: true,
    ui: {
      custom<T>(factory: (tui: any, theme: any, keys: any, done: (value: T) => void) => unknown): Promise<T> {
        return new Promise<T>((resolve) => {
          factory({
            stop: () => { stopped += 1; },
            start: () => { started += 1; },
            requestRender: () => { rendered += 1; },
          }, {}, {}, resolve);
        });
      },
    },
  };
  return { ctx: ctx as any, counts: () => ({ stopped, started, rendered }) };
}

test('hands terminal over and restores/redraws Pi on success', async () => {
  const { ctx, counts } = mockContext();
  const result = await runInteractiveTui(ctx, process.execPath, ['-e', 'process.exit(0)'], process.cwd());
  assert.equal(result.code, 0);
  assert.deepEqual(counts(), { stopped: 1, started: 1, rendered: 1 });
});

test('restores Pi when the child exits unsuccessfully', async () => {
  const { ctx, counts } = mockContext();
  await assert.rejects(runInteractiveTui(ctx, process.execPath, ['-e', 'process.exit(7)'], process.cwd()), /status 7/);
  assert.deepEqual(counts(), { stopped: 1, started: 1, rendered: 1 });
});

test('restores Pi when child launch fails', async () => {
  const { ctx, counts } = mockContext();
  await assert.rejects(runInteractiveTui(ctx, '/no/such/executable', [], process.cwd()), /spawn|ENOENT/i);
  assert.deepEqual(counts(), { stopped: 1, started: 1, rendered: 1 });
});

test('rejects non-interactive execution before taking the terminal', async () => {
  const { ctx, counts } = mockContext();
  ctx.mode = 'rpc';
  await assert.rejects(runInteractiveTui(ctx, process.execPath, [], process.cwd()), /interactive Pi terminal/);
  assert.deepEqual(counts(), { stopped: 0, started: 0, rendered: 0 });
});
