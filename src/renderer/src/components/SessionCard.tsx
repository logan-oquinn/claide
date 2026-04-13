import type { SessionInfo } from '../../../shared/types'

interface Props {
  session: SessionInfo
  isActive: boolean
  onClick: () => void
}

export default function SessionCard({ session, isActive, onClick }: Props) {
  return (
    <div
      className={`session-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="session-name">{session.displayName}</div>
      <div className="session-meta">
        <span className={`session-badge ${session.lifecycle}`}>
          {session.lifecycle}
        </span>
      </div>
    </div>
  )
}
