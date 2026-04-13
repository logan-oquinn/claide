import { useState, useEffect } from 'react'
import type { RecentProject } from '../../../shared/types'

interface Props {
  onOpenProject: (path: string) => void
  onPickProject: () => void
}

export default function WelcomeScreen({ onOpenProject, onPickProject }: Props) {
  const [recent, setRecent] = useState<RecentProject[]>([])

  useEffect(() => {
    window.claide.getRecentProjects().then(setRecent)
  }, [])

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">Claide</h1>
        <p className="welcome-subtitle">Claude Code session control plane</p>

        <button className="welcome-open-btn" onClick={onPickProject}>
          Open Project
        </button>
        <span className="welcome-shortcut">Ctrl+O</span>

        {recent.length > 0 && (
          <div className="welcome-recent">
            <h3 className="welcome-recent-title">Recent Projects</h3>
            {recent.map((project) => (
              <button
                key={project.path}
                className="welcome-recent-item"
                onClick={() => onOpenProject(project.path)}
                title={project.path}
              >
                <span className="welcome-recent-name">{project.name}</span>
                <span className="welcome-recent-path">{project.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
