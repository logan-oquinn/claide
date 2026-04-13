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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const path = (files[0] as File & { path: string }).path
      if (path) onOpenProject(path)
    }
  }

  return (
    <div
      className="welcome-screen"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="welcome-content">
        <h1 className="welcome-title">Claide</h1>
        <p className="welcome-subtitle">Claude Code session control plane</p>

        <button className="welcome-open-btn" onClick={onPickProject}>
          Open Project
        </button>
        <span className="welcome-shortcut">Ctrl+O or drag a folder here</span>

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
