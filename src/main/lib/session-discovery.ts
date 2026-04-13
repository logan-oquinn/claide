import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { encodePath } from './path-encoding'

export interface DiscoveredSession {
  uuid: string
  namespacePath: string
}

/**
 * Get the Claude projects directory (~/.claude/projects/).
 */
export function getClaudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects')
}

/**
 * Discover all Claude sessions for a given working directory.
 * Scans ~/.claude/projects/<encoded-cwd>/ for *.jsonl files.
 * Each JSONL filename (minus extension) is a session UUID.
 */
export function discoverSessions(cwd: string): DiscoveredSession[] {
  const projectsDir = getClaudeProjectsDir()
  const namespace = encodePath(cwd)
  const namespacePath = join(projectsDir, namespace)

  if (!existsSync(namespacePath) || !statSync(namespacePath).isDirectory()) {
    return []
  }

  return readdirSync(namespacePath)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      uuid: f.replace('.jsonl', ''),
      namespacePath
    }))
}

/**
 * Read the first line of a session JSONL file to extract the sessionId.
 * Returns null if file can't be read or parsed.
 */
export function readSessionId(jsonlPath: string): string | null {
  try {
    const firstLine = readFileSync(jsonlPath, 'utf-8').split('\n')[0]
    const record = JSON.parse(firstLine)
    return record.sessionId ?? null
  } catch {
    return null
  }
}
