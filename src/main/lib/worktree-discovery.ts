import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
import { existsSync, statSync } from 'fs'
import { join } from 'path'

export interface Worktree {
  path: string           // absolute path, backslash-normalized on Windows
  head: string
  branch: string | null
  isDetached: boolean
  isPrunable: boolean
  isLocked: boolean
  lockReason?: string
  prunableReason?: string
}

/**
 * Parse `git worktree list --porcelain` output into structured Worktree objects.
 * Validated in spike-worktree-discovery.ts against real git output.
 */
export function parseWorktreeList(output: string): Worktree[] {
  const worktrees: Worktree[] = []
  const records = output.trim().split('\n\n')

  for (const record of records) {
    if (!record.trim()) continue
    const lines = record.trim().split('\n')
    const wt: Worktree = {
      path: '',
      head: '',
      branch: null,
      isDetached: false,
      isPrunable: false,
      isLocked: false
    }

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        // Git on Windows outputs forward slashes — normalize to backslashes
        wt.path = line.substring('worktree '.length).replace(/\//g, '\\')
      } else if (line.startsWith('HEAD ')) {
        wt.head = line.substring('HEAD '.length)
      } else if (line.startsWith('branch ')) {
        wt.branch = line.substring('branch '.length).replace('refs/heads/', '')
      } else if (line === 'detached') {
        wt.isDetached = true
      } else if (line.startsWith('prunable')) {
        wt.isPrunable = true
        wt.prunableReason = line.substring('prunable '.length) || undefined
      } else if (line.startsWith('locked')) {
        wt.isLocked = true
        wt.lockReason = line.substring('locked '.length) || undefined
      }
    }

    if (wt.path) worktrees.push(wt)
  }

  return worktrees
}

/**
 * Check if a directory is inside a git repository.
 */
export function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, '.git'))
}

/**
 * Check if a directory is a linked worktree (vs main checkout).
 * Linked worktrees have a .git file (not directory) with a gitdir: pointer.
 */
export function isLinkedWorktree(dir: string): boolean {
  const gitPath = join(dir, '.git')
  if (!existsSync(gitPath)) return false
  return statSync(gitPath).isFile()
}

/**
 * Discover all worktrees for the repository containing the given directory.
 * Uses execFile (not execSync) to avoid blocking the main thread.
 * Uses 'git' directly (not via shell) to minimize EDR alerts.
 */
export async function discoverWorktrees(dir: string): Promise<Worktree[]> {
  if (!isGitRepo(dir)) return []

  try {
    const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 5000
    })
    return parseWorktreeList(stdout)
  } catch {
    return []
  }
}

/**
 * Get the main checkout path for the repository containing the given directory.
 */
export async function getMainCheckoutPath(dir: string): Promise<string | null> {
  const worktrees = await discoverWorktrees(dir)
  return worktrees.length > 0 ? worktrees[0].path : null
}
