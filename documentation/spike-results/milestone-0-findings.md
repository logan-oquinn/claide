# Milestone 0: Integration Proof Findings

**Date:** 2026-04-13
**Claude Code version:** 2.1.104
**Platform:** Windows 11 Enterprise 10.0.26100
**Node.js:** 20.19.5

## Spike 1: PTY + ConPTY (PASS)

- `node-pty` + ConPTY works reliably on Windows for spawn, input, resize, and kill.
- 5 concurrent PTYs spawned and killed without issues.
- Exit code on kill is `-1073741510` (STATUS_CONTROL_C_EXIT / 0xC000013A) — expected on Windows.
- `AttachConsole failed` errors appear in stderr during cleanup — this is ConPTY's child process enumeration agent, not a functional failure. Cosmetic noise only.
- Default shell via `COMSPEC` is `cmd.exe`. For Claide, we should explicitly use `pwsh` or `powershell.exe`.

**Implication for Milestone 1:** PTY layer is solid. No blockers.

## Spike 2: Claude CLI Spawning (PASS)

- Claude CLI found at `C:\Users\Logan.OQuinn\.local\bin\claude.exe`.
- **IMPORTANT: node-pty requires the full absolute path** to the executable. Passing just `"claude"` causes `File not found` error. This differs from `child_process.execSync` which resolves PATH.
- Print mode (`claude -p "..."`) works for non-interactive validation.
- Interactive PTY spawn with `--name` works. 2418 bytes captured on startup.
- `/exit` command exits cleanly with exit code `0`.
- Startup output includes ANSI escape sequences, model info, welcome message, and recent activity.

**Implication for Milestone 1:** Must resolve full path to Claude CLI before PTY spawn. Add a `findClaudePath()` utility.

## Spike 3: Session Storage Discovery (PASS)

- Projects directory at `~/.claude/projects/` confirmed.
- Path encoding validated: `\`, `/`, `:`, `.` all replaced with `-`.
- Encoding for `C:\Users\Logan.OQuinn\source\repos\claide` matches actual namespace `C--Users-Logan-OQuinn-source-repos-claide`.
- JSONL filename UUID matches `sessionId` inside the file — confirmed stable canonical key.
- Session index at `~/.claude/sessions/<pid>.json` tracks cwd, kind, entrypoint.

**Implication for Milestone 1-2:** `encodePath()` function is straightforward. Session discovery is reliable.

## Spike 4: Worktree Discovery (PASS)

- `git worktree list --porcelain` works and is parseable.
- Git outputs forward-slash paths on Windows (`C:/Users/...`).
- Main checkout is always the first entry.
- `git rev-parse --git-common-dir` returns relative `.git` when run from the main checkout — need to resolve to absolute path.
- Porcelain parser correctly extracts path, branch, HEAD, prunable, locked status.
- Session namespace computed from worktree path matches real Claude storage.

**Implication for Milestone 3:** Worktree discovery is reliable. Parser is ready to extract into production code.

## Spike 5: Status Parser (PARTIAL)

- Model name detected in stripped output: `Sonnet4.6withhigheffort` — words are concatenated after ANSI stripping, needs smarter parsing.
- Token context detected: `200k`.
- No cost pattern at idle — cost likely only appears after API usage.
- ANSI stripping regex catches most sequences but concatenates adjacent text. Needs column-aware parsing or splitting on known delimiters.
- Raw transcript saved for further analysis.

**Implication for Milestone 1-2:** Model and context are parseable with work. Cost is not available at idle. Parser should be treated as best-effort — show fields only when parsed with high confidence. The status bar appears to use a custom ANSI layout that will need careful reverse-engineering.

## Key Design Decisions Validated

1. **Path encoding is deterministic** — simple regex replacement works.
2. **Session UUID is the stable canonical key** — matches across all storage locations.
3. **Each worktree gets its own session namespace** — confirmed in earlier testing.
4. **node-pty needs full executable path** — must resolve via `where` command.
5. **`/exit` is the clean shutdown mechanism** — returns exit code 0.
6. **ConPTY AttachConsole errors are cosmetic** — can be suppressed in production.

## Open Items for Future Spikes

- Resize behavior during active Claude generation (not tested).
- Multiple Claude PTYs simultaneously (tested with shells, not with Claude).
- Session resume via `claude --resume <uuid>` in PTY mode.
- Parser needs column-aware ANSI processing for reliable field extraction.
