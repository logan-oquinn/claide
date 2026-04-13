import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const LOG_PREFIX = '[spike:sessions]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

function encodePath(absolutePath: string): string {
  return absolutePath.replace(/[\\/:\.]/g, '-')
}

function getClaudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects')
}

function getSessionIndexDir(): string {
  return join(homedir(), '.claude', 'sessions')
}

async function main() {
  log('=== Session Storage Spike ===')

  // Test 1: Verify projects directory exists
  log('\n--- Test 1: Projects directory ---')
  const projectsDir = getClaudeProjectsDir()
  log(`Path: ${projectsDir}`)
  log(`Exists: ${existsSync(projectsDir) ? 'YES' : 'NO'}`)

  if (!existsSync(projectsDir)) {
    log('FAIL: No projects directory found')
    process.exit(1)
  }

  // Test 2: List all project namespaces
  log('\n--- Test 2: Project namespaces ---')
  const namespaces = readdirSync(projectsDir).filter(f => {
    return statSync(join(projectsDir, f)).isDirectory()
  })
  for (const ns of namespaces) {
    const files = readdirSync(join(projectsDir, ns)).filter(f => f.endsWith('.jsonl'))
    log(`  ${ns}: ${files.length} session(s)`)
  }

  // Test 3: Path encoding validation
  log('\n--- Test 3: Path encoding ---')
  const testPaths = [
    process.cwd(),
    'C:\\Users\\Test\\repo',
    'C:\\Users\\Test\\repo\\.claude\\worktrees\\feature',
    'D:\\worktrees\\hotfix',
  ]
  for (const p of testPaths) {
    const encoded = encodePath(p)
    log(`  ${p}`)
    log(`  → ${encoded}`)
    log('')
  }

  // Test 4: Verify encoding matches actual Claude namespace for current dir
  log('\n--- Test 4: Encoding match for current directory ---')
  const cwd = process.cwd()
  const expectedNamespace = encodePath(cwd)
  const actualDir = join(projectsDir, expectedNamespace)
  log(`CWD: ${cwd}`)
  log(`Expected namespace: ${expectedNamespace}`)
  log(`Directory exists: ${existsSync(actualDir) ? 'YES' : 'NO'}`)

  if (existsSync(actualDir)) {
    const sessions = readdirSync(actualDir).filter(f => f.endsWith('.jsonl'))
    log(`Sessions found: ${sessions.length}`)
    for (const s of sessions) {
      const uuid = s.replace('.jsonl', '')
      log(`  UUID: ${uuid}`)

      // Read first line to verify sessionId matches filename
      const firstLine = readFileSync(join(actualDir, s), 'utf-8').split('\n')[0]
      try {
        const record = JSON.parse(firstLine)
        const matches = record.sessionId === uuid
        log(`  sessionId matches filename: ${matches ? 'YES' : 'NO'}`)
      } catch {
        log(`  Could not parse first line`)
      }
    }
  }

  // Test 5: Session index files
  log('\n--- Test 5: Session index ---')
  const indexDir = getSessionIndexDir()
  log(`Index dir: ${indexDir}`)
  log(`Exists: ${existsSync(indexDir) ? 'YES' : 'NO'}`)

  if (existsSync(indexDir)) {
    const indexFiles = readdirSync(indexDir).filter(f => f.endsWith('.json'))
    log(`Index files (PIDs): ${indexFiles.length}`)
    for (const f of indexFiles.slice(0, 5)) {
      try {
        const data = JSON.parse(readFileSync(join(indexDir, f), 'utf-8'))
        log(`  PID ${data.pid}: session=${data.sessionId?.substring(0, 8)}... cwd=${data.cwd} kind=${data.kind}`)
      } catch {
        log(`  Could not parse ${f}`)
      }
    }
  }

  log('\n=== Session Storage Spike complete ===')
}

main().catch(console.error)
