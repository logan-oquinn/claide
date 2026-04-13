import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { RecentProject } from '../../shared/types'

const MAX_RECENT = 10

function recentFilePath(): string {
  return join(homedir(), '.claide', 'recent-projects.json')
}

export function readRecentProjects(): RecentProject[] {
  const path = recentFilePath()
  if (!existsSync(path)) return []

  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'))
    if (!Array.isArray(data)) return []
    return data.slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function addRecentProject(projectPath: string): RecentProject[] {
  const name = projectPath.split(/[/\\]/).pop() || projectPath
  const recent = readRecentProjects().filter(p => p.path !== projectPath)

  recent.unshift({
    path: projectPath,
    name,
    lastOpenedAt: new Date().toISOString()
  })

  const trimmed = recent.slice(0, MAX_RECENT)

  const filePath = recentFilePath()
  const dir = join(homedir(), '.claide')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8')

  return trimmed
}
