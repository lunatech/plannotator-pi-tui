# Implementation TODO

## Goal

Implement Pi Markdown Annotator, run the available automated sanity checks, and hand off for the user's manual verification only after those checks pass.

## Technical direction

When implementation choices are needed, inspect the pinned `research/` source and follow its existing module boundaries, algorithms, conventions, and tests. Give `research/pi/` techniques highest priority when selecting Pi extension APIs and lifecycle patterns. Use Plannotator and Plannotator TUI as references for their respective behavior and protocol; do not introduce a competing design without a concrete incompatibility or safety reason.

## Tasks

- [x] Re-read `docs/implementation-plan.md` and relevant upstream Pi extension, TUI CLI/protocol, and Plannotator integration code before coding.
- [x] Confirm installed Pi API version and pinned upstream support; inspect repo conventions and available test/build tools. Pi `1.4.0` is installed; relevant ExtensionAPI patterns are present in research Pi. Node is `v22.22.3`, npm and Cargo are available; Bun, TypeScript compiler, and `plannotator-tui` are not on PATH.
- [x] Confirm the installed Pi API version and the pinned research revisions support the planned command, tool, terminal handoff, cancellation, follow-up delivery, and lifecycle behavior. Update the plan if code evidence requires a change. Follow-up: exercise APIs in runtime tests; terminal cancellation needs verification.
- [x] Set up extension package and development entry point; Pi RPC startup enumerated `/annotate-markdown` from the local extension.
- [x] Implement Markdown path parsing for `/annotate-markdown <path>`, including quoted paths, clear usage errors, project-boundary/symlink checks, Markdown extension restrictions, and UTF-8 validation.
- [x] Handle Pi-style `@path` references in command/tool file arguments; literal `@`-prefixed filenames use `./@name.md`.
- [x] Implement `annotate_markdown({ filePath })` with an explicit-path tool contract and sequential execution so prior file writes complete before review.
- [x] Implement a TUI child-process adapter using inherited terminal streams and Pi's established terminal-handoff techniques; tests confirm restoration on success, nonzero exit, launch error, and cancellation of a child that ignores SIGTERM. Interactive shutdown still needs manual verification.
- [x] Implement the strict `--gate --json --result-file` protocol: private temporary result location, exit-status checks, schema/size validation, and cleanup.
- [x] Implement review lock, file-change detection, and runtime/session ownership checks; recheck immediately before recording/delivery. Tests cover session changes during result processing and an overlapping command that must not cancel the active review.
- [x] Map annotated feedback to one Pi follow-up requesting revision of the same file and resubmission; map approval and dismissal without triggering inappropriate revision turns.
- [x] Persist minimal review outcome metadata with `appendEntry()`; unresolved reviews are not replayed.
- [x] Add unit tests for argument parsing, path/target validation, protocol outcomes, terminal restoration, and feedback formatting.
- [ ] Add remaining end-to-end fake TUI tests for malformed/missing result integration and all review-controller outcomes. Result-file handoff, cancellation escalation, overlapping commands, stale files, and session-change rejection have tests.
- [x] Build and test against the pinned TUI source; `cargo test` passed all tests. Built binary reports v0.9.9. A real interactive gate still needs manual terminal verification.
- [ ] Run formatting, TypeScript type-check, lint, and tests. `npm test`, `npm run check` (Node syntax checks), `git diff --check`, Pi RPC extension startup, and TUI Cargo tests pass. TypeScript compiler/linter are unavailable and npm installation was refused because it modifies `node_modules`; configure a non-mutating type-check path or obtain approval to install tooling.
- [x] Update README and implementation docs with the current entry point, binary setup, supported Markdown formats, current state, and outstanding runtime verification.
- [ ] Finish outstanding integration/type-check/docs items, rerun checks, and hand off for the user's manual end-to-end verification. Manual verification has not been performed.
