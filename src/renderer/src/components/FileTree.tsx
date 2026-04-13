import { useState, useEffect, useMemo } from 'react'
import FileTreeItem from './FileTreeItem'
import type { FileTreeEntry } from '../../../shared/types'

interface Props {
  rootPath: string
  onSelectFile: (path: string) => void
  selectedPath: string | null
}

export default function FileTree({ rootPath, onSelectFile, selectedPath }: Props) {
  const [entries, setEntries] = useState<FileTreeEntry[]>([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    window.claide.listDirectory(rootPath, rootPath).then(setEntries)
  }, [rootPath])

  const filtered = useMemo(() => {
    if (!filter) return entries
    const lower = filter.toLowerCase()
    return entries.filter(e =>
      e.name.toLowerCase().includes(lower)
    )
  }, [entries, filter])

  const projectName = rootPath.split(/[/\\]/).pop() || rootPath

  return (
    <div className="file-tree-panel">
      <div className="file-tree-header">
        <h2>{projectName}</h2>
      </div>
      <input
        className="file-tree-filter"
        placeholder="Filter files..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="file-tree-content">
        {filtered.map(entry => (
          <FileTreeItem
            key={entry.path}
            entry={entry}
            depth={0}
            rootPath={rootPath}
            selectedPath={selectedPath}
            onSelectFile={onSelectFile}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '12px', color: 'var(--text-dim)', fontSize: 11, textAlign: 'center' }}>
            {filter ? 'No matches' : 'Empty directory'}
          </div>
        )}
      </div>
    </div>
  )
}
