import { execSync } from 'child_process'

let cachedPath: string | null | undefined

/**
 * Find the absolute path to the Claude CLI executable.
 * node-pty requires a full path — passing just "claude" causes "File not found".
 */
export function findClaudePath(): string | null {
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

/**
 * Get Claude CLI version string, or null if not available.
 */
export function getClaudeVersion(): string | null {
  try {
    return execSync('claude --version', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

/**
 * Clear the cached path (useful if user installs Claude mid-session).
 */
export function clearClaudePathCache(): void {
  cachedPath = undefined
}
