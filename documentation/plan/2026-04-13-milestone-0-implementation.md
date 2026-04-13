# Milestone 0: Integration Proof — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove every risky external contract (PTY, Claude CLI, session storage, worktree discovery) before building UI around them.

**Architecture:** A minimal Electron + Vite + TypeScript scaffold with validation scripts in `src/main/spikes/`. Each spike is a standalone runnable that exercises a real external contract and logs results. No UI beyond a blank window to prove Electron boots.

**Tech Stack:** Electron, electron-vite, TypeScript, node-pty, xterm.js (renderer proof only)

---

### Task 1: Scaffold Electron + Vite project

**Files:**
- Create: `package.json`
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/App.tsx`
- Create: `.gitignore`

**Step 1: Initialize package.json with electron-vite**

```bash
cd C:/Users/Logan.OQuinn/source/repos/claide
npm init -y
npm install --save-dev electron electron-vite vite typescript @types/node
npm install --save-dev @vitejs/plugin-react react react-dom @types/react @types/react-dom
```

**Step 2: Create electron-vite config**

`electron.vite.config.ts`:
```ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: resolve('src/renderer'),
    build: {
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    plugins: [react()]
  }
})
```

**Step 3: Create TypeScript configs**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "outDir": "out",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/main/**/*", "src/preload/**/*", "electron.vite.config.ts"]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "outDir": "out",
    "rootDir": ".",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/renderer/src/**/*"]
}
```

**Step 4: Create main process entry**

`src/main/index.ts`:
```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})
```

**Step 5: Create preload script**

`src/preload/index.ts`:
```ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('claide', {
  platform: process.platform
})
```

**Step 6: Create renderer files**

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Claide</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>
```

`src/renderer/src/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

`src/renderer/src/App.tsx`:
```tsx
export default function App() {
  return (
    <div style={{ padding: 24, color: '#ccc', background: '#1e1e1e', height: '100vh' }}>
      <h1>Claide — Milestone 0</h1>
      <p>Integration proof harness. Check the main process console for spike output.</p>
    </div>
  )
}
```

**Step 7: Create .gitignore**

`.gitignore`:
```
node_modules/
out/
dist/
.claide/
*.log
```

**Step 8: Add scripts to package.json**

Add to `package.json`:
```json
{
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "spike:pty": "npx tsx src/main/spikes/spike-pty.ts",
    "spike:claude": "npx tsx src/main/spikes/spike-claude-cli.ts",
    "spike:sessions": "npx tsx src/main/spikes/spike-session-storage.ts",
    "spike:worktrees": "npx tsx src/main/spikes/spike-worktree-discovery.ts",
    "spike:parser": "npx tsx src/main/spikes/spike-status-parser.ts"
  }
}
```

**Step 9: Verify Electron boots**

```bash
npm run dev
```

Expected: Electron window opens showing "Claide — Milestone 0" heading on a dark background. Close the window to exit.

**Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + Vite + React + TypeScript project"
```

---

### Task 2: Validate node-pty + ConPTY on Windows

**Files:**
- Create: `src/main/spikes/spike-pty.ts`

**Step 1: Install node-pty and tsx**

```bash
npm install node-pty
npm install --save-dev tsx
```

Note: `node-pty` requires native compilation. If it fails, ensure Windows Build Tools are installed: `npm install --global windows-build-tools` or install Visual Studio Build Tools with C++ workload.

**Step 2: Write the PTY validation spike**

`src/main/spikes/spike-pty.ts`:
```ts
import * as pty from 'node-pty'
import { homedir } from 'os'

const SHELL = process.env.COMSPEC || 'powershell.exe'
const LOG_PREFIX = '[spike:pty]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  log('=== PTY Spike: ConPTY validation on Windows ===')
  log(`Shell: ${SHELL}`)
  log(`Home: ${homedir()}`)

  // Test 1: Spawn and capture output
  log('\n--- Test 1: Spawn shell and capture output ---')
  const term = pty.spawn(SHELL, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: homedir(),
    env: process.env as Record<string, string>
  })

  let buffer = ''
  term.onData((data: string) => {
    buffer += data
  })

  await sleep(2000)
  log(`Initial output captured: ${buffer.length} bytes`)
  log(`Contains prompt: ${buffer.length > 0 ? 'YES' : 'NO'}`)

  // Test 2: Send input and verify echo
  log('\n--- Test 2: Send input ---')
  buffer = ''
  term.write('echo CLAIDE_PTY_TEST\r')
  await sleep(1000)
  const echoFound = buffer.includes('CLAIDE_PTY_TEST')
  log(`Echo captured: ${echoFound ? 'YES' : 'NO'}`)

  // Test 3: Resize
  log('\n--- Test 3: Resize ---')
  try {
    term.resize(80, 24)
    log('Resize to 80x24: OK')
    term.resize(200, 50)
    log('Resize to 200x50: OK')
    term.resize(120, 30)
    log('Resize back to 120x30: OK')
  } catch (e) {
    log(`Resize FAILED: ${e}`)
  }

  // Test 4: Kill process
  log('\n--- Test 4: Kill process ---')
  const exitPromise = new Promise<number>(resolve => {
    term.onExit(({ exitCode }) => resolve(exitCode))
  })
  term.kill()
  const exitCode = await exitPromise
  log(`Exit code: ${exitCode}`)

  // Test 5: Multiple simultaneous PTYs
  log('\n--- Test 5: Multiple simultaneous PTYs ---')
  const terms: pty.IPty[] = []
  for (let i = 0; i < 5; i++) {
    const t = pty.spawn(SHELL, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: homedir(),
      env: process.env as Record<string, string>
    })
    terms.push(t)
  }
  log(`Spawned ${terms.length} concurrent PTYs`)
  await sleep(1000)

  const exits = await Promise.all(
    terms.map(t => new Promise<number>(resolve => {
      t.onExit(({ exitCode }) => resolve(exitCode))
      t.kill()
    }))
  )
  log(`All exited with codes: [${exits.join(', ')}]`)

  log('\n=== PTY Spike complete ===')
}

main().catch(console.error)
```

**Step 3: Run the spike**

```bash
npm run spike:pty
```

Expected: All 5 tests produce output. Spawn, echo, resize, kill, and concurrent PTYs all work. Document any failures.

**Step 4: Commit**

```bash
git add -A
git commit -m "spike: validate node-pty ConPTY behavior on Windows"
```

---

### Task 3: Validate Claude CLI spawning and lifecycle

**Files:**
- Create: `src/main/spikes/spike-claude-cli.ts`

**Step 1: Write the Claude CLI validation spike**

`src/main/spikes/spike-claude-cli.ts`:
```ts
import * as pty from 'node-pty'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const LOG_PREFIX = '[spike:claude]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function findClaude(): string | null {
  try {
    const result = execSync('where claude', { encoding: 'utf-8' }).trim()
    return result.split('\n')[0].trim()
  } catch {
    return null
  }
}

async function main() {
  log('=== Claude CLI Spike ===')

  // Test 1: Find Claude CLI
  log('\n--- Test 1: Locate Claude CLI ---')
  const claudePath = findClaude()
  if (!claudePath) {
    log('FAIL: Claude CLI not found in PATH')
    process.exit(1)
  }
  log(`Found: ${claudePath}`)

  // Test 2: Check version
  log('\n--- Test 2: Version ---')
  try {
    const version = execSync('claude --version', { encoding: 'utf-8' }).trim()
    log(`Version: ${version}`)
  } catch (e) {
    log(`Version check failed: ${e}`)
  }

  // Test 3: Print mode (non-interactive, quick validation)
  log('\n--- Test 3: Print mode (non-interactive) ---')
  try {
    const output = execSync('claude -p "respond with exactly: CLAIDE_TEST_OK"', {
      encoding: 'utf-8',
      timeout: 30000
    }).trim()
    log(`Print mode output: ${output.substring(0, 200)}`)
    log(`Contains expected: ${output.includes('CLAIDE_TEST_OK') ? 'YES' : 'NO'}`)
  } catch (e) {
    log(`Print mode failed: ${e}`)
  }

  // Test 4: Interactive PTY spawn with --name
  log('\n--- Test 4: Interactive PTY spawn ---')
  const sessionName = `claide-spike-${Date.now()}`
  const term = pty.spawn('claude', ['--name', sessionName], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  })

  let buffer = ''
  const chunks: string[] = []
  term.onData((data: string) => {
    buffer += data
    chunks.push(data)
  })

  // Wait for Claude to be ready (look for the input prompt)
  log('Waiting for Claude to initialize...')
  let ready = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    // Claude shows a status bar or prompt when ready
    if (buffer.length > 100) {
      ready = true
      break
    }
  }
  log(`Ready: ${ready ? 'YES' : 'NO'} (${buffer.length} bytes captured)`)

  // Save first 2000 chars of startup output for analysis
  log(`\nStartup output (first 500 chars):\n${buffer.substring(0, 500)}`)

  // Test 5: Send /exit to gracefully quit
  log('\n--- Test 5: Graceful exit via /exit ---')
  buffer = ''
  term.write('/exit\r')

  const exitPromise = new Promise<number>(resolve => {
    term.onExit(({ exitCode }) => resolve(exitCode))
  })

  const exitCode = await Promise.race([
    exitPromise,
    sleep(10000).then(() => {
      log('Timeout waiting for exit, killing...')
      term.kill()
      return -1
    })
  ])
  log(`Exit code: ${exitCode}`)

  // Save raw chunks for parser analysis
  log(`\nTotal chunks captured: ${chunks.length}`)
  log(`Total bytes: ${chunks.reduce((n, c) => n + c.length, 0)}`)

  log('\n=== Claude CLI Spike complete ===')
}

main().catch(console.error)
```

**Step 2: Run the spike**

```bash
npm run spike:claude
```

Expected: Claude CLI is found, version prints, print mode works, interactive session spawns via PTY and captures output, `/exit` terminates cleanly. Document the exit code and any startup output patterns.

**Step 3: Commit**

```bash
git add -A
git commit -m "spike: validate Claude CLI spawning and lifecycle via PTY"
```

---

### Task 4: Validate session storage discovery and path encoding

**Files:**
- Create: `src/main/spikes/spike-session-storage.ts`

**Step 1: Write the session storage validation spike**

`src/main/spikes/spike-session-storage.ts`:
```ts
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
```

**Step 2: Run the spike**

```bash
npm run spike:sessions
```

Expected: Projects directory is found, namespaces are listed, path encoding matches what Claude uses, session UUIDs are extracted, and the first-line `sessionId` matches the filename.

**Step 3: Commit**

```bash
git add -A
git commit -m "spike: validate session storage discovery and path encoding"
```

---

### Task 5: Validate git worktree discovery

**Files:**
- Create: `src/main/spikes/spike-worktree-discovery.ts`

**Step 1: Write the worktree discovery spike**

`src/main/spikes/spike-worktree-discovery.ts`:
```ts
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
    log('Not a git repo. Testing with a known repo...')
    // Try to find another repo to test with
    log('Skipping worktree tests — run this from a git repo with worktrees')
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
```

**Step 2: Run the spike**

```bash
npm run spike:worktrees
```

Expected: Git repo is detected, worktree list is parsed, session namespaces are computed correctly for each worktree, and the main checkout is identified as the first entry.

**Step 3: Commit**

```bash
git add -A
git commit -m "spike: validate git worktree discovery and session namespace mapping"
```

---

### Task 6: Validate status parsing from terminal output

**Files:**
- Create: `src/main/spikes/spike-status-parser.ts`

**Step 1: Write the status parser spike**

`src/main/spikes/spike-status-parser.ts`:
```ts
import * as pty from 'node-pty'
import { writeFileSync } from 'fs'
import { join } from 'path'

const LOG_PREFIX = '[spike:parser]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')  // OSC sequences
    .replace(/\x1b[()][0-9A-B]/g, '')     // charset
    .replace(/\x1b\[[\?]?[0-9;]*[hlm]/g, '') // mode set/reset
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  log('=== Status Parser Spike ===')
  log('This spike captures raw Claude terminal output for parser development.')
  log('It will start a Claude session, capture output for ~15 seconds, then exit.\n')

  const term = pty.spawn('claude', [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env as Record<string, string>
  })

  const rawChunks: { timestamp: number; data: string }[] = []
  const startTime = Date.now()

  term.onData((data: string) => {
    rawChunks.push({ timestamp: Date.now() - startTime, data })
  })

  // Wait for startup
  log('Waiting for Claude to initialize (10s)...')
  await sleep(10000)

  // Analyze what we captured
  const fullRaw = rawChunks.map(c => c.data).join('')
  const stripped = stripAnsi(fullRaw)

  log(`\n--- Captured Data ---`)
  log(`Raw bytes: ${fullRaw.length}`)
  log(`Stripped bytes: ${stripped.length}`)
  log(`Chunks: ${rawChunks.length}`)

  // Try to identify patterns
  log(`\n--- Pattern Detection ---`)

  // Look for model name
  const modelPatterns = ['claude-', 'opus', 'sonnet', 'haiku']
  for (const p of modelPatterns) {
    const idx = stripped.toLowerCase().indexOf(p)
    if (idx >= 0) {
      const context = stripped.substring(Math.max(0, idx - 20), idx + 40)
      log(`Found "${p}" at position ${idx}: ...${context}...`)
    }
  }

  // Look for cost patterns
  const costMatch = stripped.match(/\$[\d.]+/)
  if (costMatch) {
    log(`Found cost pattern: ${costMatch[0]}`)
  } else {
    log(`No cost pattern found`)
  }

  // Look for context/token patterns
  const tokenMatch = stripped.match(/[\d,]+\s*(?:tokens?|k|K)/)
  if (tokenMatch) {
    log(`Found token pattern: ${tokenMatch[0]}`)
  } else {
    log(`No token pattern found in stripped output`)
  }

  // Save transcript for later analysis
  const transcriptPath = join(process.cwd(), 'documentation', 'spike-results', 'parser-transcript.txt')
  const transcriptDir = join(process.cwd(), 'documentation', 'spike-results')
  const { mkdirSync } = require('fs')
  mkdirSync(transcriptDir, { recursive: true })

  writeFileSync(transcriptPath, [
    `=== Claude Terminal Transcript ===`,
    `Captured: ${new Date().toISOString()}`,
    `Cols: 120, Rows: 30`,
    `Total chunks: ${rawChunks.length}`,
    ``,
    `=== Raw (with ANSI) ===`,
    fullRaw,
    ``,
    `=== Stripped ===`,
    stripped,
    ``,
    `=== Chunks with timestamps ===`,
    ...rawChunks.map(c => `[${c.timestamp}ms] ${JSON.stringify(c.data)}`)
  ].join('\n'))
  log(`\nTranscript saved to: ${transcriptPath}`)

  // Exit Claude
  log('\nSending /exit...')
  term.write('/exit\r')

  await new Promise<void>(resolve => {
    term.onExit(() => resolve())
    setTimeout(() => { term.kill(); resolve() }, 5000)
  })

  log('\n=== Status Parser Spike complete ===')
}

main().catch(console.error)
```

**Step 2: Run the spike**

```bash
npm run spike:parser
```

Expected: Claude starts, ~10 seconds of output is captured, patterns are searched, and a raw transcript is saved to `documentation/spike-results/parser-transcript.txt` for manual analysis.

**Step 3: Add spike-results to .gitignore, commit**

Add to `.gitignore`:
```
documentation/spike-results/
```

```bash
git add -A
git commit -m "spike: capture Claude terminal output for status parser analysis"
```

---

### Task 7: Document Milestone 0 findings

**Files:**
- Create: `documentation/spike-results/milestone-0-findings.md`

**Step 1: Run all spikes and collect results**

```bash
npm run spike:pty 2>&1 | tee documentation/spike-results/pty-results.txt
npm run spike:sessions 2>&1 | tee documentation/spike-results/sessions-results.txt
npm run spike:worktrees 2>&1 | tee documentation/spike-results/worktrees-results.txt
```

Note: `spike:claude` and `spike:parser` require interactive Claude sessions, so run those manually and save output.

**Step 2: Write the findings document**

`documentation/spike-results/milestone-0-findings.md`:

Document for each spike:
- What was tested
- What worked
- What failed or behaved unexpectedly
- Implications for Milestone 1 implementation
- Any changes needed to the design doc

This is a manual step — fill in after running all spikes.

**Step 3: Commit**

```bash
git add documentation/spike-results/milestone-0-findings.md
git commit -m "docs: document Milestone 0 integration proof findings"
```

---

Plan complete and saved to `documentation/plan/2026-04-13-milestone-0-implementation.md`.

I'll implement this directly in the current session, committing at each task checkpoint and pushing. Let me start with Task 1.
