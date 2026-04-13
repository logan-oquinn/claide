import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TerminalPanel from './components/TerminalPanel'
import ShellPanel from './components/ShellPanel'
import { flatSessions } from '../../shared/types'
import type { ProjectState } from '../../shared/types'
import './styles/global.css'

export default function App() {
  const [state, setState] = useState<ProjectState | null>(null)
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | null>(null)
  const [shellOpen, setShellOpen] = useState(false)

  // Open project on mount
  useEffect(() => {
    window.claide.openProject(window.claide.cwd).then(setState)
    const removeListener = window.claide.onProjectState(setState)
    return removeListener
  }, [])

  // Listen for lifecycle changes
  useEffect(() => {
    const removeListener = window.claide.onSessionLifecycle((event) => {
      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          worktrees: prev.worktrees.map(wt => ({
            ...wt,
            sessions: wt.sessions.map(s =>
              s.uuid === event.uuid
                ? { ...s, lifecycle: event.lifecycle, error: event.error }
                : s
            )
          }))
        }
      })
    })
    return removeListener
  }, [])

  // --- Callbacks (defined before useEffect that references them) ---

  const handleNewSession = useCallback(async (cwd: string) => {
    if (!cwd) return
    const newState = await window.claide.createSession(cwd)
    setState(newState)

    const newRunning = flatSessions(newState).filter(s => s.lifecycle === 'running')
    const newest = newRunning[newRunning.length - 1]
    if (newest) setActiveSessionUuid(newest.uuid)
  }, [])

  const handleSelectSession = useCallback(async (uuid: string) => {
    const session = (state ? flatSessions(state) : []).find(s => s.uuid === uuid)

    if (session && session.lifecycle === 'stopped' && state) {
      const worktree = state.worktrees.find(wt =>
        wt.sessions.some(s => s.uuid === uuid)
      )
      if (worktree) {
        const newState = await window.claide.resumeSession(uuid, worktree.path)
        setState(newState)
      }
    }

    setActiveSessionUuid(uuid)
  }, [state])

  const handleStopSession = useCallback(async (uuid: string) => {
    const newState = await window.claide.stopSession(uuid)
    setState(newState)
  }, [])

  const handleRenameSession = useCallback(async (uuid: string, newName: string) => {
    const newState = await window.claide.renameSession(uuid, newName)
    setState(newState)
  }, [])

  // --- Derived state ---

  const allSessions = state ? flatSessions(state) : []
  const runningSessions = allSessions.filter(s => s.lifecycle === 'running')
  const hasActiveTerminal = runningSessions.some(s => s.uuid === activeSessionUuid)
  const activeSession = allSessions.find(s => s.uuid === activeSessionUuid)

  // --- Keyboard shortcuts (after all callbacks are defined) ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setShellOpen(prev => !prev)
        return
      }

      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (state?.claudeAvailable) {
          const activeWt = state.worktrees.find(wt =>
            wt.sessions.some(s => s.uuid === activeSessionUuid)
          )
          handleNewSession(activeWt?.path || state.rootPath)
        }
        return
      }

      if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        if (index < allSessions.length) {
          setActiveSessionUuid(allSessions[index].uuid)
        }
        return
      }

      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        if (allSessions.length === 0) return
        const currentIdx = allSessions.findIndex(s => s.uuid === activeSessionUuid)
        const next = e.shiftKey
          ? (currentIdx - 1 + allSessions.length) % allSessions.length
          : (currentIdx + 1) % allSessions.length
        setActiveSessionUuid(allSessions[next].uuid)
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, activeSessionUuid, allSessions, handleNewSession])

  return (
    <div className="app-layout">
      <Sidebar
        state={state}
        activeSessionUuid={activeSessionUuid}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onStopSession={handleStopSession}
        onRenameSession={handleRenameSession}
      />

      <div className="main-content">
        {state?.error && (
          <div className="error-banner">{state.error}</div>
        )}

        <div className="terminal-area">
          {runningSessions.map(session => (
            <TerminalPanel
              key={session.uuid}
              sessionUuid={session.uuid}
              visible={session.uuid === activeSessionUuid}
            />
          ))}

          {!hasActiveTerminal && (
            <div className="empty-state">
              {!state ? (
                <span className="empty-state-title">Loading...</span>
              ) : !state.claudeAvailable ? (
                <>
                  <span className="empty-state-title">Claude CLI not found</span>
                  <span className="empty-state-hint">
                    Install Claude Code and ensure &apos;claude&apos; is in your PATH
                  </span>
                </>
              ) : activeSession && activeSession.lifecycle === 'stopped' ? (
                <>
                  <span className="empty-state-title">Session stopped</span>
                  <span className="empty-state-hint">Click to resume or start a new session</span>
                </>
              ) : activeSession && activeSession.lifecycle === 'error' ? (
                <>
                  <span className="empty-state-title" style={{ color: 'var(--red)' }}>Session error</span>
                  <span className="empty-state-hint">{activeSession.error || 'Unknown error'}</span>
                </>
              ) : (
                <>
                  <span className="empty-state-title">No active session</span>
                  <span className="empty-state-hint">Create a new Claude Code session to get started</span>
                  <span className="empty-state-shortcut">Ctrl+N</span>
                </>
              )}
            </div>
          )}
        </div>

        {shellOpen && state?.rootPath && (
          <div className="shell-area">
            <div className="shell-header">
              <div className="shell-header-left">
                <span>Shell</span>
                <span className="shell-type-label">pwsh</span>
              </div>
              <button className="shell-close-btn" onClick={() => setShellOpen(false)}>x</button>
            </div>
            <ShellPanel cwd={state.rootPath} />
          </div>
        )}

        {!shellOpen && (
          <button
            className="shell-toggle-bar"
            onClick={() => setShellOpen(true)}
            title="Toggle shell (Ctrl+`)"
          >
            <span>Shell</span>
            <span className="shell-toggle-hint">Ctrl+`</span>
          </button>
        )}
      </div>
    </div>
  )
}
