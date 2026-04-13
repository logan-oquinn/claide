import type { ProjectState } from '../../../shared/types'
import WorktreeGroup from './WorktreeGroup'

interface Props {
  state: ProjectState | null
  activeSessionUuid: string | null
  onSelectSession: (uuid: string) => void
  onNewSession: (cwd: string) => void
  onStopSession: (uuid: string) => void
  onRenameSession: (uuid: string, newName: string) => void
}

export default function Sidebar({
  state, activeSessionUuid, onSelectSession, onNewSession, onStopSession, onRenameSession
}: Props) {
  const projectName = state?.rootPath.split(/[/\\]/).pop() || 'No project'
  const worktrees = state?.worktrees || []
  const showHeaders = state?.isGitRepo && worktrees.length > 0

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Claide</h1>
        <div className="project-path" title={state?.rootPath}>
          {projectName}
          {state?.claudeVersion && (
            <span className="claude-version"> | {state.claudeVersion}</span>
          )}
        </div>
      </div>

      <div className="sidebar-sessions">
        {worktrees.map((wt) => (
          <WorktreeGroup
            key={wt.path}
            worktree={wt}
            activeSessionUuid={activeSessionUuid}
            onSelectSession={onSelectSession}
            onStopSession={onStopSession}
            onRenameSession={onRenameSession}
            onNewSession={onNewSession}
            showHeader={!!showHeaders}
          />
        ))}

        {worktrees.length === 0 && (
          <div style={{ color: '#505070', fontSize: 12, padding: 12, textAlign: 'center' }}>
            No sessions yet
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn-new-session"
          onClick={() => onNewSession(state?.rootPath || '')}
          disabled={!state?.claudeAvailable}
          title={state?.claudeAvailable ? 'Create a new Claude session' : 'Claude CLI not found'}
        >
          + New Session
        </button>
      </div>
    </div>
  )
}
