import { existsSync } from 'fs'
import { join } from 'path'

/**
 * Find an executable on PATH without spawning a child process.
 * Replaces execSync('where <name>') which triggers EDR alerts.
 */
export function which(name: string): string | null {
  const pathEnv = process.env.PATH || process.env.Path || ''
  const pathExt = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';')
  const dirs = pathEnv.split(';')

  for (const dir of dirs) {
    if (!dir) continue

    // Try exact name first (if it already has an extension)
    const exact = join(dir, name)
    if (existsSync(exact)) return exact

    // Try each PATHEXT extension
    for (const ext of pathExt) {
      const withExt = join(dir, name + ext.toLowerCase())
      if (existsSync(withExt)) return withExt
      // Also try original case
      const withExtOrig = join(dir, name + ext)
      if (existsSync(withExtOrig)) return withExtOrig
    }
  }

  return null
}

/**
 * Known default paths for common Windows shells.
 * Checked as fallback if PATH search fails.
 */
const KNOWN_SHELL_PATHS = [
  // PowerShell 7+
  'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
  // Windows PowerShell
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  // cmd
  'C:\\Windows\\System32\\cmd.exe',
]

/**
 * Find the best available shell without spawning any child processes.
 */
export function findShellPath(override?: string): string {
  if (override && existsSync(override)) return override

  // Search PATH for pwsh first, then powershell
  const pwsh = which('pwsh')
  if (pwsh) return pwsh

  const ps = which('powershell')
  if (ps) return ps

  // Fallback to known paths
  for (const p of KNOWN_SHELL_PATHS) {
    if (existsSync(p)) return p
  }

  return process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe'
}
