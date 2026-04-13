import type { ProjectState } from '../../../shared/types'
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
  const projectName = state?.rootPath.split(/[/\\]/).pop() || 'No project'
  const worktrees = state?.worktrees || []
  const showHeaders = state?.isGitRepo && worktrees.length > 0

  // Track cumulative session index for Ctrl+1-8 shortcuts
  let indexOffset = 0

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
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
          {projectName} <span className="project-switch-hint">\u25BE</span>
        </button>
      </div>

      <div className="sidebar-sessions">
        {worktrees.map((wt) => {
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

        {worktrees.length === 0 && (
          <div className="worktree-empty" style={{ padding: 16, textAlign: 'center' }}>
            No sessions yet
          </div>
        )}
      </div>

      <div className="sidebar-footer">
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
