import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import FileTree from './components/FileTree'
import FilePreview from './components/FilePreview'
import TerminalPanel from './components/TerminalPanel'
import ShellPanel from './components/ShellPanel'
import WelcomeScreen from './components/WelcomeScreen'
import SettingsPanel from './components/SettingsPanel'
import { flatSessions } from '../../shared/types'
import type { ProjectState } from '../../shared/types'
import './styles/global.css'

export default function App() {
  const [state, setState] = useState<ProjectState | null>(null)
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | null>(null)
  const [shellOpen, setShellOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null)

  // On mount: check for default project path, auto-open if set
  useEffect(() => {
    window.claide.getSettings().then(settings => {
      if (settings.defaultProjectPath) {
        window.claide.openProject(settings.defaultProjectPath).then(setState)
      }
    })
  }, [])

  // Listen for project state updates
  useEffect(() => {
    const removeListener = window.claide.onProjectState(setState)
    return removeListener
  }, [])

  // Listen for menu events from main process
  useEffect(() => {
    const cleanups = [
      window.claide.onMenuEvent('menu:settings', () => setSettingsOpen(true)),
      window.claide.onMenuEvent('menu:open-project', () => pickAndOpenProject()),
      window.claide.onMenuEvent('menu:close-project', () => { setState(null); setActiveSessionUuid(null); setShellOpen(false) }),
      window.claide.onMenuEvent('menu:toggle-shell', () => setShellOpen(prev => !prev)),
    ]
    return () => cleanups.forEach(fn => fn())
  }, []) // pickAndOpenProject is stable (useCallback with [openProject])

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

  // --- Project management ---

  const openProject = useCallback(async (path: string) => {
    const projectState = await window.claide.openProject(path)
    setState(projectState)
    setActiveSessionUuid(null)
    setShellOpen(false)
  }, [])

  const pickAndOpenProject = useCallback(async () => {
    const path = await window.claide.pickProject()
    if (path) openProject(path)
  }, [openProject])

  // --- Session callbacks ---

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

  // --- Keyboard shortcuts ---

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+O — open project
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        pickAndOpenProject()
        return
      }

      // Ctrl+, — toggle settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(prev => !prev)
        return
      }

      // Ctrl+` — toggle shell
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        setShellOpen(prev => !prev)
        return
      }

      // Only session shortcuts when a project is open
      if (!state) return

      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        if (state.claudeAvailable) {
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
  }, [state, activeSessionUuid, allSessions, handleNewSession, pickAndOpenProject])

  // --- Welcome screen (no project open) ---

  if (!state) {
    return (
      <>
        <WelcomeScreen onOpenProject={openProject} onPickProject={pickAndOpenProject} />
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </>
    )
  }

  // --- Main app layout: [FileTree] [Terminal] [Sessions] ---

  return (
    <div className="app-layout">
      {/* Left: File Tree */}
      <FileTree
        rootPath={state.rootPath}
        selectedPath={previewFilePath}
        onSelectFile={setPreviewFilePath}
      />

      {/* Center: Terminal + Shell (+ File Preview side by side) */}
      <div className="main-content">
        {state.error && (
          <div className="error-banner">{state.error}</div>
        )}

        <div className={`main-split ${previewFilePath ? 'has-preview' : ''}`}>
          {previewFilePath && (
            <FilePreview
              filePath={previewFilePath}
              onClose={() => setPreviewFilePath(null)}
            />
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
              {!state.claudeAvailable ? (
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
        </div>{/* end main-split */}

        {shellOpen && state.rootPath && (
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

      {/* Right: Session Panel */}
      <Sidebar
        state={state}
        activeSessionUuid={activeSessionUuid}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onStopSession={handleStopSession}
        onRenameSession={handleRenameSession}
        onSwitchProject={pickAndOpenProject}
      />

      {settingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
