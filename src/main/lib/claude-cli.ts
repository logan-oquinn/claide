import { existsSync } from 'fs'
import { which } from './which'

let cachedPath: string | null | undefined
let cachedVersion: string | null | undefined
let overridePath: string = ''

/**
 * Set a user-configured override path for the Claude CLI.
 */
export function setClaudePathOverride(path: string): void {
  overridePath = path
  cachedPath = undefined
  cachedVersion = undefined
}

/**
 * Find the absolute path to the Claude CLI executable.
 * Uses pure filesystem PATH search — no child process spawning.
 * node-pty requires a full path; passing just "claude" causes "File not found".
 */
export function findClaudePath(): string | null {
  if (overridePath && existsSync(overridePath)) {
    return overridePath
  }

  if (cachedPath !== undefined) return cachedPath

  cachedPath = which('claude')
  return cachedPath
}

/**
 * Get Claude CLI version string, or null if not available.
 * Cached for app lifetime.
 *
 * Note: We avoid execSync here. Version is read lazily from the first
 * session's terminal output by the status parser instead. This function
 * returns a placeholder until we can parse the real version.
 */
export function getClaudeVersion(): string | null {
  if (cachedVersion !== undefined) return cachedVersion

  // We can't run `claude --version` without spawning a process.
  // Return null — the status parser will extract the version from
  // terminal output once a session is running.
  cachedVersion = null
  return null
}

/**
 * Set the version after it's been parsed from terminal output.
 */
export function setClaudeVersion(version: string): void {
  cachedVersion = version
}

/**
 * Clear all cached values.
 */
export function clearClaudePathCache(): void {
  cachedPath = undefined
  cachedVersion = undefined
}
