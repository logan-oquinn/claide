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

  const allSessions = state ? flatSessions(state) : []
  const runningSessions = allSessions.filter(s => s.lifecycle === 'running')

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+` — toggle shell
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setShellOpen(prev => !prev)
        return
      }

      // Ctrl+N — new session in the active worktree (or root)
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (state?.claudeAvailable) {
          // Find the worktree of the active session, or use root
          const activeWt = state.worktrees.find(wt =>
            wt.sessions.some(s => s.uuid === activeSessionUuid)
          )
          const cwd = activeWt?.path || state.rootPath
          handleNewSession(cwd)
        }
        return
      }

      // Ctrl+1 through Ctrl+8 — focus session by flat visual index
      if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault()
        const index = parseInt(e.key) - 1
        if (index < allSessions.length) {
          setActiveSessionUuid(allSessions[index].uuid)
        }
        return
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — next/prev session
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

  const handleNewSession = useCallback(async (cwd: string) => {
    if (!cwd) return
    const newState = await window.claide.createSession(cwd)
    setState(newState)

    const newRunning = flatSessions(newState).filter(s => s.lifecycle === 'running')
    const newest = newRunning[newRunning.length - 1]
    if (newest) setActiveSessionUuid(newest.uuid)
  }, [])

  const handleSelectSession = useCallback(async (uuid: string) => {
    const session = allSessions.find(s => s.uuid === uuid)

    // If stopped, find its worktree cwd and resume
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
  }, [allSessions, state])

  const handleStopSession = useCallback(async (uuid: string) => {
    const newState = await window.claide.stopSession(uuid)
    setState(newState)
  }, [])

  const handleRenameSession = useCallback(async (uuid: string, newName: string) => {
    const newState = await window.claide.renameSession(uuid, newName)
    setState(newState)
  }, [])

  const hasActiveTerminal = runningSessions.some(s => s.uuid === activeSessionUuid)
  const activeSession = allSessions.find(s => s.uuid === activeSessionUuid)

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
          {/* Render all running terminals, show/hide by active uuid */}
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
                <span>Loading...</span>
              ) : !state.claudeAvailable ? (
                <>
                  <span>Claude CLI not found</span>
                  <span style={{ fontSize: 12 }}>
                    Install Claude Code and ensure &apos;claude&apos; is in your PATH
                  </span>
                </>
              ) : activeSession && activeSession.lifecycle === 'stopped' ? (
                <span>Session stopped. Click to resume or start a new session.</span>
              ) : activeSession && activeSession.lifecycle === 'error' ? (
                <span style={{ color: '#f87171' }}>
                  Session error: {activeSession.error || 'Unknown error'}
                </span>
              ) : (
                <span>Click &quot;+ New Session&quot; to start</span>
              )}
            </div>
          )}
        </div>

        {/* Shell panel */}
        {shellOpen && state?.rootPath && (
          <div className="shell-area">
            <div className="shell-header">
              <span>Shell</span>
              <button className="shell-close-btn" onClick={() => setShellOpen(false)}>x</button>
            </div>
            <ShellPanel cwd={state.rootPath} />
          </div>
        )}

        {/* Shell toggle bar */}
        {!shellOpen && (
          <button
            className="shell-toggle-bar"
            onClick={() => setShellOpen(true)}
            title="Toggle shell (Ctrl+`)"
          >
            Shell
          </button>
        )}
      </div>
    </div>
  )
}
