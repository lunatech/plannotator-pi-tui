import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expandHomeDirectory, isTargetUnchanged, validateMarkdownTarget } from '../src/markdown-target.ts';

let root: string;
test('expands only a leading home-directory shorthand', () => {
  assert.equal(expandHomeDirectory('~', '/home/tester'), '/home/tester');
  assert.equal(expandHomeDirectory('~/docs/plan.md', '/home/tester'), '/home/tester/docs/plan.md');
  assert.equal(expandHomeDirectory('~other/docs/plan.md', '/home/tester'), '~other/docs/plan.md');
  assert.equal(expandHomeDirectory('docs/~/plan.md', '/home/tester'), 'docs/~/plan.md');
});

test('Markdown target validation', async (t) => {
  root = await mkdtemp(join(tmpdir(), 'markdown-target-test-'));
  t.after(async () => rm(root, { recursive: true, force: true }));

  await t.test('accepts Pi-style @ file references', async () => {
    await writeFile(join(root, 'plan.md'), '# Plan\n');
    const target = await validateMarkdownTarget('@plan.md', root);
    assert.equal(target.path, join(root, 'plan.md'));
  });

  await t.test('accepts Markdown extensions case-insensitively and hashes content', async () => {
    const file = join(root, 'Plan.MDX');
    await writeFile(file, '# Plan\n');
    const target = await validateMarkdownTarget('Plan.MDX', root);
    assert.equal(target.path, file);
    assert.equal(target.content, '# Plan\n');
    assert.equal(await isTargetUnchanged(target), true);
    await writeFile(file, '# Changed\n');
    assert.equal(await isTargetUnchanged(target), false);
  });

  await t.test('rejects non-Markdown extensions', async () => {
    await writeFile(join(root, 'source.py'), 'print("x")\n');
    await assert.rejects(validateMarkdownTarget('source.py', root), /Only Markdown/);
  });

  await t.test('rejects invalid UTF-8 and NUL bytes', async () => {
    await writeFile(join(root, 'invalid.md'), Buffer.from([0xc3, 0x28]));
    await writeFile(join(root, 'binary.md'), Buffer.from([0x61, 0x00, 0x62]));
    await assert.rejects(validateMarkdownTarget('invalid.md', root), /UTF-8/);
    await assert.rejects(validateMarkdownTarget('binary.md', root), /NUL/);
  });

  await t.test('rejects traversal and symlinks outside the project', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'markdown-outside-'));
    try {
      await writeFile(join(outside, 'secret.md'), '# secret');
      await assert.rejects(validateMarkdownTarget(join(outside, 'secret.md'), root), /inside the current project/);
      await symlink(join(outside, 'secret.md'), join(root, 'linked.md'));
      await assert.rejects(validateMarkdownTarget('linked.md', root), /inside the current project/);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});
