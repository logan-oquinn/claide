# Testing Backlog

Blocked by SentinelOne exclusion. Once approved, run through all of these.

## Milestone 1: Single Session Core

- [ ] `npm run dev` — window opens with sidebar + empty state
- [ ] Click "+ New Session" — Claude spawns, terminal renders output
- [ ] Type a prompt — input forwarded, Claude responds
- [ ] Resize window — terminal reflows correctly
- [ ] Type `/exit` — session shows "stopped" state
- [ ] If Claude CLI not installed — error message shown, no crash

## Milestone 2: Multi-Session Lifecycle

- [ ] Create 2+ sessions — both run simultaneously
- [ ] Click between sessions — instant switch, scrollback preserved
- [ ] Double-click session name — inline rename works (Enter commits, Escape cancels)
- [ ] Close and reopen app — renamed sessions persist their display names
- [ ] Hover running session — "x" stop button appears
- [ ] Click stop — session transitions to stopped, scrollback visible
- [ ] Click a stopped session — resumes via `claude --resume <uuid>`
- [ ] Check `.claide/sessions.json` exists with correct schema

## Milestone 3: Worktree Discovery + Shell (pending implementation)

- [ ] Open a repo with multiple worktrees — grouped session list appears
- [ ] Worktree headers show branch name and path
- [ ] Sessions correctly grouped under their worktree
- [ ] Expand/collapse worktree groups
- [ ] Open a non-git directory — flat session list, no crash
- [ ] Shell panel toggle works (Ctrl+`)
- [ ] Shell spawns pwsh or powershell.exe
- [ ] Shell input/output works independently from Claude sessions

## SentinelOne Notes

- Exit code `0xC0000022` (STATUS_ACCESS_DENIED) when Electron spawns claude.exe via ConPTY
- Exclusion requested for `C:\Users\Logan.OQuinn\source\repos\claide\`
- Same pattern as VS Code / Windows Terminal — false positive
