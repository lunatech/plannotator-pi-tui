# Pi Markdown Annotator

## What we’re building

Plannotator-style interactive annotation in a terminal, with the TUI’s feedback automatically returned to Pi so Pi can revise the Markdown file and repeat the cycle—ideally usable on a headless server.

This will be a Pi extension named **Pi Markdown Annotator**, with an `/annotate-markdown <path>` command and an `annotate_markdown({ filePath })` agent tool. It supports Markdown files only (`.md`, `.markdown`, `.mdx`), rendered as Markdown without executing MDX components. Other text formats and binary files are unsupported because the underlying TUI has no faithful plain-text/source-code mode.

## Implementation plan

See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the extension design, review flow, CLI result protocol, Pi hooks, pseudocode, implementation stages, and acceptance tests.

## Development

We will implement this as a Pi extension. No extension code exists yet; the commands below assume its entry point will be `./src/markdown-annotator.ts`.

From the repository root, start an interactive Pi session with only this extension loaded:

```sh
pi --no-extensions --extension ./src/markdown-annotator.ts
```

`--no-extensions` disables discovered, configured, and built-in extensions. The explicit `--extension` still loads our local source, without installing it globally. After editing the extension, run `/reload` inside Pi.

For a cleaner test session that also disables discovered skills, prompt templates, and context files, and does not save the conversation:

```sh
pi --no-extensions --extension ./src/markdown-annotator.ts \
  --no-skills --no-prompt-templates --no-context-files --no-session
```

These are development launch commands, not a sandbox: Pi still uses your normal credentials and settings, and its built-in tools remain available. Run in a terminal, including over SSH with a PTY, rather than print or JSON mode when testing interactive annotation.

## Research

This repository contains three Git submodules under [`research/`](research/):

- [`plannotator`](research/plannotator) — browser-based plan and code review for coding agents. Its Pi extension is at [`research/plannotator/apps/pi-extension`](research/plannotator/apps/pi-extension).
- [`plannotator-tui`](research/plannotator-tui) — terminal UI for reviewing and annotating Markdown documents, including support for reading Pi session replies.
- [`pi`](research/pi) — the Pi coding agent source repository.

Each project is tracked as a Git submodule, so its checked-out revision is recorded by this repository. To initialize the submodules after cloning:

```sh
git submodule update --init --recursive
```
