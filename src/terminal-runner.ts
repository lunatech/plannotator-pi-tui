import { spawn } from 'node:child_process';
import type { ExtensionCommandContext, ExtensionContext } from '@earendil-works/pi-coding-agent';

export interface ChildOutcome { code: number; signal: NodeJS.Signals | null }

let activeChild: ReturnType<typeof spawn> | undefined;
const terminating = new WeakSet<ReturnType<typeof spawn>>();

function terminateChild(child: ReturnType<typeof spawn>): void {
  if (terminating.has(child) || child.exitCode !== null || child.signalCode !== null) return;
  terminating.add(child);
  child.kill('SIGTERM');
  const timer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }, 1500);
  timer.unref();
}

export function terminateActiveChild(): void {
  if (activeChild) terminateChild(activeChild);
}

export async function runInteractiveTui(
  ctx: ExtensionCommandContext | ExtensionContext,
  executable: string,
  args: string[],
  cwd: string,
  signal?: AbortSignal,
): Promise<ChildOutcome> {
  if (ctx.mode !== 'tui' || !ctx.hasUI) throw new Error('Markdown review requires an interactive Pi terminal (TUI mode).');
  if (signal?.aborted) throw new Error('Markdown review was cancelled.');

  const outcome = await ctx.ui.custom<ChildOutcome | Error>((tui, _theme, _keybindings, done) => {
    let completed = false;
    let child: ReturnType<typeof spawn> | undefined;
    let abortHandler: (() => void) | undefined;
    const finish = (value: ChildOutcome | Error) => {
      if (completed) return;
      completed = true;
      if (signal && abortHandler) signal.removeEventListener('abort', abortHandler);
      activeChild = undefined;
      try {
        tui.start();
        tui.requestRender(true);
      } catch (error) {
        if (!(value instanceof Error)) value = error instanceof Error ? error : new Error(String(error));
      }
      done(value);
    };

    tui.stop();
    process.stdout.write('\u001b[2J\u001b[H');
    try {
      child = spawn(executable, args, { cwd, stdio: 'inherit', env: process.env, shell: false });
      activeChild = child;
      child.once('error', (error) => finish(error));
      child.once('close', (code, childSignal) => {
        if (code === null) finish(new Error(`Reviewer exited from signal ${childSignal ?? 'unknown'}.`));
        else if (code !== 0) finish(new Error(`Reviewer exited with status ${code}.`));
        else finish({ code, signal: childSignal });
      });
      abortHandler = () => {
        if (child) terminateChild(child);
      };
      signal?.addEventListener('abort', abortHandler, { once: true });
      if (signal?.aborted) abortHandler();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }

    return { render: () => [], invalidate: () => {} };
  });

  if (outcome instanceof Error) throw outcome;
  if (signal?.aborted) throw new Error('Markdown review was cancelled.');
  return outcome;
}
