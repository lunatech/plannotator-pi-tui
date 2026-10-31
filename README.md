# Pi Markdown Annotator

## Introduction

Pi Markdown Annotator lets you review and annotate Markdown in a terminal. Pi receives your feedback and can revise the file and repeat the review. The extension provides an `/annotate-markdown <path>` command and an `annotate_markdown({ filePath })` agent tool. It supports `.md`, `.markdown`, and `.mdx` files. Other formats are unsupported because the TUI has no plain-text or source-code mode.

## Installation

### Prerequisites

- [Pi](https://github.com/badlogic/pi-mono) installed and available as `pi` on your `PATH`.
- The `plannotator-tui` binary. Install it with Homebrew on macOS or Linux, or build it from the included submodule (steps below).
- An interactive terminal for running reviews.

### Install from GitHub

Install the extension as a Pi package from the repository's default branch (`main`):

```sh
pi install git:github.com/lunatech/plannotator-pi-tui
```

To select `main` explicitly, use `pi install git:github.com/lunatech/plannotator-pi-tui@main`. The branch suffix is optional while `main` is the default. For a fixed version, use a commit SHA or tag instead; Pi keeps that ref pinned when packages are updated. Run `pi list` to confirm the package is configured.

Pi installs the extension, **not** the `plannotator-tui` executable. Install the reviewer separately with Homebrew on macOS or Linux:

```sh
brew tap plannotator/tap
brew install plannotator/tap/plannotator-tui
```

If the executable is not on `PATH`, set `PLANNOTATOR_TUI_BIN` to its absolute path before starting Pi.

### Update or uninstall

For an installation from the GitHub repo, update or remove the Pi package with:

```sh
pi update git:github.com/lunatech/plannotator-pi-tui
pi remove git:github.com/lunatech/plannotator-pi-tui
```

A tag or commit SHA stays pinned when you update; install a different ref to move to another version. If you installed from a checkout with `pi install .`, update the checkout with Git yourself; remove that package with `pi remove .` from the same directory. Removing the Pi package does not uninstall the separately installed `plannotator-tui` binary.

### Install from a checkout

To build the reviewer from the pinned submodule instead, clone the repository with its submodules:

```sh
git clone --recurse-submodules https://github.com/lunatech/plannotator-pi-tui.git
cd plannotator-pi-tui
cargo build --manifest-path research/plannotator-tui/Cargo.toml -p plannotator-tui
pi install .
```

If you already cloned without submodules, run `git submodule update --init --recursive` before building. The build places the binary at `research/plannotator-tui/target/debug/plannotator-tui`. Add it to `PATH`, or set `PLANNOTATOR_TUI_BIN` to its absolute path. For one session without installing the extension, run `pi --extension ./src/markdown-annotator.ts` from the checkout.

## Development

See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the extension design, review flow, CLI result protocol, Pi hooks, pseudocode, implementation stages, and acceptance tests.

The extension entry point is `./src/markdown-annotator.ts`. Install the `plannotator-tui` binary separately; the extension invokes it with `--gate --json --result-file`. You can set `PLANNOTATOR_TUI_BIN` to its executable path.

From the repository root, start an interactive Pi session with only this extension loaded:

```sh
pi --no-extensions --extension ./src/markdown-annotator.ts
```

`--no-extensions` disables discovered, configured, and built-in extensions. The explicit `--extension` still loads our local source, without installing it globally. In Pi, run `/annotate-markdown docs/plan.md`; you can also ask the agent to call `annotate_markdown` with the exact path. After editing the extension, run `/reload` inside Pi.

For a cleaner test session that also disables discovered skills, prompt templates, and context files, and does not save the conversation:

```sh
pi --no-extensions --extension ./src/markdown-annotator.ts \
  --no-skills --no-prompt-templates --no-context-files --no-session
```

The reviewer can be built from the pinned submodule with `cargo build --manifest-path research/plannotator-tui/Cargo.toml -p plannotator-tui`; set `PLANNOTATOR_TUI_BIN` to `research/plannotator-tui/target/debug/plannotator-tui` for a local checkout. The extension requires an interactive Pi TUI and terminal (including an SSH PTY); print, JSON, and RPC modes cannot run the review.

Run basic checks with `npm test` and `npm run check`. These are development launch commands, not a sandbox: Pi still uses your normal credentials and settings, and its built-in tools remain available.

## Research

These submodules informed the extension's design: Plannotator supplied the agent-review reference, `plannotator-tui` provides the terminal Markdown review UI and Pi session-reply support, and Pi's source was used to check extension integration points. This repository contains three Git submodules under [`research/`](research/):

- [`plannotator`](research/plannotator) — browser-based plan and code review for coding agents. Its Pi extension is at [`research/plannotator/apps/pi-extension`](research/plannotator/apps/pi-extension).
- [`plannotator-tui`](research/plannotator-tui) — terminal UI for reviewing and annotating Markdown documents, including support for reading Pi session replies.
- [`pi`](research/pi) — the Pi coding agent source repository.

Each project is tracked as a Git submodule, so its checked-out revision is recorded by this repository. To initialize the submodules after cloning:

```sh
git submodule update --init --recursive
```
