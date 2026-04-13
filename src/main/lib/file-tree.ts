import { readdirSync, statSync, readFileSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { FileTreeEntry } from '../../shared/types'

const execFileAsync = promisify(execFile)

// Directories to always skip
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', '.nuxt', 'dist', 'out', 'build',
  '.cache', '.turbo', '.vercel', '__pycache__', '.venv', 'venv',
  'coverage', '.nyc_output', '.parcel-cache'
])

/**
 * Read a directory's contents (one level deep, lazy loading).
 * Respects .gitignore patterns and skips common heavy directories.
 */
export function listDirectory(dirPath: string, rootPath: string): FileTreeEntry[] {
  try {
    const entries = readdirSync(dirPath)
    const gitignorePatterns = loadGitignore(rootPath)

    const result: FileTreeEntry[] = []

    for (const name of entries) {
      // Skip hidden files starting with . (except .env, .gitignore, etc.)
      if (name.startsWith('.') && !isImportantDotfile(name)) continue

      // Skip known heavy directories
      if (IGNORED_DIRS.has(name)) continue

      const fullPath = join(dirPath, name)
      const relativePath = relative(rootPath, fullPath).replace(/\\/g, '/')

      // Skip gitignored files
      if (matchesGitignore(relativePath, gitignorePatterns)) continue

      try {
        const stat = statSync(fullPath)
        result.push({
          name,
          path: fullPath,
          isDirectory: stat.isDirectory(),
        })
      } catch {
        // Skip files we can't stat (permissions, etc.)
      }
    }

    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })

    return result
  } catch {
    return []
  }
}

/**
 * Read a file's contents for preview.
 */
export function readFileContents(filePath: string): string | null {
  try {
    const stat = statSync(filePath)
    // Don't read files larger than 1MB
    if (stat.size > 1024 * 1024) return '// File too large to preview'
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Get git status for files in a directory (async, only on demand).
 */
export async function getGitStatus(rootPath: string): Promise<Map<string, string>> {
  const statusMap = new Map<string, string>()

  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '-u'], {
      cwd: rootPath,
      encoding: 'utf-8',
      timeout: 5000
    })

    for (const line of stdout.split('\n')) {
      if (line.length < 4) continue
      const code = line.substring(0, 2).trim()
      const file = line.substring(3)

      if (code === 'M' || code === 'MM') statusMap.set(file, 'modified')
      else if (code === 'A') statusMap.set(file, 'added')
      else if (code === 'D') statusMap.set(file, 'deleted')
      else if (code === '??') statusMap.set(file, 'untracked')
      else statusMap.set(file, 'modified')
    }
  } catch {
    // Git not available or not a repo
  }

  return statusMap
}

// --- Gitignore support ---

function loadGitignore(rootPath: string): string[] {
  const gitignorePath = join(rootPath, '.gitignore')
  if (!existsSync(gitignorePath)) return []

  try {
    const content = readFileSync(gitignorePath, 'utf-8')
    return content
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
  } catch {
    return []
  }
}

function matchesGitignore(relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching — covers most common patterns
    const regex = patternToRegex(pattern)
    if (regex.test(relativePath) || regex.test(relativePath.split('/').pop() || '')) {
      return true
    }
  }
  return false
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

function isImportantDotfile(name: string): boolean {
  const important = new Set([
    '.env', '.env.local', '.env.example',
    '.gitignore', '.gitattributes',
    '.eslintrc', '.eslintrc.js', '.eslintrc.json',
    '.prettierrc', '.prettierrc.js',
    '.editorconfig',
    '.npmrc',
    '.nvmrc',
    '.claude',
    '.claide',
  ])
  return important.has(name)
}
