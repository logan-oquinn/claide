import * as pty from 'node-pty'
import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import { findClaudePath, setClaudeVersion } from './lib/claude-cli'
import { parseStatusBar } from './lib/status-adapter'
import type { SessionInfo, SessionLifecycle, ParsedStatus } from '../shared/types'

const STOP_TIMEOUT_MS = 5000
const OUTPUT_BUFFER_SIZE = 3000

interface ManagedSession {
  uuid: string
  displayName: string
  lifecycle: SessionLifecycle
  pty: pty.IPty | null
  cwd: string
  error?: string
  outputBuffer: string
  parsedStatus: ParsedStatus | null
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
      cwd,
      outputBuffer: '',
      parsedStatus: null
    }

    ptyProcess.onData((data: string) => {
      this.emit('data', uuid, data)
      this.updateStatusBuffer(session, data)
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
   * Resume an existing Claude session by UUID.
   * Spawns `claude --resume <uuid>` with the original cwd.
   */
  resume(uuid: string, cwd: string, displayName?: string): SessionInfo {
    const claudePath = findClaudePath()
    if (!claudePath) {
      throw new Error('Claude CLI not found. Install Claude Code and ensure it is in your PATH.')
    }

    // If already running, just return its info
    const existing = this.sessions.get(uuid)
    if (existing?.lifecycle === 'running') {
      return this.toSessionInfo(existing)
    }

    const args: string[] = ['--resume', uuid]

    const ptyProcess = pty.spawn(claudePath, args, {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd,
      env: process.env as Record<string, string>
    })

    const session: ManagedSession = {
      uuid,
      displayName: displayName || existing?.displayName || uuid.substring(0, 8),
      lifecycle: 'running',
      pty: ptyProcess,
      cwd,
      outputBuffer: '',
      parsedStatus: null
    }

    ptyProcess.onData((data: string) => {
      this.emit('data', uuid, data)
      this.updateStatusBuffer(session, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
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

  /**
   * Accumulate terminal output and parse status bar.
   * Keeps a rolling buffer of the last N bytes per session.
   */
  private updateStatusBuffer(session: ManagedSession, data: string): void {
    session.outputBuffer += data
    if (session.outputBuffer.length > OUTPUT_BUFFER_SIZE) {
      session.outputBuffer = session.outputBuffer.slice(-OUTPUT_BUFFER_SIZE)
    }

    const parsed = parseStatusBar(session.outputBuffer)
    if (parsed) {
      session.parsedStatus = parsed
      // Cache the version globally so the sidebar can show it
      if (parsed.version) {
        setClaudeVersion(parsed.version)
      }
    }
  }

  private toSessionInfo(session: ManagedSession): SessionInfo {
    return {
      uuid: session.uuid,
      displayName: session.displayName,
      lifecycle: session.lifecycle,
      lastActiveAt: new Date().toISOString(),
      error: session.error,
      status: session.parsedStatus ?? undefined
    }
  }
}
