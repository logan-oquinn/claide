import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TerminalPanel from './components/TerminalPanel'
import type { ProjectState } from '../../shared/types'
import './styles/global.css'

export default function App() {
  const [state, setState] = useState<ProjectState | null>(null)
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | null>(null)

  // Open project on mount
  useEffect(() => {
    window.claide.openProject(window.claide.cwd).then((projectState) => {
      setState(projectState)
    })

    const removeListener = window.claide.onProjectState((newState) => {
      setState(newState)
    })

    return removeListener
  }, [])

  // Listen for lifecycle changes
  useEffect(() => {
    const removeListener = window.claide.onSessionLifecycle((event) => {
      setState(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sessions: prev.sessions.map(s =>
            s.uuid === event.uuid
              ? { ...s, lifecycle: event.lifecycle, error: event.error }
              : s
          )
        }
      })
    })

    return removeListener
  }, [])

  const handleNewSession = useCallback(async () => {
    if (!state?.rootPath) return
    const newState = await window.claide.createSession(state.rootPath)
    setState(newState)

    // Auto-select the newest running session
    const runningSessions = newState.sessions.filter(s => s.lifecycle === 'running')
    const newest = runningSessions[runningSessions.length - 1]
    if (newest) {
      setActiveSessionUuid(newest.uuid)
    }
  }, [state?.rootPath])

  const handleSelectSession = useCallback((uuid: string) => {
    setActiveSessionUuid(uuid)
  }, [])

  const handleStopSession = useCallback(async (uuid: string) => {
    const newState = await window.claide.stopSession(uuid)
    setState(newState)
  }, [])

  // All sessions that have a live terminal (running or recently stopped with scrollback)
  const runningSessions = state?.sessions.filter(s => s.lifecycle === 'running') || []
  const activeSession = state?.sessions.find(s => s.uuid === activeSessionUuid)
  const hasActiveTerminal = runningSessions.some(s => s.uuid === activeSessionUuid)

  return (
    <div className="app-layout">
      <Sidebar
        state={state}
        activeSessionUuid={activeSessionUuid}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onStopSession={handleStopSession}
      />

      <div className="main-content">
        {state?.error && (
          <div className="error-banner">{state.error}</div>
        )}

        {/* Render all running terminals, show/hide by active uuid */}
        {runningSessions.map(session => (
          <TerminalPanel
            key={session.uuid}
            sessionUuid={session.uuid}
            visible={session.uuid === activeSessionUuid}
          />
        ))}

        {/* Show empty state when no terminal is active */}
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
    </div>
  )
}
