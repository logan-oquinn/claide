import type { SessionInfo } from '../../../shared/types'

interface Props {
  session: SessionInfo
  isActive: boolean
  onClick: () => void
  onStop?: () => void
}

export default function SessionCard({ session, isActive, onClick, onStop }: Props) {
  return (
    <div
      className={`session-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="session-card-header">
        <div className="session-name">{session.displayName}</div>
        {onStop && (
          <button
            className="session-stop-btn"
            onClick={(e) => { e.stopPropagation(); onStop() }}
            title="Stop session"
          >
            x
          </button>
        )}
      </div>
      <div className="session-meta">
        <span className={`session-badge ${session.lifecycle}`}>
          {session.lifecycle}
        </span>
        {session.error && (
          <span className="session-error-hint" title={session.error}>
            !
          </span>
        )}
      </div>
    </div>
  )
}
