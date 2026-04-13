# Claide

Windows-first desktop app for managing multiple Claude Code sessions across git worktrees. Built with Electron + React + node-pty + xterm.js.

## What This Is

A local control plane for Claude Code — not an IDE, not a cloud service, not a voice assistant. Claide manages session lifecycle, terminal display, and worktree-aware project context. The user's editor remains the source of truth for code. Claude Code's session store remains the source of truth for resumable sessions.

## Key Architectural Decisions

### Worktree Strategy: Discover, Don't Create (v1)
Claide discovers and organizes existing git worktrees but does not create or delete them in v1. Users create worktrees themselves (or Claude Code creates them via `--worktree`). Claide detects all worktrees for a repo, groups sessions by worktree, and lets you launch/resume sessions in any of them.

### Session Namespace (Validated)
Claude Code uses the **literal cwd absolute path** as the session namespace — NOT the git repo root. Each worktree gets its own session directory under `~/.claude/projects/<path-encoded>/`. Path encoding replaces `\`, `/`, `:`, and `.` with `-`. Claide must scan multiple namespace directories to show all sessions for a repo.

### Ownership Boundaries
- **Main process**: PTYs, filesystem access, session/worktree discovery, metadata persistence
- **Renderer**: Layout, user interaction, xterm instances
- **Claude Code**: Resumable session storage (JSONL files)
- **Claide**: Presentation metadata only (display name, color, order, worktree collapse state) in `.claide/sessions.json` at the git repo root

### PTY Strategy
ConPTY via node-pty on Windows. No Unix signals — use staged shutdown (request stop → wait → force-kill). Resize and reconnect are first-class PTY events.

### Parser Strategy
Claude's terminal output parser is an **adapter, not a source of truth**. Strip ANSI, match known patterns, allow unknown states without breaking the session list. Show parser-derived fields (model, cost, context) only when confidence is high.

## Tech Stack

- **Electron** — desktop shell
- **React** — renderer UI
- **Vite** (or electron-vite) — build tooling
- **node-pty** — PTY spawning (ConPTY on Windows)
- **xterm.js** — terminal rendering
- **simple-git** or `child_process` — git worktree discovery via `git worktree list --porcelain`

## Project Structure

```
claide/
├── package.json
├── electron-builder.yml
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── project-root.ts
│   │   ├── session-manager.ts
│   │   ├── shell-manager.ts
│   │   ├── worktree-discovery.ts
│   │   ├── claude-store.ts
│   │   ├── claide-store.ts
│   │   ├── status-adapter.ts
│   │   └── ipc-handlers.ts
│   ├── renderer/       # React UI
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   ├── WorktreeGroup.tsx
│   │   │   ├── TerminalPanel.tsx
│   │   │   └── ShellPanel.tsx
│   │   └── styles/
│   └── shared/
│       └── types.ts
└── documentation/
    └── plan/
        └── 2026-04-13-claide-design.md
```

## Claude Code Session Storage Reference

- Sessions stored at: `~/.claude/projects/<path-encoded-cwd>/<uuid>.jsonl`
- Session index at: `~/.claude/sessions/<pid>.json` (maps pid → sessionId, cwd, kind)
- Path encoding: `C:\Users\Foo\repo` → `C--Users-Foo-repo` (replace `\/:/.` with `-`)
- **Canonical session ID**: the JSONL filename UUID. Matches `sessionId` inside the file and in the PID index. Accepted by `claude --resume <uuid>`.
- **Each worktree gets its own namespace** — Claude uses literal cwd path, not the git repo root.
- Desktop app worktree tracking: `%APPDATA%\Claude\git-worktrees.json`
- Worktrees created by Claude Code live at: `<repo>/.claude/worktrees/<name>/`

## IPC Data Flow

The main process is the single source of truth. `project:open` triggers full discovery (worktrees + sessions + metadata merge) and returns one canonical `project:state` payload to the renderer. The renderer never queries Claude storage or git directly.

## Git Worktree Discovery Reference

- Use `git worktree list --porcelain` — stable, machine-parseable
- Use `git rev-parse --git-common-dir` to find shared `.git` from any worktree
- Detect worktree vs main checkout: `.git` is a file (worktree) vs directory (main)
- Git outputs forward-slash paths on Windows (`C:/Users/...`) — normalize before comparing
- Case-insensitive path comparison on Windows (NTFS)
- NTFS junction hazard: pnpm node_modules junctions — never `rm -rf` a worktree blindly

## Windows-Specific Notes

- Default shell order: pwsh → powershell.exe → user-specified
- Git Bash / WSL are opt-in, not assumed
- Long path support: may need `core.longpaths=true` or system LongPathsEnabled registry key
- Drive letter casing must be normalized consistently
- Validate junctions, symlinks, long-path prefixes, and cloud-synced folders

## Development Conventions

- Keep IPC channels narrow and typed — only add what the current milestone needs
- Prefer testing against real Claude CLI output, not mocked data
- When in doubt about Claude CLI behavior, test it — the CLI contract is not documented and can change
- File tree and file viewer are post-MVP (Milestone 4+)
- Voice transcription, toolkit, watchdogs are future scope — do not build toward them yet

## Milestones

0. **Integration proof** — validate PTY, Claude CLI, session storage, worktree discovery
1. **Single-session core** — one Claude session, reliable PTY, basic state detection
2. **Multi-session lifecycle** — create/switch/resume/stop multiple sessions
3. **Worktree discovery + shell** — grouped session list by worktree, separate shell PTY
4. **Read-only context** — file tree, file preview (only if 0-3 are stable)
