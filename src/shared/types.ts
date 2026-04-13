// Session lifecycle states
export type SessionLifecycle = 'running' | 'stopped' | 'error'

// Session info as seen by the renderer
export interface SessionInfo {
  uuid: string
  displayName: string
  lifecycle: SessionLifecycle
  lastActiveAt?: string
  error?: string
}

// Worktree with its grouped sessions
export interface WorktreeInfo {
  path: string           // absolute path, backslash-normalized on Windows
  branch: string | null
  isMainCheckout: boolean
  isPrunable: boolean
  isLocked: boolean
  sessions: SessionInfo[]
}

// Full project state sent from main → renderer
export interface ProjectState {
  rootPath: string
  claudeAvailable: boolean
  claudeVersion?: string
  isGitRepo: boolean
  worktrees: WorktreeInfo[]
  error?: string
}

// Helper: flatten all sessions from worktrees
export function flatSessions(state: ProjectState): SessionInfo[] {
  return state.worktrees.flatMap(wt => wt.sessions)
}

// IPC channel names — single source of truth
export const IPC = {
  // Renderer → Main (invoke)
  PROJECT_OPEN: 'project:open',
  PROJECT_PICK: 'project:pick',
  PROJECT_RECENT: 'project:recent',
  SESSION_CREATE: 'session:create',
  SESSION_INPUT: 'session:input',
  SESSION_RESIZE: 'session:resize',
  SESSION_RESUME: 'session:resume',
  SESSION_STOP: 'session:stop',
  SESSION_RENAME: 'session:rename',

  // Shell
  SHELL_CREATE: 'shell:create',
  SHELL_INPUT: 'shell:input',
  SHELL_RESIZE: 'shell:resize',
  SHELL_DATA: 'shell:data',

  // Main → Renderer (send)
  PROJECT_STATE: 'project:state',
  SESSION_DATA: 'session:data',
  SESSION_LIFECYCLE: 'session:lifecycle',
} as const

// IPC payload types
export interface SessionCreatePayload {
  cwd: string
  name?: string
}

export interface SessionInputPayload {
  uuid: string
  data: string
}

export interface SessionResizePayload {
  uuid: string
  cols: number
  rows: number
}

export interface SessionResumePayload {
  uuid: string
  cwd: string
}

export interface SessionStopPayload {
  uuid: string
}

export interface SessionRenamePayload {
  uuid: string
  displayName: string
}

export interface RecentProject {
  path: string
  name: string
  lastOpenedAt: string
}

export interface ShellResizePayload {
  cols: number
  rows: number
}

export interface SessionDataEvent {
  uuid: string
  data: string
}

export interface SessionLifecycleEvent {
  uuid: string
  lifecycle: SessionLifecycle
  error?: string
}
