import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.mdx']);

export interface MarkdownTarget {
  path: string;
  content: string;
  sha256: string;
}

export function normalizeMarkdownReference(filePath: string): string {
  // Pi commonly writes file references as @path. A literal @-prefixed filename
  // can be addressed unambiguously as ./@name.md.
  return filePath.startsWith('@') ? filePath.slice(1) : filePath;
}

export function expandHomeDirectory(filePath: string, home = homedir()): string {
  if (filePath === '~') return home;
  if (filePath.startsWith('~/')) return join(home, filePath.slice(2));
  return filePath;
}

export async function validateMarkdownTarget(filePath: string, cwd: string): Promise<MarkdownTarget> {
  filePath = expandHomeDirectory(normalizeMarkdownReference(filePath));
  if (!filePath) throw new Error('A Markdown file path is required after @.');
  const requested = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  let realPath: string;
  let realCwd: string;
  try {
    [realPath, realCwd] = await Promise.all([realpath(requested), realpath(cwd)]);
  } catch {
    throw new Error(`Markdown file not found or inaccessible: ${filePath}`);
  }

  const rel = relative(realCwd, realPath);
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new Error('The Markdown file must be inside the current project directory.');
  }

  const extension = realPath.slice(realPath.lastIndexOf('.')).toLowerCase();
  if (!MARKDOWN_EXTENSIONS.has(extension)) {
    throw new Error('Only Markdown files are supported (.md, .markdown, .mdx). Other text and code files are rendered as Markdown and may display incorrectly.');
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(realPath);
  } catch {
    throw new Error(`Could not read Markdown file: ${filePath}`);
  }
  if (bytes.includes(0)) throw new Error('The selected file contains NUL bytes and is not supported.');

  let content: string;
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('The selected Markdown file is not valid UTF-8.');
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { path: realPath, content, sha256 };
}

export async function isTargetUnchanged(target: MarkdownTarget): Promise<boolean> {
  let current: Buffer;
  try {
    current = await readFile(target.path);
  } catch {
    return false;
  }
  return createHash('sha256').update(current).digest('hex') === target.sha256;
}
