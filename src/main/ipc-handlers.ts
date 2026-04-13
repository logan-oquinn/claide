import { ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { SessionManager } from './session-manager'
import { findClaudePath, getClaudeVersion } from './lib/claude-cli'
import { discoverSessions } from './lib/session-discovery'
import { IPC } from '../shared/types'
import type {
  ProjectState,
  SessionCreatePayload,
  SessionResumePayload,
  SessionInputPayload,
  SessionResizePayload,
  SessionStopPayload,
  SessionRenamePayload
} from '../shared/types'

/**
 * Register all IPC handlers and wire them to the SessionManager.
 * Call once during app startup.
 */
export function registerIpcHandlers(
  sessionManager: SessionManager,
  getWindow: () => BrowserWindow | null
): void {
  function sendToRenderer(channel: string, ...args: unknown[]) {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }

  // Forward session data and lifecycle events to renderer
  sessionManager.on('data', (uuid: string, data: string) => {
    sendToRenderer(IPC.SESSION_DATA, { uuid, data })
  })

  sessionManager.on('lifecycle', (uuid: string, lifecycle: string, error?: string) => {
    sendToRenderer(IPC.SESSION_LIFECYCLE, { uuid, lifecycle, error })
    // Also send updated project state so renderer stays in sync
    sendToRenderer(IPC.PROJECT_STATE, buildProjectState(sessionManager, currentRootPath))
  })

  // project:open — validate root, check Claude, discover sessions
  ipcMain.handle(IPC.PROJECT_OPEN, (_event, rootPath: string): ProjectState => {
    currentRootPath = rootPath

    if (!existsSync(rootPath)) {
      return {
        rootPath,
        claudeAvailable: false,
        sessions: [],
        error: `Directory not found: ${rootPath}`
      }
    }

    return buildProjectState(sessionManager, rootPath)
  })

  // session:create — spawn a new Claude PTY
  ipcMain.handle(IPC.SESSION_CREATE, (_event, payload: SessionCreatePayload): ProjectState => {
    try {
      sessionManager.create(payload.cwd, payload.name)
    } catch (err) {
      return {
        rootPath: currentRootPath,
        claudeAvailable: false,
        sessions: sessionManager.listSessions(),
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath)
  })

  // session:resume — resume a saved Claude session by UUID
  ipcMain.handle(IPC.SESSION_RESUME, (_event, payload: SessionResumePayload): ProjectState => {
    try {
      sessionManager.resume(payload.uuid, payload.cwd)
    } catch (err) {
      return {
        rootPath: currentRootPath,
        claudeAvailable: false,
        sessions: sessionManager.listSessions(),
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath)
  })

  // session:input — forward keyboard data to PTY
  ipcMain.on(IPC.SESSION_INPUT, (_event, payload: SessionInputPayload) => {
    sessionManager.write(payload.uuid, payload.data)
  })

  // session:resize — forward resize to PTY
  ipcMain.on(IPC.SESSION_RESIZE, (_event, payload: SessionResizePayload) => {
    sessionManager.resize(payload.uuid, payload.cols, payload.rows)
  })

  // session:stop — staged shutdown
  ipcMain.handle(IPC.SESSION_STOP, async (_event, payload: SessionStopPayload): Promise<ProjectState> => {
    await sessionManager.stop(payload.uuid)
    return buildProjectState(sessionManager, currentRootPath)
  })

  // session:rename — update display name
  ipcMain.handle(IPC.SESSION_RENAME, (_event, payload: SessionRenamePayload): ProjectState => {
    // For now, just update the in-memory session name
    // Task 3 will persist this to .claide/sessions.json
    const sessions = sessionManager.listSessions()
    const session = sessions.find(s => s.uuid === payload.uuid)
    if (session) {
      session.displayName = payload.displayName
    }
    return buildProjectState(sessionManager, currentRootPath)
  })
}

let currentRootPath = ''

function buildProjectState(sessionManager: SessionManager, rootPath: string): ProjectState {
  const claudePath = findClaudePath()
  const claudeVersion = claudePath ? getClaudeVersion() ?? undefined : undefined

  // Merge running sessions with discovered saved sessions
  const runningSessions = sessionManager.listSessions()

  // Discover saved sessions from Claude's storage
  const discovered = discoverSessions(rootPath)
  const runningUuids = new Set(runningSessions.map(s => s.uuid))

  // Add discovered sessions that aren't currently running
  const savedSessions = discovered
    .filter(d => !runningUuids.has(d.uuid))
    .map(d => ({
      uuid: d.uuid,
      displayName: d.uuid.substring(0, 8),
      lifecycle: 'stopped' as const,
    }))

  return {
    rootPath,
    claudeAvailable: claudePath !== null,
    claudeVersion,
    sessions: [...runningSessions, ...savedSessions]
  }
}
