export type TuiDecision =
  | { decision: 'approved'; feedback?: string }
  | { decision: 'annotated'; feedback: string }
  | { decision: 'dismissed' };

export const MAX_RESULT_BYTES = 1024 * 1024;

export function parseTuiDecision(json: string): TuiDecision {
  if (Buffer.byteLength(json, 'utf8') > MAX_RESULT_BYTES) throw new Error('TUI result exceeds the 1 MiB limit.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('TUI returned malformed decision JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('TUI decision must be a JSON object.');
  const record = value as Record<string, unknown>;
  const allowedKeys = new Set(['decision', 'feedback']);
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) throw new Error('TUI decision contains unsupported fields.');
  if (typeof record.decision !== 'string') throw new Error('TUI decision is missing its decision value.');

  switch (record.decision) {
    case 'approved':
      if (record.feedback !== undefined && typeof record.feedback !== 'string') throw new Error('Approval feedback must be text.');
      return record.feedback === undefined ? { decision: 'approved' } : { decision: 'approved', feedback: record.feedback };
    case 'annotated':
      if (typeof record.feedback !== 'string') throw new Error('Annotated decision is missing feedback text.');
      return { decision: 'annotated', feedback: record.feedback };
    case 'dismissed':
      if (record.feedback !== undefined) throw new Error('Dismissed decision cannot include feedback.');
      return { decision: 'dismissed' };
    default:
      throw new Error(`Unsupported TUI decision: ${record.decision}`);
  }
}
