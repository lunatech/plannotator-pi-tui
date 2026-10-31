import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { ExtensionCommandContext, ExtensionContext } from '@earendil-works/pi-coding-agent';
import { isTargetUnchanged, validateMarkdownTarget } from './markdown-target.ts';
import { outcomeText, revisionMessage } from './markdown-feedback.ts';
import { runInteractiveTui, terminateActiveChild } from './terminal-runner.ts';
import { parseTuiDecision, type TuiDecision } from './tui-protocol.ts';

interface PiApi {
  sendUserMessage(content: string, options?: { deliverAs?: 'steer' | 'followUp' }): void;
  sendMessage(message: { customType: string; content: string; display: boolean; details?: unknown }, options?: { triggerTurn?: boolean }): void;
  appendEntry<T>(customType: string, data?: T): void;
}

interface Owner { sessionId: string; cwd: string; runtime: number }

let sequence = 0;
let currentRuntime = 0;
let alive = false;
let reviewActive = false;
let activeAbort: AbortController | undefined;

export function startRuntime(): void {
  currentRuntime += 1;
  alive = true;
}

export async function stopRuntime(): Promise<void> {
  alive = false;
  currentRuntime += 1;
  activeAbort?.abort();
  terminateActiveChild();
}

function captureOwner(ctx: ExtensionCommandContext | ExtensionContext): Owner {
  return {
    sessionId: ctx.sessionManager.getSessionId(),
    cwd: resolve(ctx.cwd),
    runtime: currentRuntime,
  };
}

function ownerIsCurrent(owner: Owner, ctx: ExtensionCommandContext | ExtensionContext): boolean {
  return alive && currentRuntime === owner.runtime && ctx.sessionManager.getSessionId() === owner.sessionId;
}

function resolveBinary(): string {
  const configured = process.env.PLANNOTATOR_TUI_BIN?.trim();
  const executable = configured || 'plannotator-tui';
  const check = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5000, shell: false });
  if (check.error || check.status !== 0) {
    throw new Error(`Cannot run ${executable}. Install plannotator-tui or set PLANNOTATOR_TUI_BIN to its executable path.`);
  }
  return executable;
}

function decisionSummary(decision: TuiDecision): string {
  if (decision.decision === 'approved' && decision.feedback?.trim()) return 'approved-with-notes';
  return decision.decision;
}

function recordOutcome(pi: PiApi, owner: Owner, filePath: string, sha256: string, decision: TuiDecision): string {
  const reviewId = `md-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
  pi.appendEntry('pi-markdown-annotator-review', {
    reviewId,
    sessionId: owner.sessionId,
    filePath,
    sha256,
    outcome: decisionSummary(decision),
    at: new Date().toISOString(),
  });
  return reviewId;
}

export async function reviewMarkdownFile(
  pi: PiApi,
  filePath: string,
  ctx: ExtensionCommandContext | ExtensionContext,
  options: { signal?: AbortSignal; source: 'command' | 'tool' },
): Promise<TuiDecision> {
  if (ctx.mode !== 'tui' || !ctx.hasUI) throw new Error('Markdown review requires an interactive Pi terminal (TUI mode).');
  if (reviewActive) throw new Error('A Markdown review is already using this Pi terminal. Finish it before starting another.');
  reviewActive = true;
  const owner = captureOwner(ctx);
  const controller = new AbortController();
  activeAbort = controller;
  const forwardAbort = () => controller.abort();
  options.signal?.addEventListener('abort', forwardAbort, { once: true });
  let tempDir: string | undefined;
  try {
    if (!alive) throw new Error('Pi session is not ready for Markdown review.');
    if (controller.signal.aborted) throw new Error('Markdown review was cancelled.');
    const target = await validateMarkdownTarget(filePath, owner.cwd);
    const executable = resolveBinary();
    tempDir = await mkdtemp(join(tmpdir(), 'pi-markdown-annotator-'));
    const resultPath = join(tempDir, 'result.json');
    const childResult = await runInteractiveTui(
      ctx,
      executable,
      [target.path, '--gate', '--json', '--result-file', resultPath],
      owner.cwd,
      controller.signal,
    );
    if (childResult.code !== 0) throw new Error(`Reviewer exited with status ${childResult.code}.`);
    if (controller.signal.aborted) throw new Error('Markdown review was cancelled.');
    if (!ownerIsCurrent(owner, ctx)) throw new Error('Pi session changed during review; the decision was not delivered.');
    if (!(await isTargetUnchanged(target))) throw new Error('The Markdown file changed during review. Reopen it and review the latest version.');

    let json: string;
    try {
      const resultStat = await stat(resultPath);
      if (!resultStat.isFile() || resultStat.size > 1024 * 1024) throw new Error('TUI result is not a regular file or exceeds 1 MiB.');
      json = await readFile(resultPath, 'utf8');
    } catch (error) {
      if (error instanceof Error && error.message.includes('exceeds 1 MiB')) throw error;
      throw new Error('The reviewer did not write a decision result.');
    }
    const decision = parseTuiDecision(json);
    // File and result reads yield to the event loop; the session or request may
    // change while they are in flight. Do not write metadata or deliver to it.
    if (controller.signal.aborted) throw new Error('Markdown review was cancelled.');
    if (!ownerIsCurrent(owner, ctx)) throw new Error('Pi session changed during review; the decision was not delivered.');
    const reviewId = recordOutcome(pi, owner, target.path, target.sha256, decision);
    if (decision.decision === 'annotated' && decision.feedback.trim()) {
      pi.sendUserMessage(revisionMessage(reviewId, target.path, target.sha256, decision.feedback), { deliverAs: 'followUp' });
    } else if (options.source === 'command') {
      const note = decision.decision === 'approved' ? decision.feedback : undefined;
      const content = note?.trim() ? `Markdown approved with non-blocking notes for ${target.path}:\n\n${note}` : outcomeText(decision);
      pi.sendMessage({
        customType: 'pi-markdown-annotator-outcome',
        content,
        display: true,
        details: { reviewId, filePath: target.path, decision: decision.decision },
      }, { triggerTurn: false });
    }
    return decision;
  } finally {
    options.signal?.removeEventListener('abort', forwardAbort);
    if (activeAbort === controller) activeAbort = undefined;
    reviewActive = false;
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  }
}
