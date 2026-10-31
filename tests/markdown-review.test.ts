import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reviewMarkdownFile, startRuntime, stopRuntime } from '../src/markdown-review.ts';

function fakeContext(cwd: string) {
  let stopped = 0;
  let started = 0;
  return {
    ctx: {
      cwd,
      mode: 'tui',
      hasUI: true,
      sessionManager: { getSessionId: () => 'test-session' },
      ui: {
        custom<T>(factory: (tui: any, theme: any, keys: any, done: (value: T) => void) => unknown): Promise<T> {
          return new Promise<T>((resolve) => factory({
            stop: () => { stopped += 1; },
            start: () => { started += 1; },
            requestRender: () => {},
          }, {}, {}, resolve));
        },
      },
    } as any,
    counts: () => ({ stopped, started }),
  };
}

async function fakeReviewer(root: string, result: string, editPath?: string) {
  const bin = join(root, 'fake-plannotator-tui');
  const edit = editPath ? `printf 'changed\\n' > ${JSON.stringify(editPath)}\n` : '';
  await writeFile(bin, `#!/bin/sh\nif [ "$1" = "--version" ]; then echo 'plannotator-tui 0.9.9'; exit 0; fi\n${edit}printf '%s' ${JSON.stringify(result)} > "$5"\n`);
  await chmod(bin, 0o755);
  return bin;
}

test('review sends annotated feedback to the originating session and restores terminal', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'markdown-review-test-'));
  t.after(async () => { await stopRuntime(); await rm(root, { recursive: true, force: true }); });
  const file = join(root, 'plan.md');
  await writeFile(file, '# Plan\n');
  const reviewer = await fakeReviewer(root, JSON.stringify({ decision: 'annotated', feedback: 'Revise section 1' }));
  const previous = process.env.PLANNOTATOR_TUI_BIN;
  process.env.PLANNOTATOR_TUI_BIN = reviewer;
  t.after(() => { if (previous === undefined) delete process.env.PLANNOTATOR_TUI_BIN; else process.env.PLANNOTATOR_TUI_BIN = previous; });
  const { ctx, counts } = fakeContext(root);
  const sent: string[] = [];
  const entries: unknown[] = [];
  const pi = {
    sendUserMessage: (content: string) => sent.push(content),
    sendMessage: () => assert.fail('annotated result should be a follow-up'),
    appendEntry: (_type: string, value: unknown) => entries.push(value),
  };
  startRuntime();
  const result = await reviewMarkdownFile(pi, 'plan.md', ctx, { source: 'tool' });
  assert.equal(result.decision, 'annotated');
  assert.equal(sent.length, 1);
  assert.match(sent[0]!, /Revise section 1/);
  assert.match(sent[0]!, /same file path/);
  assert.equal(entries.length, 1);
  assert.deepEqual(counts(), { stopped: 1, started: 1 });
});

test('review refuses decisions after the file changes', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'markdown-stale-test-'));
  t.after(async () => { await stopRuntime(); await rm(root, { recursive: true, force: true }); });
  const file = join(root, 'plan.md');
  await writeFile(file, '# Plan\n');
  const reviewer = await fakeReviewer(root, JSON.stringify({ decision: 'approved' }), file);
  const previous = process.env.PLANNOTATOR_TUI_BIN;
  process.env.PLANNOTATOR_TUI_BIN = reviewer;
  t.after(() => { if (previous === undefined) delete process.env.PLANNOTATOR_TUI_BIN; else process.env.PLANNOTATOR_TUI_BIN = previous; });
  const { ctx } = fakeContext(root);
  let sent = false;
  const pi = {
    sendUserMessage: () => { sent = true; },
    sendMessage: () => { sent = true; },
    appendEntry: () => {},
  };
  startRuntime();
  await assert.rejects(reviewMarkdownFile(pi, 'plan.md', ctx, { source: 'command' }), /file changed during review/);
  assert.equal(sent, false);
});
