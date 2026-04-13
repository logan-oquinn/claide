import { execSync } from 'child_process'
import { existsSync } from 'fs'

let cachedPath: string | null | undefined
let overridePath: string = ''

/**
 * Set a user-configured override path for the Claude CLI.
 * If set to a non-empty valid path, findClaudePath() returns it instead of auto-detecting.
 */
export function setClaudePathOverride(path: string): void {
  overridePath = path
  cachedPath = undefined // clear cache so next call re-evaluates
}

/**
 * Find the absolute path to the Claude CLI executable.
 * node-pty requires a full path — passing just "claude" causes "File not found".
 */
export function findClaudePath(): string | null {
  // User override takes priority
  if (overridePath && existsSync(overridePath)) {
    return overridePath
  }

  if (cachedPath !== undefined) return cachedPath

  try {
    const result = execSync('where claude', { encoding: 'utf-8' }).trim()
    cachedPath = result.split('\n')[0].trim()
    return cachedPath
  } catch {
    cachedPath = null
    return null
  }
}

let cachedVersion: string | null | undefined

/**
 * Get Claude CLI version string, or null if not available.
 * Cached for app lifetime — version doesn't change mid-session.
 */
export function getClaudeVersion(): string | null {
  if (cachedVersion !== undefined) return cachedVersion

  try {
    const claudePath = findClaudePath()
    if (!claudePath) { cachedVersion = null; return null }
    cachedVersion = execSync(`"${claudePath}" --version`, { encoding: 'utf-8' }).trim()
    return cachedVersion
  } catch {
    cachedVersion = null
    return null
  }
}

/**
 * Clear all cached values (useful if user changes settings).
 */
export function clearClaudePathCache(): void {
  cachedPath = undefined
  cachedVersion = undefined
}
