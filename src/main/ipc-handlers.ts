import { ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { SessionManager } from './session-manager'
import { findClaudePath, getClaudeVersion } from './lib/claude-cli'
import { discoverSessions } from './lib/session-discovery'
import { readMetadata, writeMetadata, setSessionDisplayName, touchSession } from './lib/claide-store'
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

let currentRootPath = ''
let currentMetadata = readMetadata('')

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

  function saveMetadata() {
    if (currentRootPath) {
      writeMetadata(currentRootPath, currentMetadata)
    }
  }

  // Forward session data and lifecycle events to renderer
  sessionManager.on('data', (uuid: string, data: string) => {
    sendToRenderer(IPC.SESSION_DATA, { uuid, data })
  })

  sessionManager.on('lifecycle', (uuid: string, lifecycle: string, error?: string) => {
    sendToRenderer(IPC.SESSION_LIFECYCLE, { uuid, lifecycle, error })
    sendToRenderer(IPC.PROJECT_STATE, buildProjectState(sessionManager, currentRootPath, currentMetadata))
  })

  // project:open — validate root, check Claude, discover sessions
  ipcMain.handle(IPC.PROJECT_OPEN, (_event, rootPath: string): ProjectState => {
    currentRootPath = rootPath
    currentMetadata = readMetadata(rootPath)

    if (!existsSync(rootPath)) {
      return {
        rootPath,
        claudeAvailable: false,
        sessions: [],
        error: `Directory not found: ${rootPath}`
      }
    }

    return buildProjectState(sessionManager, rootPath, currentMetadata)
  })

  // session:create — spawn a new Claude PTY
  ipcMain.handle(IPC.SESSION_CREATE, (_event, payload: SessionCreatePayload): ProjectState => {
    try {
      const info = sessionManager.create(payload.cwd, payload.name)
      // Persist metadata for new session
      currentMetadata = touchSession(currentMetadata, info.uuid, info.displayName)
      saveMetadata()
    } catch (err) {
      return {
        rootPath: currentRootPath,
        claudeAvailable: false,
        sessions: sessionManager.listSessions(),
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })

  // session:resume — resume a saved Claude session by UUID
  ipcMain.handle(IPC.SESSION_RESUME, (_event, payload: SessionResumePayload): ProjectState => {
    try {
      const displayName = currentMetadata.sessions[payload.uuid]?.displayName
      sessionManager.resume(payload.uuid, payload.cwd, displayName)
      currentMetadata = touchSession(
        currentMetadata,
        payload.uuid,
        displayName || payload.uuid.substring(0, 8)
      )
      saveMetadata()
    } catch (err) {
      return {
        rootPath: currentRootPath,
        claudeAvailable: false,
        sessions: sessionManager.listSessions(),
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
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
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })

  // session:rename — update display name and persist
  ipcMain.handle(IPC.SESSION_RENAME, (_event, payload: SessionRenamePayload): ProjectState => {
    currentMetadata = setSessionDisplayName(currentMetadata, payload.uuid, payload.displayName)
    saveMetadata()
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })
}

function buildProjectState(
  sessionManager: SessionManager,
  rootPath: string,
  metadata: ReturnType<typeof readMetadata>
): ProjectState {
  const claudePath = findClaudePath()
  const claudeVersion = claudePath ? getClaudeVersion() ?? undefined : undefined

  const runningSessions = sessionManager.listSessions()
  const discovered = discoverSessions(rootPath)
  const runningUuids = new Set(runningSessions.map(s => s.uuid))

  // Apply metadata display names to running sessions
  const enrichedRunning = runningSessions.map(s => ({
    ...s,
    displayName: metadata.sessions[s.uuid]?.displayName || s.displayName
  }))

  // Discovered saved sessions with metadata display names
  const savedSessions = discovered
    .filter(d => !runningUuids.has(d.uuid))
    .map(d => ({
      uuid: d.uuid,
      displayName: metadata.sessions[d.uuid]?.displayName || d.uuid.substring(0, 8),
      lifecycle: 'stopped' as const,
      lastActiveAt: metadata.sessions[d.uuid]?.lastActiveAt,
    }))

  return {
    rootPath,
    claudeAvailable: claudePath !== null,
    claudeVersion,
    sessions: [...enrichedRunning, ...savedSessions]
  }
}
