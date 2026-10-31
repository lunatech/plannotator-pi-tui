import test from 'node:test';
import assert from 'node:assert/strict';
import { outcomeText, revisionMessage } from '../src/markdown-feedback.ts';

test('revision message names file, review, digest, and repeat workflow', () => {
  const message = revisionMessage('md-1', '/repo/docs/plan.md', 'abc123', 'Please clarify step 2.');
  assert.match(message, /Markdown review md-1/);
  assert.match(message, /File: \/repo\/docs\/plan.md/);
  assert.match(message, /Reviewed SHA-256: abc123/);
  assert.match(message, /Please clarify step 2\./);
  assert.match(message, /call annotate_markdown/);
  assert.match(message, /Do not implement work/);
});

test('approval and dismissal outcomes stay distinct from revision', () => {
  assert.equal(outcomeText({ decision: 'approved' }), 'Markdown approved.');
  assert.equal(outcomeText({ decision: 'approved', feedback: 'note' }), 'Markdown approved with non-blocking notes.');
  assert.equal(outcomeText({ decision: 'dismissed' }), 'Review dismissed without sending feedback.');
  assert.equal(outcomeText({ decision: 'annotated', feedback: '' }), 'Review closed without feedback.');
});
