import { useState, useRef, useEffect, useMemo } from 'react'
import type { SessionInfo } from '../../../shared/types'

interface Props {
  session: SessionInfo
  index: number
  isActive: boolean
  onClick: () => void
  onStop?: () => void
  onRename?: (newName: string) => void
}

// Generate a consistent color from a string (uuid)
function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 55%)`
}

// Generate avatar initials from display name
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

export default function SessionCard({ session, index, isActive, onClick, onStop, onRename }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(session.displayName)
  const inputRef = useRef<HTMLInputElement>(null)

  const avatarColor = useMemo(() => hashColor(session.uuid), [session.uuid])
  const initials = useMemo(() => getInitials(session.displayName), [session.displayName])

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

  const status = session.status
  const contextPct = status?.contextPercent ?? 0
  // Color the context bar: green < 50%, yellow 50-80%, red > 80%
  const contextBarColor = contextPct > 80 ? 'var(--red)' : contextPct > 50 ? 'var(--yellow)' : 'var(--accent)'

  return (
    <div
      className={`session-card ${isActive ? 'active' : ''} ${session.lifecycle}`}
      onClick={onClick}
    >
      {/* Top row: avatar + name + stop */}
      <div className="session-card-row">
        <div className="session-avatar" style={{ background: avatarColor }}>
          {initials}
        </div>
        <div className="session-card-info">
          <div className="session-card-header">
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
            {!editing && (
              <div className="session-card-actions">
                {index <= 8 && (
                  <span className="session-index">{index}</span>
                )}
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
            )}
          </div>

          {/* Status row: dot + status text + model + cost */}
          <div className="session-meta">
            <span className={`session-status-dot ${session.lifecycle}`} />
            <span className={`session-status-text ${session.lifecycle}`}>
              {session.lifecycle === 'running' ? 'Idle' : session.lifecycle === 'error' ? 'Error' : 'Stopped'}
            </span>
            {session.lastActiveAt && session.lifecycle !== 'running' && (
              <span className="session-time">{formatRelativeTime(session.lastActiveAt)}</span>
            )}
            {status?.model && (
              <>
                <span className="session-meta-sep" />
                <span className="session-model">{status.model}</span>
              </>
            )}
            {status?.contextTotal && (
              <span className="session-context-text">
                {status.contextTotal >= 1000000
                  ? `${(status.contextTotal / 1000).toFixed(0)}k`
                  : `${(status.contextTotal / 1000).toFixed(0)}k`}
              </span>
            )}
            {status?.cost && (
              <span className="session-cost">{status.cost}</span>
            )}
          </div>
        </div>
      </div>

      {/* Context usage bar — full width at bottom of card */}
      {session.lifecycle === 'running' && (
        <div className="session-context-track">
          <div
            className="session-context-fill"
            style={{
              width: `${Math.max(0.5, contextPct)}%`,
              background: contextBarColor
            }}
          />
        </div>
      )}
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
