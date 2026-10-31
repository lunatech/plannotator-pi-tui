import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdownArgs } from '../src/markdown-args.ts';

test('parses one unquoted path', () => assert.equal(parseMarkdownArgs(' docs/plan.md '), 'docs/plan.md'));
test('preserves quoted paths with spaces', () => assert.equal(parseMarkdownArgs('"docs/design plan.md"'), 'docs/design plan.md'));
test('accepts a quoted single-quote path', () => assert.equal(parseMarkdownArgs("'docs/design plan.md'"), 'docs/design plan.md'));
test('rejects empty or multiple paths', () => {
  assert.throws(() => parseMarkdownArgs(''), /Usage/);
  assert.throws(() => parseMarkdownArgs('one.md two.md'), /exactly one/);
});
test('rejects unmatched and trailing quoted arguments', () => {
  assert.throws(() => parseMarkdownArgs('"missing.md'), /exactly one/);
  assert.throws(() => parseMarkdownArgs('"one.md" two.md'), /exactly one/);
});
