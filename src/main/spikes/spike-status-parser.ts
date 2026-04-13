import * as pty from 'node-pty'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const LOG_PREFIX = '[spike:parser]'

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

function findClaude(): string {
  try {
    return execSync('where claude', { encoding: 'utf-8' }).trim().split('\n')[0].trim()
  } catch {
    throw new Error('Claude CLI not found in PATH')
  }
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

  const claudePath = findClaude()
  log(`Claude: ${claudePath}`)

  const term = pty.spawn(claudePath, [], {
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

  const modelPatterns = ['claude-', 'opus', 'sonnet', 'haiku']
  for (const p of modelPatterns) {
    const idx = stripped.toLowerCase().indexOf(p)
    if (idx >= 0) {
      const context = stripped.substring(Math.max(0, idx - 20), idx + 40)
      log(`Found "${p}" at position ${idx}: ...${context}...`)
    }
  }

  const costMatch = stripped.match(/\$[\d.]+/)
  if (costMatch) {
    log(`Found cost pattern: ${costMatch[0]}`)
  } else {
    log(`No cost pattern found`)
  }

  const tokenMatch = stripped.match(/[\d,]+\s*(?:tokens?|k|K)/)
  if (tokenMatch) {
    log(`Found token pattern: ${tokenMatch[0]}`)
  } else {
    log(`No token pattern found in stripped output`)
  }

  // Save transcript for later analysis
  const transcriptDir = join(process.cwd(), 'documentation', 'spike-results')
  mkdirSync(transcriptDir, { recursive: true })
  const transcriptPath = join(transcriptDir, 'parser-transcript.txt')

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
