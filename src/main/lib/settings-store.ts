import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

export interface ClaideSettings {
  claudePath: string
  shellPath: string
  defaultProjectPath: string
  terminal: {
    fontSize: number
    fontFamily: string
  }
}

const DEFAULTS: ClaideSettings = {
  claudePath: '',
  shellPath: '',
  defaultProjectPath: '',
  terminal: {
    fontSize: 13,
    fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace"
  }
}

function settingsPath(): string {
  return join(homedir(), '.claide', 'settings.json')
}

export function readSettings(): ClaideSettings {
  const path = settingsPath()
  if (!existsSync(path)) return { ...DEFAULTS, terminal: { ...DEFAULTS.terminal } }

  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'))
    return {
      claudePath: raw.claudePath || '',
      shellPath: raw.shellPath || '',
      defaultProjectPath: raw.defaultProjectPath || '',
      terminal: {
        fontSize: raw.terminal?.fontSize || DEFAULTS.terminal.fontSize,
        fontFamily: raw.terminal?.fontFamily || DEFAULTS.terminal.fontFamily
      }
    }
  } catch {
    return { ...DEFAULTS, terminal: { ...DEFAULTS.terminal } }
  }
}

export function writeSettings(settings: ClaideSettings): void {
  const path = settingsPath()
  const dir = join(homedir(), '.claide')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8')
}
