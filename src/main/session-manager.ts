import * as pty from 'node-pty'
import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { findClaudePath } from './lib/claude-cli'
import type { SessionInfo, SessionLifecycle } from '../shared/types'

const STOP_TIMEOUT_MS = 5000

interface ManagedSession {
  uuid: string
  displayName: string
  lifecycle: SessionLifecycle
  pty: pty.IPty | null
  cwd: string
  error?: string
}

/**
 * Manages Claude Code PTY sessions in the main process.
 *
 * Events emitted:
 * - 'data' (uuid: string, data: string) — terminal output
 * - 'lifecycle' (uuid: string, lifecycle: SessionLifecycle, error?: string) — state change
 */
export class SessionManager extends EventEmitter {
  private sessions = new Map<string, ManagedSession>()

  /**
   * Create and spawn a new Claude session.
   */
  create(cwd: string, name?: string): SessionInfo {
    const claudePath = findClaudePath()
    if (!claudePath) {
      throw new Error('Claude CLI not found. Install Claude Code and ensure it is in your PATH.')
    }

    const uuid = randomUUID()
    const displayName = name || `Session ${this.sessions.size + 1}`

    const args: string[] = ['--name', displayName]

    const ptyProcess = pty.spawn(claudePath, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd,
      env: process.env as Record<string, string>
    })

    const session: ManagedSession = {
      uuid,
      displayName,
      lifecycle: 'running',
      pty: ptyProcess,
      cwd
    }

    ptyProcess.onData((data: string) => {
      this.emit('data', uuid, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      // -1073741510 (0xC000013A) is STATUS_CONTROL_C_EXIT on Windows — normal kill
      const isNormalExit = exitCode === 0 || exitCode === -1073741510
      session.lifecycle = isNormalExit ? 'stopped' : 'error'
      session.pty = null
      if (!isNormalExit) {
        session.error = `Process exited with code ${exitCode}`
      }
      this.emit('lifecycle', uuid, session.lifecycle, session.error)
    })

    this.sessions.set(uuid, session)
    this.emit('lifecycle', uuid, 'running')

    return this.toSessionInfo(session)
  }

  /**
   * Write keyboard input to a session's PTY.
   */
  write(uuid: string, data: string): void {
    const session = this.sessions.get(uuid)
    if (session?.pty) {
      session.pty.write(data)
    }
  }

  /**
   * Resize a session's PTY.
   */
  resize(uuid: string, cols: number, rows: number): void {
    const session = this.sessions.get(uuid)
    if (session?.pty) {
      session.pty.resize(cols, rows)
    }
  }

  /**
   * Stop a session using staged shutdown: /exit → wait → force-kill.
   */
  async stop(uuid: string): Promise<void> {
    const session = this.sessions.get(uuid)
    if (!session?.pty) return

    const ptyRef = session.pty

    // Stage 1: Try graceful exit
    ptyRef.write('/exit\r')

    // Stage 2: Wait for process to exit, or force-kill after timeout
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        if (session.pty) {
          session.pty.kill()
        }
        resolve()
      }, STOP_TIMEOUT_MS)

      ptyRef.onExit(() => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  /**
   * Get info for all sessions.
   */
  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(s => this.toSessionInfo(s))
  }

  /**
   * Get info for a single session.
   */
  getSession(uuid: string): SessionInfo | undefined {
    const session = this.sessions.get(uuid)
    return session ? this.toSessionInfo(session) : undefined
  }

  /**
   * Kill all active PTYs (for app shutdown).
   */
  destroyAll(): void {
    for (const session of this.sessions.values()) {
      if (session.pty) {
        session.pty.kill()
        session.pty = null
      }
    }
  }

  private toSessionInfo(session: ManagedSession): SessionInfo {
    return {
      uuid: session.uuid,
      displayName: session.displayName,
      lifecycle: session.lifecycle,
      lastActiveAt: new Date().toISOString(),
      error: session.error
    }
  }
}
