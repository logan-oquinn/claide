import * as pty from 'node-pty'
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
  const term = pty.spawn(claudePath, ['--name', sessionName], {
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

  // Wait for Claude to be ready
  log('Waiting for Claude to initialize...')
  let ready = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    if (buffer.length > 100) {
      ready = true
      break
    }
  }
  log(`Ready: ${ready ? 'YES' : 'NO'} (${buffer.length} bytes captured)`)
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

  log(`\nTotal chunks captured: ${chunks.length}`)
  log(`Total bytes: ${chunks.reduce((n, c) => n + c.length, 0)}`)

  log('\n=== Claude CLI Spike complete ===')
}

main().catch(console.error)
