import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { parseMarkdownArgs } from './markdown-args.ts';
import { outcomeText } from './markdown-feedback.ts';
import { reviewMarkdownFile, startRuntime, stopRuntime } from './markdown-review.ts';

export default function markdownAnnotator(pi: ExtensionAPI): void {
  pi.on('session_start', () => startRuntime());
  pi.on('session_shutdown', async () => stopRuntime());

  pi.registerCommand('annotate-markdown', {
    description: 'Review a Markdown file in the terminal and send feedback to Pi',
    handler: async (args, ctx) => {
      let filePath: string;
      try {
        filePath = parseMarkdownArgs(args ?? '');
        await ctx.waitForIdle();
        const result = await reviewMarkdownFile(pi, filePath, ctx, { source: 'command' });
        ctx.ui.notify(outcomeText(result), 'info');
      } catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), 'error');
      }
    },
  });

  pi.registerTool({
    name: 'annotate_markdown',
    label: 'Review Markdown',
    description:
      'Open an existing Markdown file for interactive terminal review. Supports .md, .markdown, and .mdx only; other text/code and binary files are unsupported. Pass the exact path, normally the file you just wrote or edited. Ask the user if the target is ambiguous. If annotations request changes, revise this same file and call this tool again. Approval ends review; it does not authorize implementing work described in the document.',
    parameters: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the existing Markdown file, relative to the project directory.' },
      },
      required: ['filePath'],
      additionalProperties: false,
    } as any,
    executionMode: 'sequential',
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const filePath = (params as { filePath?: unknown }).filePath;
      if (typeof filePath !== 'string' || !filePath.trim()) throw new Error('filePath must be a non-empty Markdown path.');
      const result = await reviewMarkdownFile(pi, filePath, ctx, { source: 'tool', signal });
      const summary = outcomeText(result);
      const notes = result.decision === 'approved' && result.feedback?.trim()
        ? `\nNon-blocking notes (approval stands; do not revise solely for these notes):\n${result.feedback}`
        : '';
      return {
        content: [{ type: 'text', text: `${summary}${notes}` }],
        details: { decision: result.decision, feedback: result.feedback, filePath },
        terminate: true,
      };
    },
  } as any);
}
