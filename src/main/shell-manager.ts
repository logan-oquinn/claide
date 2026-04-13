import * as pty from 'node-pty'
import { execSync } from 'child_process'
import { EventEmitter } from 'events'

/**
 * Manages a single user shell PTY (PowerShell).
 *
 * Events:
 * - 'data' (data: string) — shell output
 * - 'exit' (exitCode: number) — shell exited
 */
export class ShellManager extends EventEmitter {
  private shell: pty.IPty | null = null

  /**
   * Find the best available shell.
   * Order: pwsh → powershell.exe → cmd.exe
   */
  private findShell(): string {
    try {
      execSync('where pwsh', { encoding: 'utf-8' })
      return 'pwsh'
    } catch { /* not found */ }

    try {
      execSync('where powershell', { encoding: 'utf-8' })
      return 'powershell.exe'
    } catch { /* not found */ }

    return process.env.COMSPEC || 'cmd.exe'
  }

  /**
   * Spawn the shell PTY if not already running.
   */
  create(cwd: string): void {
    if (this.shell) return

    const shellCmd = this.findShell()

    this.shell = pty.spawn(shellCmd, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 15,
      cwd,
      env: process.env as Record<string, string>
    })

    this.shell.onData((data: string) => {
      this.emit('data', data)
    })

    this.shell.onExit(({ exitCode }) => {
      this.shell = null
      this.emit('exit', exitCode)
    })
  }

  write(data: string): void {
    this.shell?.write(data)
  }

  resize(cols: number, rows: number): void {
    this.shell?.resize(cols, rows)
  }

  isRunning(): boolean {
    return this.shell !== null
  }

  destroy(): void {
    if (this.shell) {
      this.shell.kill()
      this.shell = null
    }
  }
}
