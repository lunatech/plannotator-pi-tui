export function parseMarkdownArgs(args: string): string {
  const input = args.trim();
  if (!input) throw new Error('Usage: /annotate-markdown <file.md>');

  let filePath: string;
  if (input.startsWith('"') || input.startsWith("'")) {
    const quote = input[0]!;
    const end = input.indexOf(quote, 1);
    if (end < 0 || input.slice(end + 1).trim()) {
      throw new Error('Pass exactly one path; quote paths containing spaces.');
    }
    filePath = input.slice(1, end);
  } else {
    if (/\s/.test(input)) throw new Error('Pass exactly one path; quote paths containing spaces.');
    filePath = input;
  }

  if (!filePath || filePath.includes('\0')) throw new Error('A valid Markdown file path is required.');
  return filePath;
}
