import { useState, useMemo } from 'react'
import type { ProjectState, WorktreeInfo } from '../../../shared/types'
import WorktreeGroup from './WorktreeGroup'

interface Props {
  state: ProjectState | null
  activeSessionUuid: string | null
  onSelectSession: (uuid: string) => void
  onNewSession: (cwd: string) => void
  onStopSession: (uuid: string) => void
  onRenameSession: (uuid: string, newName: string) => void
  onSwitchProject: () => void
}

export default function Sidebar({
  state, activeSessionUuid, onSelectSession, onNewSession, onStopSession, onRenameSession, onSwitchProject
}: Props) {
  const [showHistory, setShowHistory] = useState(false)

  const projectName = state?.rootPath.split(/[/\\]/).pop() || 'No project'
  const worktrees = state?.worktrees || []
  const showHeaders = state?.isGitRepo && worktrees.length > 0

  // Filter worktrees to only show those with running sessions (unless history is toggled)
  const filteredWorktrees = useMemo((): WorktreeInfo[] => {
    if (showHistory) return worktrees

    return worktrees
      .map(wt => ({
        ...wt,
        sessions: wt.sessions.filter(s => s.lifecycle === 'running')
      }))
      .filter(wt => wt.sessions.length > 0 || !showHeaders)
  }, [worktrees, showHistory, showHeaders])

  // Count total stopped sessions for the toggle label
  const stoppedCount = useMemo(() => {
    return worktrees.reduce((n, wt) => n + wt.sessions.filter(s => s.lifecycle !== 'running').length, 0)
  }, [worktrees])

  // Track cumulative session index for Ctrl+1-8 shortcuts
  let indexOffset = 0

  return (
    <div className="session-panel">
      <div className="session-panel-header">
        <div className="session-panel-title-row">
          <h1>Claide</h1>
          <span
            className={`claude-status-dot ${state?.claudeAvailable ? 'available' : 'unavailable'}`}
            title={state?.claudeAvailable ? 'Claude CLI available' : 'Claude CLI not found'}
          />
          {state?.claudeVersion && (
            <span className="version-pill">{state.claudeVersion.split(' ')[0]}</span>
          )}
        </div>
        <button
          className="project-path-btn"
          onClick={onSwitchProject}
          title={`${state?.rootPath}\nClick to switch project (Ctrl+O)`}
        >
          {projectName} <span className="project-switch-hint">{'\u25BE'}</span>
        </button>
      </div>

      <div className="session-panel-sessions">
        {filteredWorktrees.map((wt) => {
          const offset = indexOffset
          indexOffset += wt.sessions.length
          return (
            <WorktreeGroup
              key={wt.path}
              worktree={wt}
              activeSessionUuid={activeSessionUuid}
              sessionIndexOffset={offset}
              onSelectSession={onSelectSession}
              onStopSession={onStopSession}
              onRenameSession={onRenameSession}
              onNewSession={onNewSession}
              showHeader={!!showHeaders}
            />
          )
        })}

        {filteredWorktrees.length === 0 && !showHistory && (
          <div className="session-panel-empty">
            No active sessions
          </div>
        )}

        {filteredWorktrees.length === 0 && showHistory && (
          <div className="session-panel-empty">
            No sessions yet
          </div>
        )}
      </div>

      <div className="session-panel-footer">
        {stoppedCount > 0 && (
          <button
            className="btn-history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide' : 'Show'} session history ({stoppedCount})
          </button>
        )}
        <button
          className="btn-new-session"
          onClick={() => onNewSession(state?.rootPath || '')}
          disabled={!state?.claudeAvailable}
          title={state?.claudeAvailable ? 'New session (Ctrl+N)' : 'Claude CLI not found'}
        >
          + New Session
        </button>
      </div>
    </div>
  )
}
