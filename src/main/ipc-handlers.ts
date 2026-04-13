import { ipcMain, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { SessionManager } from './session-manager'
import { findClaudePath, getClaudeVersion } from './lib/claude-cli'
import { discoverSessions } from './lib/session-discovery'
import { discoverWorktrees, isGitRepo } from './lib/worktree-discovery'
import { encodePath, normalizeGitPath } from './lib/path-encoding'
import { readMetadata, writeMetadata, setSessionDisplayName, touchSession } from './lib/claide-store'
import { IPC } from '../shared/types'
import type {
  ProjectState,
  WorktreeInfo,
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

  // Forward session events to renderer
  sessionManager.on('data', (uuid: string, data: string) => {
    sendToRenderer(IPC.SESSION_DATA, { uuid, data })
  })

  sessionManager.on('lifecycle', (uuid: string, lifecycle: string, error?: string) => {
    sendToRenderer(IPC.SESSION_LIFECYCLE, { uuid, lifecycle, error })
    sendToRenderer(IPC.PROJECT_STATE, buildProjectState(sessionManager, currentRootPath, currentMetadata))
  })

  // project:open
  ipcMain.handle(IPC.PROJECT_OPEN, (_event, rootPath: string): ProjectState => {
    currentRootPath = rootPath
    currentMetadata = readMetadata(rootPath)

    if (!existsSync(rootPath)) {
      return {
        rootPath,
        claudeAvailable: false,
        isGitRepo: false,
        worktrees: [],
        error: `Directory not found: ${rootPath}`
      }
    }

    return buildProjectState(sessionManager, rootPath, currentMetadata)
  })

  // session:create
  ipcMain.handle(IPC.SESSION_CREATE, (_event, payload: SessionCreatePayload): ProjectState => {
    try {
      const info = sessionManager.create(payload.cwd, payload.name)
      currentMetadata = touchSession(currentMetadata, info.uuid, info.displayName)
      saveMetadata()
    } catch (err) {
      return {
        rootPath: currentRootPath,
        claudeAvailable: false,
        isGitRepo: isGitRepo(currentRootPath),
        worktrees: [],
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })

  // session:resume
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
        isGitRepo: isGitRepo(currentRootPath),
        worktrees: [],
        error: err instanceof Error ? err.message : String(err)
      }
    }
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })

  // session:input
  ipcMain.on(IPC.SESSION_INPUT, (_event, payload: SessionInputPayload) => {
    sessionManager.write(payload.uuid, payload.data)
  })

  // session:resize
  ipcMain.on(IPC.SESSION_RESIZE, (_event, payload: SessionResizePayload) => {
    sessionManager.resize(payload.uuid, payload.cols, payload.rows)
  })

  // session:stop
  ipcMain.handle(IPC.SESSION_STOP, async (_event, payload: SessionStopPayload): Promise<ProjectState> => {
    await sessionManager.stop(payload.uuid)
    return buildProjectState(sessionManager, currentRootPath, currentMetadata)
  })

  // session:rename
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
  const gitRepo = isGitRepo(rootPath)

  // Discover worktrees (or just the root if not a git repo)
  const rawWorktrees = gitRepo ? discoverWorktrees(rootPath) : []

  // Build worktree list — if not git, treat root as a single "worktree"
  const worktreePaths = rawWorktrees.length > 0
    ? rawWorktrees
    : [{ path: rootPath, head: '', branch: null, isDetached: false, isPrunable: false, isLocked: false }]

  const runningSessions = sessionManager.listSessions()
  const runningByCwd = new Map<string, typeof runningSessions>()
  for (const s of runningSessions) {
    const session = sessionManager.getSession(s.uuid)
    // Group running sessions by their cwd (which maps to a worktree)
    // For now, new sessions use the worktree path as cwd
    const cwd = s.uuid // We need the actual cwd — let's use a different approach
  }

  // Simpler approach: for each worktree, compute namespace and find sessions
  const worktrees: WorktreeInfo[] = worktreePaths.map((wt, index) => {
    const normalizedPath = wt.path.replace(/\//g, '\\')
    const namespace = encodePath(normalizedPath)

    // Discover saved sessions for this worktree's namespace
    const discovered = discoverSessions(normalizedPath)
    const runningUuids = new Set(runningSessions.map(s => s.uuid))

    // Get running sessions that belong to this worktree
    // (sessions created with this worktree's path as cwd)
    const runningForWorktree = runningSessions.filter(s => {
      // Check if this session was created/resumed in this worktree
      const sessionMgr = sessionManager as SessionManager & { sessions?: Map<string, { cwd: string }> }
      // Access internal cwd through the session info — we'll match by discovered namespace
      return discovered.some(d => d.uuid === s.uuid)
    })

    // Saved sessions not currently running
    const savedSessions = discovered
      .filter(d => !runningUuids.has(d.uuid))
      .map(d => ({
        uuid: d.uuid,
        displayName: metadata.sessions[d.uuid]?.displayName || d.uuid.substring(0, 8),
        lifecycle: 'stopped' as const,
        lastActiveAt: metadata.sessions[d.uuid]?.lastActiveAt,
      }))

    // Enriched running sessions
    const enrichedRunning = runningForWorktree.map(s => ({
      ...s,
      displayName: metadata.sessions[s.uuid]?.displayName || s.displayName,
    }))

    return {
      path: normalizedPath,
      branch: wt.branch,
      isMainCheckout: index === 0,
      isPrunable: wt.isPrunable,
      isLocked: wt.isLocked,
      sessions: [...enrichedRunning, ...savedSessions],
    }
  })

  // Any running sessions not matched to a worktree go into the first worktree
  const allMatchedUuids = new Set(worktrees.flatMap(wt => wt.sessions.map(s => s.uuid)))
  const unmatchedRunning = runningSessions
    .filter(s => !allMatchedUuids.has(s.uuid))
    .map(s => ({
      ...s,
      displayName: metadata.sessions[s.uuid]?.displayName || s.displayName,
    }))
  if (unmatchedRunning.length > 0 && worktrees.length > 0) {
    worktrees[0].sessions.push(...unmatchedRunning)
  }

  return {
    rootPath,
    claudeAvailable: claudePath !== null,
    claudeVersion,
    isGitRepo: gitRepo,
    worktrees,
  }
}
