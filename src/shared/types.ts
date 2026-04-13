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

// Full project state sent from main → renderer
export interface ProjectState {
  rootPath: string
  claudeAvailable: boolean
  claudeVersion?: string
  sessions: SessionInfo[]
  error?: string
}

// IPC channel names — single source of truth
export const IPC = {
  // Renderer → Main (invoke)
  PROJECT_OPEN: 'project:open',
  SESSION_CREATE: 'session:create',
  SESSION_INPUT: 'session:input',
  SESSION_RESIZE: 'session:resize',
  SESSION_RESUME: 'session:resume',
  SESSION_STOP: 'session:stop',
  SESSION_RENAME: 'session:rename',

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

export interface SessionDataEvent {
  uuid: string
  data: string
}

export interface SessionLifecycleEvent {
  uuid: string
  lifecycle: SessionLifecycle
  error?: string
}
