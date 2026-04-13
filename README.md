# Claide

A Windows-first desktop app for managing multiple [Claude Code](https://claude.ai/code) sessions across git worktrees.

A **local control plane** for parallel Claude Code session management on Windows — not an IDE, not a cloud service, not a voice assistant.

## What It Does

- **Multi-session management** — Run 5-8 Claude Code sessions simultaneously in one project
- **Worktree-aware** — Discovers git worktrees and groups sessions by worktree
- **Real terminal fidelity** — Full PTY support via ConPTY, not a terminal emulator pretending
- **Session lifecycle** — Create, switch, stop, and resume sessions with persistent metadata
- **Local-only** — Everything runs on your machine. No servers, no accounts, no telemetry

## What It Doesn't Do

- Edit files (use your real IDE)
- Create or delete worktrees (use git or Claude Code's `--worktree` flag)
- Provide AI services (bring your own Claude Code subscription)
- Voice transcription, toolkit automation, or watchdogs

## Architecture

Claide sits between you and Claude Code's CLI:

```
You → Claide → Claude Code CLI (via PTY)
              → Git CLI (worktree discovery)
              → ~/.claude/projects/ (session discovery)
```

The main process owns all PTYs, filesystem access, and state. The renderer only displays what the main process tells it. Claude Code owns session storage; Claide owns presentation metadata only.

## Tech Stack

- **Electron** + **React** + **TypeScript**
- **electron-vite** for build tooling
- **node-pty** for ConPTY-backed terminal spawning
- **xterm.js** for terminal rendering

## Status

**Milestone 0: Integration Proof** — Validating external contracts (PTY, Claude CLI, session storage, worktree discovery) before building UI.

See [`documentation/plan/2026-04-13-claide-design.md`](documentation/plan/2026-04-13-claide-design.md) for the full design.

## Development

```bash
# Install dependencies
npm install

# Run the Electron app in dev mode
npm run dev

# Run validation spikes (Milestone 0)
npm run spike:pty          # PTY + ConPTY behavior
npm run spike:claude       # Claude CLI spawning
npm run spike:sessions     # Session storage discovery
npm run spike:worktrees    # Git worktree discovery
npm run spike:parser       # Terminal output parsing
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New session (in active worktree) |
| `Ctrl+1`-`8` | Focus session by index |
| `Ctrl+Tab` | Next session |
| `Ctrl+Shift+Tab` | Previous session |
| `Ctrl+\`` | Toggle shell panel |

## Roadmap

| Milestone | Goal | Status |
|-----------|------|--------|
| 0 | Integration proof — validate PTY, CLI, storage, worktrees | Complete |
| 1 | Single-session core — one reliable Claude PTY session | Built |
| 2 | Multi-session lifecycle — create/switch/resume/stop | Built |
| 3 | Worktree discovery + shell — grouped sessions, user shell | Built |
| 4 | Read-only context — file tree, preview | Future |

## License

ISC
