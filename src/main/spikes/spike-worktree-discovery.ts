import { execSync } from 'child_process'
import { existsSync, statSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_PREFIX = '[spike:worktrees]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

interface Worktree {
  path: string
  head: string
  branch: string | null
  isDetached: boolean
  isPrunable: boolean
  isLocked: boolean
  lockReason?: string
  prunableReason?: string
}

function parseWorktreeList(output: string): Worktree[] {
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
        wt.path = line.substring('worktree '.length)
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

function encodePath(absolutePath: string): string {
  return absolutePath.replace(/[\\/:\.]/g, '-')
}

function isGitRepo(dir: string): boolean {
  const gitPath = join(dir, '.git')
  return existsSync(gitPath)
}

function isLinkedWorktree(dir: string): boolean {
  const gitPath = join(dir, '.git')
  if (!existsSync(gitPath)) return false
  return statSync(gitPath).isFile()
}

async function main() {
  log('=== Worktree Discovery Spike ===')

  const cwd = process.cwd()
  log(`CWD: ${cwd}`)

  // Test 1: Is this a git repo?
  log('\n--- Test 1: Git repo detection ---')
  const isRepo = isGitRepo(cwd)
  log(`Is git repo: ${isRepo ? 'YES' : 'NO'}`)

  if (!isRepo) {
    log('Not a git repo. Skipping worktree tests.')
    log('=== Worktree Discovery Spike complete (limited) ===')
    return
  }

  // Test 2: Main checkout vs linked worktree
  log('\n--- Test 2: Checkout type ---')
  const isLinked = isLinkedWorktree(cwd)
  log(`Is linked worktree: ${isLinked ? 'YES' : 'NO'}`)

  if (isLinked) {
    const gitContent = readFileSync(join(cwd, '.git'), 'utf-8').trim()
    log(`.git file content: ${gitContent}`)
  }

  // Test 3: Get shared git dir
  log('\n--- Test 3: Shared git directory ---')
  try {
    const commonDir = execSync('git rev-parse --git-common-dir', {
      cwd,
      encoding: 'utf-8'
    }).trim()
    log(`Common dir: ${commonDir}`)
  } catch (e) {
    log(`Failed: ${e}`)
  }

  // Test 4: Parse worktree list
  log('\n--- Test 4: Worktree list (porcelain) ---')
  let worktrees: Worktree[] = []
  try {
    const raw = execSync('git worktree list --porcelain', {
      cwd,
      encoding: 'utf-8'
    })
    log(`Raw output:\n${raw}`)
    worktrees = parseWorktreeList(raw)
    log(`Parsed ${worktrees.length} worktree(s):`)
    for (const wt of worktrees) {
      log(`  path: ${wt.path}`)
      log(`  branch: ${wt.branch || '(detached)'}`)
      log(`  HEAD: ${wt.head.substring(0, 8)}...`)
      log(`  prunable: ${wt.isPrunable}  locked: ${wt.isLocked}`)
      log('')
    }
  } catch (e) {
    log(`Failed: ${e}`)
  }

  // Test 5: Compute session namespaces and check for sessions
  log('\n--- Test 5: Session namespace mapping ---')
  const projectsDir = join(homedir(), '.claude', 'projects')
  for (const wt of worktrees) {
    // Git on Windows uses forward slashes; normalize to backslashes for encoding
    const normalizedPath = wt.path.replace(/\//g, '\\')
    const namespace = encodePath(normalizedPath)
    const namespacePath = join(projectsDir, namespace)
    const exists = existsSync(namespacePath)
    let sessionCount = 0
    if (exists) {
      sessionCount = readdirSync(namespacePath).filter(f => f.endsWith('.jsonl')).length
    }
    log(`  ${wt.branch || 'detached'}: ${namespace}`)
    log(`    exists: ${exists}  sessions: ${sessionCount}`)
  }

  // Test 6: Find main checkout path
  log('\n--- Test 6: Main checkout identification ---')
  if (worktrees.length > 0) {
    const mainCheckout = worktrees[0]
    log(`Main checkout (first entry): ${mainCheckout.path}`)
    log(`Branch: ${mainCheckout.branch || '(detached)'}`)
    log(`This is where .claide/sessions.json would live`)
  }

  log('\n=== Worktree Discovery Spike complete ===')
}

main().catch(console.error)
