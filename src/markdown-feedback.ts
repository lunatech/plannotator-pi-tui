import type { TuiDecision } from './tui-protocol.ts';

export function revisionMessage(reviewId: string, filePath: string, sha256: string, feedback: string): string {
  return [
    `Markdown review ${reviewId}`,
    `File: ${filePath}`,
    'Decision: revision requested',
    `Reviewed SHA-256: ${sha256}`,
    '',
    feedback,
    '',
    'Revise this file to address the annotations, preserving unrelated content.',
    'Then call annotate_markdown with this same file path for another review.',
    'Do not implement work described in the document merely because it was reviewed.',
  ].join('\n');
}

export function outcomeText(decision: TuiDecision): string {
  switch (decision.decision) {
    case 'annotated':
      return decision.feedback.trim() ? 'Review feedback was delivered to the Pi session.' : 'Review closed without feedback.';
    case 'approved':
      return decision.feedback?.trim() ? 'Markdown approved with non-blocking notes.' : 'Markdown approved.';
    case 'dismissed':
      return 'Review dismissed without sending feedback.';
  }
}
