import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTuiDecision } from '../src/tui-protocol.ts';

test('parses each valid decision shape', () => {
  assert.deepEqual(parseTuiDecision('{"decision":"approved"}'), { decision: 'approved' });
  assert.deepEqual(parseTuiDecision('{"decision":"approved","feedback":"note"}'), { decision: 'approved', feedback: 'note' });
  assert.deepEqual(parseTuiDecision('{"decision":"annotated","feedback":"revise"}'), { decision: 'annotated', feedback: 'revise' });
  assert.deepEqual(parseTuiDecision('{"decision":"dismissed"}'), { decision: 'dismissed' });
});

test('rejects malformed, unknown, and inconsistent decisions', () => {
  for (const input of ['{', '[]', 'null', '{}', '{"decision":"other"}', '{"decision":"annotated"}', '{"decision":"dismissed","feedback":"x"}', '{"decision":"approved","feedback":4}', '{"decision":"approved","other":true}']) {
    assert.throws(() => parseTuiDecision(input));
  }
});

test('rejects results above the protocol size limit', () => {
  assert.throws(() => parseTuiDecision(`{"decision":"dismissed","x":"${'x'.repeat(1024 * 1024)}"}`), /1 MiB/);
});
