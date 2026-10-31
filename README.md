# Plannotator Pi TUI

Review Markdown in [Plannotator TUI](https://github.com/plannotator/plannotator-tui) without leaving [Pi](https://github.com/earendil-works/pi). The extension opens the reviewer in your terminal, returns annotations to the same Pi session, and lets Pi revise the file for another review. It works in an interactive terminal, including an SSH session with a PTY; it does not need a browser.

It accepts existing `.md`, `.markdown`, and `.mdx` files inside the current project. MDX is displayed as Markdown, not executed. Other formats are not supported.

## Getting started

Install Pi and the separate `plannotator-tui` executable. On macOS or Linux, Homebrew can install the reviewer:

```sh
brew tap plannotator/tap
brew install plannotator/tap/plannotator-tui
```

Install this extension from the GitHub repo:

```sh
pi install git:github.com/lunatech/plannotator-pi-tui
```

The repo's default branch is `main`; append `@main` to the source if you want to name it explicitly. A tag or commit SHA pins a particular revision. Pi installs the extension, not the reviewer executable. If `plannotator-tui` is not on `PATH`, set `PLANNOTATOR_TUI_BIN` to its absolute path before starting Pi.

Start Pi in the project containing the file you want to review:

```sh
cd /path/to/project
pi
```

Run `/annotate-markdown docs/plan.md` inside Pi. Pi-style references such as `/annotate-markdown @docs/plan.md` work too. You can also ask the agent to review a file with `annotate_markdown({ filePath: "docs/plan.md" })` after it finishes writing the file.

In the reviewer, select text with the mouse or press `v`, move to a range, and press `Enter`. Press `c` to add a comment. Press `E` to send annotations and request a revision, `A` to approve (including non-blocking notes), or `q` to dismiss. After a revision, Pi can submit the same file for another review. Reviewing a plan does not authorize Pi to carry out the plan.

Reviews require Pi's interactive terminal UI; print, JSON, and RPC modes cannot hand the terminal to the reviewer.

## Update or remove

For a package installed from GitHub:

```sh
pi update git:github.com/lunatech/plannotator-pi-tui
pi remove git:github.com/lunatech/plannotator-pi-tui
```

`pi list` shows configured packages. A package pinned to a tag or commit stays on that ref when updated; install a different ref to move to another version. Removing the Pi package does not remove the separately installed `plannotator-tui` executable.

## Development

Clone with submodules to build the pinned reviewer locally:

```sh
git clone --recurse-submodules https://github.com/lunatech/plannotator-pi-tui.git
cd plannotator-pi-tui
cargo build --manifest-path research/plannotator-tui/Cargo.toml -p plannotator-tui
```

For an existing clone without submodules, run `git submodule update --init --recursive`. The binary is at `research/plannotator-tui/target/debug/plannotator-tui`. Set `PLANNOTATOR_TUI_BIN` to its absolute path or add it to `PATH` before starting Pi.

To install this checkout instead of the GitHub package, run `pi install .` from the repository root. Local packages use the checkout directly; update with Git and remove with `pi remove .` from the same directory. To try the extension without installing it, run:

```sh
pi --no-extensions --extension ./src/markdown-annotator.ts
```

`--no-extensions` disables other extensions while still loading the explicit path. Run `/reload` in Pi after editing the extension. Use `npm test` for tests and `npm run check` for syntax checks; `check` is not a TypeScript type-check or linter.

See [the implementation plan](docs/implementation-plan.md) for the review protocol, Pi hooks, and remaining verification work. The `research/` submodules record the Pi, Plannotator, and Plannotator TUI revisions used during development; the extension imports none of them at runtime. Pi and the extension run with your normal user permissions, not in a sandbox.

## License

MIT. See [LICENSE](LICENSE).
