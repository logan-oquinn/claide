import { useState, useRef, useEffect } from 'react'
import type { SessionInfo } from '../../../shared/types'

interface Props {
  session: SessionInfo
  index: number
  isActive: boolean
  onClick: () => void
  onStop?: () => void
  onRename?: (newName: string) => void
}

export default function SessionCard({ session, index, isActive, onClick, onStop, onRename }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commitRename = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== session.displayName && onRename) {
      onRename(trimmed)
    }
    setEditing(false)
  }

  const lifecycleClass = session.lifecycle

  return (
    <div
      className={`session-card ${isActive ? 'active' : ''} ${lifecycleClass}`}
      onClick={onClick}
    >
      <div className="session-card-header">
        {index <= 8 && (
          <span className="session-index">{index}</span>
        )}
        {editing ? (
          <input
            ref={inputRef}
            className="session-rename-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setEditing(false)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="session-name"
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditValue(session.displayName)
              setEditing(true)
            }}
            title={`${session.displayName} (double-click to rename)`}
          >
            {session.displayName}
          </div>
        )}
        {onStop && !editing && (
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
        <span className={`session-status-dot ${session.lifecycle}`} />
        {session.lifecycle === 'running' && (
          <span className="session-status-label">running</span>
        )}
        {session.lastActiveAt && session.lifecycle === 'stopped' && (
          <span className="session-time">{formatRelativeTime(session.lastActiveAt)}</span>
        )}
        {session.error && (
          <span className="session-error-hint" title={session.error}>error</span>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
