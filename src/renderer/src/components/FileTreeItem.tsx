import { useState, useCallback } from 'react'
import type { FileTreeEntry } from '../../../shared/types'

interface Props {
  entry: FileTreeEntry
  depth: number
  rootPath: string
  selectedPath: string | null
  onSelectFile: (path: string) => void
}

export default function FileTreeItem({ entry, depth, rootPath, selectedPath, onSelectFile }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<FileTreeEntry[] | null>(null)
  const [loading, setLoading] = useState(false)

  const isSelected = entry.path === selectedPath

  const handleClick = useCallback(async () => {
    if (entry.isDirectory) {
      if (!expanded && children === null) {
        setLoading(true)
        const items = await window.claide.listDirectory(entry.path, rootPath)
        setChildren(items)
        setLoading(false)
      }
      setExpanded(!expanded)
    } else {
      onSelectFile(entry.path)
    }
  }, [entry, expanded, children, rootPath, onSelectFile])

  const gitClass = entry.gitStatus || ''

  return (
    <>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} ${entry.isDirectory ? 'directory' : ''} ${gitClass}`}
        onClick={handleClick}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {entry.isDirectory ? (
          <span className="file-tree-icon folder">
            {loading ? '\u00b7' : expanded ? '\u25bc' : '\u25b6'}
          </span>
        ) : (
          <span className="file-tree-icon">{getFileIcon(entry.name)}</span>
        )}
        <span className="file-tree-name">{entry.name}</span>
      </div>
      {expanded && children && children.map(child => (
        <FileTreeItem
          key={child.path}
          entry={child}
          depth={depth + 1}
          rootPath={rootPath}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </>
  )
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts': case 'tsx': return 'TS'
    case 'js': case 'jsx': return 'JS'
    case 'json': return '{}'
    case 'md': return 'M'
    case 'css': return '#'
    case 'html': return '<>'
    case 'yml': case 'yaml': return 'Y'
    case 'py': return 'Py'
    case 'rs': return 'Rs'
    case 'go': return 'Go'
    default: return '\u2022'
  }
}
