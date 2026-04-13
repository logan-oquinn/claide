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
            {loading ? '\u23f3' : expanded ? '\ud83d\udcc2' : '\ud83d\udcc1'}
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
  const lower = name.toLowerCase()
  const ext = lower.split('.').pop()

  // Special filenames
  if (lower === 'package.json') return '\ud83d\udce6'
  if (lower === 'tsconfig.json' || lower.startsWith('tsconfig.')) return '\u2699\ufe0f'
  if (lower === '.gitignore' || lower === '.gitattributes') return '\ud83d\udc19'
  if (lower === '.env' || lower.startsWith('.env.')) return '\ud83d\udd10'
  if (lower === 'dockerfile' || lower === 'docker-compose.yml') return '\ud83d\udc33'
  if (lower === 'readme.md') return '\ud83d\udcd6'
  if (lower === 'license' || lower === 'license.md') return '\ud83d\udcdc'
  if (lower === 'claude.md' || lower === '.claude') return '\ud83e\udd16'

  switch (ext) {
    case 'ts': case 'tsx': return '\ud83d\udcd8'
    case 'js': case 'jsx': return '\ud83d\udcd9'
    case 'json': return '\ud83d\udcca'
    case 'md': case 'mdx': return '\ud83d\udcdd'
    case 'css': case 'scss': case 'less': return '\ud83c\udfa8'
    case 'html': case 'htm': return '\ud83c\udf10'
    case 'yml': case 'yaml': return '\u2699\ufe0f'
    case 'py': return '\ud83d\udc0d'
    case 'rs': return '\ud83e\udda0'
    case 'go': return '\ud83d\udc39'
    case 'java': case 'kt': return '\u2615'
    case 'cs': case 'csproj': case 'sln': return '\ud83d\udfe3'
    case 'sql': return '\ud83d\uddc3\ufe0f'
    case 'sh': case 'bash': case 'zsh': case 'ps1': return '\ud83d\udcbb'
    case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': case 'ico': return '\ud83d\uddbc\ufe0f'
    case 'lock': return '\ud83d\udd12'
    case 'log': return '\ud83d\udcbf'
    case 'xml': return '\ud83d\udcc4'
    case 'env': return '\ud83d\udd10'
    case 'toml': case 'ini': case 'cfg': return '\u2699\ufe0f'
    case 'test': case 'spec': return '\ud83e\uddea'
    default: return '\ud83d\udcc4'
  }
}
