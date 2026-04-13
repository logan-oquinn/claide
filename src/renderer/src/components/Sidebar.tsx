import type { ProjectState, SessionInfo } from '../../../shared/types'
import SessionCard from './SessionCard'

interface Props {
  state: ProjectState | null
  activeSessionUuid: string | null
  onSelectSession: (uuid: string) => void
  onNewSession: () => void
  onStopSession: (uuid: string) => void
  onRenameSession: (uuid: string, newName: string) => void
}

export default function Sidebar({ state, activeSessionUuid, onSelectSession, onNewSession, onStopSession, onRenameSession }: Props) {
  const projectName = state?.rootPath.split(/[/\\]/).pop() || 'No project'
  const sessions = state?.sessions || []

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Claide</h1>
        <div className="project-path" title={state?.rootPath}>
          {projectName}
        </div>
      </div>

      <div className="sidebar-sessions">
        {sessions.map((session: SessionInfo) => (
          <SessionCard
            key={session.uuid}
            session={session}
            isActive={session.uuid === activeSessionUuid}
            onClick={() => onSelectSession(session.uuid)}
            onStop={session.lifecycle === 'running' ? () => onStopSession(session.uuid) : undefined}
            onRename={(newName) => onRenameSession(session.uuid, newName)}
          />
        ))}

        {sessions.length === 0 && (
          <div style={{ color: '#505070', fontSize: 12, padding: 12, textAlign: 'center' }}>
            No sessions yet
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button
          className="btn-new-session"
          onClick={onNewSession}
          disabled={!state?.claudeAvailable}
          title={state?.claudeAvailable ? 'Create a new Claude session' : 'Claude CLI not found'}
        >
          + New Session
        </button>
      </div>
    </div>
  )
}
