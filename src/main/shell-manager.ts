import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { findShellPath } from './lib/which'

/**
 * Manages a single user shell PTY (PowerShell).
 *
 * Events:
 * - 'data' (data: string) — shell output
 * - 'exit' (exitCode: number) — shell exited
 */
export class ShellManager extends EventEmitter {
  private shell: pty.IPty | null = null
  private shellPathOverride: string = ''

  /**
   * Set a user-configured override path for the shell.
   */
  setShellPathOverride(path: string): void {
    this.shellPathOverride = path
  }

  /**
   * Spawn the shell PTY if not already running.
   * Uses pure filesystem PATH search — no child process spawning.
   */
  create(cwd: string): void {
    if (this.shell) return

    const shellCmd = findShellPath(this.shellPathOverride)

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
