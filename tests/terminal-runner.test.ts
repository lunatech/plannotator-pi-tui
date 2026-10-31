import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('aborting a child that ignores SIGTERM escalates and restores Pi', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'annotator-cancel-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const ready = join(dir, 'ready');
  const { ctx, counts } = mockContext();
  const controller = new AbortController();
  const run = runInteractiveTui(ctx, process.execPath, [
    '-e', 'process.on("SIGTERM", () => {}); require("fs").writeFileSync(process.argv[1], "ready"); setInterval(() => {}, 1000)', ready,
  ], process.cwd(), controller.signal);
  const deadline = Date.now() + 5000;
  while (true) {
    try { await access(ready); break; } catch { /* wait for child to start */ }
    if (Date.now() > deadline) {
      controller.abort();
      await run.catch(() => {});
      assert.fail('child did not start');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  controller.abort();
  await assert.rejects(run, /signal SIGKILL|cancelled/);
  assert.deepEqual(counts(), { stopped: 1, started: 1, rendered: 1 });
});

test('rejects non-interactive execution before taking the terminal', async () => {
  const { ctx, counts } = mockContext();
  ctx.mode = 'rpc';
  await assert.rejects(runInteractiveTui(ctx, process.execPath, [], process.cwd()), /interactive Pi terminal/);
  assert.deepEqual(counts(), { stopped: 0, started: 0, rendered: 0 });
});
