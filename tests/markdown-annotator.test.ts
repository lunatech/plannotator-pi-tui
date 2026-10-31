import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import markdownAnnotator from '../src/markdown-annotator.ts';

test('a rejected second command does not terminate an active review', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'markdown-command-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'plan.md'), '# Plan\n');
  const binary = join(root, 'reviewer');
  await writeFile(binary, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "plannotator-tui 0.9.9"; exit 0; fi\nsleep 0.3\nprintf \'{"decision":"approved"}\' > "$5"\n');
  await chmod(binary, 0o755);
  const previous = process.env.PLANNOTATOR_TUI_BIN;
  process.env.PLANNOTATOR_TUI_BIN = binary;
  t.after(() => { if (previous === undefined) delete process.env.PLANNOTATOR_TUI_BIN; else process.env.PLANNOTATOR_TUI_BIN = previous; });
  let handler: ((args: string, ctx: any) => Promise<void>) | undefined;
  let shutdown: (() => Promise<void>) | undefined;
  let start: (() => void) | undefined;
  const pi = {
    on: (event: string, fn: any) => {
      if (event === 'session_start') start = fn;
      if (event === 'session_shutdown') shutdown = fn;
    },
    registerCommand: (_name: string, command: any) => { handler = command.handler; },
    registerTool: () => {},
    appendEntry: () => {},
    sendMessage: () => {},
  };
  markdownAnnotator(pi as any);
  assert.ok(handler && start && shutdown);
  start();
  t.after(() => shutdown!());
  let handoffs = 0;
  const notices: string[] = [];
  const ctx: any = {
    cwd: root, mode: 'tui', hasUI: true, sessionManager: { getSessionId: () => 'session' },
    waitForIdle: async () => {},
    ui: {
      notify: (message: string) => notices.push(message),
      custom: (factory: any) => new Promise((resolve) => factory({
        stop: () => { handoffs += 1; }, start: () => {}, requestRender: () => {},
      }, {}, {}, resolve)),
    },
  };
  const first = handler('plan.md', ctx);
  const deadline = Date.now() + 5000;
  while (!handoffs && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(handoffs, 1, 'review should start');
  await handler('', ctx); // Parsing error must not kill the first review.
  await first;
  assert.ok(notices.some((notice) => notice.includes('Usage:')));
  assert.ok(notices.some((notice) => notice.includes('Markdown approved')));
});
