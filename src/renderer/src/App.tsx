import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TerminalPanel from './components/TerminalPanel'
import type { ProjectState } from '../../shared/types'
import './styles/global.css'

export default function App() {
  const [state, setState] = useState<ProjectState | null>(null)
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | null>(null)

  // Open project on mount (use cwd passed from main or default)
  useEffect(() => {
    // Open the current working directory as the project root
    window.claide.openProject(process.cwd()).then((projectState) => {
      setState(projectState)
    })

    // Listen for state updates from main process
    const removeListener = window.claide.onProjectState((newState) => {
      setState(newState)
    })

    return removeListener
  }, [])

  // Listen for lifecycle changes to update active session
  useEffect(() => {
    const removeListener = window.claide.onSessionLifecycle((event) => {
      // If the active session errored or stopped, we keep it selected
      // so the user can see the scrollback
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

    // Auto-select the newly created running session
    const newSession = newState.sessions.find(s => s.lifecycle === 'running')
    if (newSession) {
      setActiveSessionUuid(newSession.uuid)
    }
  }, [state?.rootPath])

  const handleSelectSession = useCallback((uuid: string) => {
    setActiveSessionUuid(uuid)
  }, [])

  const activeSession = state?.sessions.find(s => s.uuid === activeSessionUuid)

  return (
    <div className="app-layout">
      <Sidebar
        state={state}
        activeSessionUuid={activeSessionUuid}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      <div className="main-content">
        {state?.error && (
          <div className="error-banner">{state.error}</div>
        )}

        {activeSession && activeSession.lifecycle === 'running' ? (
          <TerminalPanel
            key={activeSessionUuid!}
            sessionUuid={activeSessionUuid!}
          />
        ) : (
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
              <span>Session stopped. Click &quot;+ New Session&quot; to start a new one.</span>
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
