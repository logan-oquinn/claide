import { readFileSync, writeFile, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

interface SessionMeta {
  displayName: string
  color?: string
  order?: number
  lastActiveAt?: string
}

interface WorktreeMeta {
  collapsed?: boolean
}

interface ClaideMetadata {
  version: 1
  sessions: Record<string, SessionMeta>
  worktrees: Record<string, WorktreeMeta>
}

function defaultMetadata(): ClaideMetadata {
  return { version: 1, sessions: {}, worktrees: {} }
}

function metadataPath(rootPath: string): string {
  return join(rootPath, '.claide', 'sessions.json')
}

/**
 * Read .claide/sessions.json from the project root.
 * Returns default metadata if file doesn't exist or can't be parsed.
 */
export function readMetadata(rootPath: string): ClaideMetadata {
  const path = metadataPath(rootPath)
  if (!existsSync(path)) return defaultMetadata()

  try {
    const raw = readFileSync(path, 'utf-8')
    const data = JSON.parse(raw)
    if (data.version !== 1) return defaultMetadata()
    return {
      version: 1,
      sessions: data.sessions || {},
      worktrees: data.worktrees || {}
    }
  } catch {
    return defaultMetadata()
  }
}

/**
 * Write .claide/sessions.json to the project root.
 * Creates the .claide directory if it doesn't exist.
 * Non-blocking — uses async write to avoid freezing the main thread.
 */
export function writeMetadata(rootPath: string, metadata: ClaideMetadata): void {
  const path = metadataPath(rootPath)
  const dir = dirname(path)

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Async write — fire and forget, don't block the UI
  writeFile(path, JSON.stringify(metadata, null, 2), 'utf-8', () => {})
}

/**
 * Get display name for a session from metadata, or null if not set.
 */
export function getSessionDisplayName(metadata: ClaideMetadata, uuid: string): string | null {
  return metadata.sessions[uuid]?.displayName ?? null
}

/**
 * Update a session's display name in metadata.
 */
export function setSessionDisplayName(
  metadata: ClaideMetadata,
  uuid: string,
  displayName: string
): ClaideMetadata {
  return {
    ...metadata,
    sessions: {
      ...metadata.sessions,
      [uuid]: {
        ...metadata.sessions[uuid],
        displayName,
        lastActiveAt: new Date().toISOString()
      }
    }
  }
}

/**
 * Record a session's last active time.
 */
export function touchSession(
  metadata: ClaideMetadata,
  uuid: string,
  displayName: string
): ClaideMetadata {
  return {
    ...metadata,
    sessions: {
      ...metadata.sessions,
      [uuid]: {
        ...metadata.sessions[uuid],
        displayName,
        lastActiveAt: new Date().toISOString()
      }
    }
  }
}
