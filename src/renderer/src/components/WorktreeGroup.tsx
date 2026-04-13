import { useState } from 'react'
import type { WorktreeInfo, SessionInfo } from '../../../shared/types'
import SessionCard from './SessionCard'

interface Props {
  worktree: WorktreeInfo
  activeSessionUuid: string | null
  sessionIndexOffset: number
  onSelectSession: (uuid: string) => void
  onStopSession: (uuid: string) => void
  onRenameSession: (uuid: string, newName: string) => void
  onNewSession: (cwd: string) => void
  showHeader: boolean
}

export default function WorktreeGroup({
  worktree,
  activeSessionUuid,
  sessionIndexOffset,
  onSelectSession,
  onStopSession,
  onRenameSession,
  onNewSession,
  showHeader,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const label = worktree.branch || '(detached)'
  const pathLabel = worktree.path.split(/[/\\]/).pop() || worktree.path
  const sessionCount = worktree.sessions.length

  return (
    <div className="worktree-group">
      {showHeader && (
        <div
          className={`worktree-header ${worktree.isMainCheckout ? 'main' : ''}`}
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className={`worktree-chevron ${collapsed ? 'collapsed' : ''}`}>{'\u25bc'}</span>
          <span className="worktree-branch">{label}</span>
          {sessionCount > 0 && (
            <span className="worktree-count">{sessionCount}</span>
          )}
          {worktree.isPrunable && <span className="worktree-warn" title="Prunable">!</span>}
          {worktree.isLocked && <span className="worktree-lock" title="Locked">L</span>}
          <span className="worktree-path" title={worktree.path}>{pathLabel}</span>
          <button
            className="worktree-add-btn"
            onClick={(e) => { e.stopPropagation(); onNewSession(worktree.path) }}
            title="New session in this worktree"
          >
            +
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="worktree-sessions">
          {worktree.sessions.map((session: SessionInfo, i: number) => (
            <SessionCard
              key={session.uuid}
              session={session}
              index={sessionIndexOffset + i + 1}
              isActive={session.uuid === activeSessionUuid}
              onClick={() => onSelectSession(session.uuid)}
              onStop={session.lifecycle === 'running' ? () => onStopSession(session.uuid) : undefined}
              onRename={(newName) => onRenameSession(session.uuid, newName)}
            />
          ))}
          {worktree.sessions.length === 0 && showHeader && (
            <div className="worktree-empty">no sessions</div>
          )}
        </div>
      )}
    </div>
  )
}
