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
