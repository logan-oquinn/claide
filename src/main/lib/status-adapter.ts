import { stripAnsi } from './ansi'

/**
 * Parsed status from Claude Code's terminal status bar.
 * All fields are optional — the parser is best-effort.
 */
export interface ParsedStatus {
  model?: string           // "Sonnet 4.6", "Opus 4.6", "Haiku 4.5"
  contextUsed?: number     // tokens used (e.g., 15000)
  contextTotal?: number    // total context (e.g., 200000)
  contextPercent?: number  // 0-100
  effort?: string          // "high", "medium", "low"
  cost?: string            // "$1.23"
  rateLimit5h?: number     // 0-100 percentage
  rateLimit7d?: number     // 0-100 percentage
}

/**
 * Known Claude model name prefixes to look for in the status bar.
 */
const MODEL_PATTERNS = [
  'Opus 4.6',
  'Sonnet 4.6',
  'Haiku 4.5',
  'Opus 4',
  'Sonnet 4',
  'Haiku 4',
  'Sonnet 3.5',
]

/**
 * Parse Claude Code's terminal status bar from raw terminal output.
 *
 * The status bar format (pipe-separated):
 *   Sonnet 4.6 | claide@develop (+24 -4) | 0/200k (0%) | effort: high | 5h 55% @11:59am | 7d 5% @apr 20
 *
 * Returns null if the status bar pattern is not found.
 * Never throws — all parsing is wrapped in try/catch.
 */
export function parseStatusBar(rawOutput: string): ParsedStatus | null {
  try {
    const stripped = stripAnsi(rawOutput)

    // The status bar contains pipe-separated fields with a context pattern like "N/Nk"
    // Find the line containing this pattern
    const contextPattern = /(\d+)\/(\d+)k\s*\((\d+)%\)/
    const match = stripped.match(contextPattern)
    if (!match) return null

    // Found context — now extract the surrounding status bar
    // Get a window around the match to parse other fields
    const matchIdx = stripped.indexOf(match[0])
    const windowStart = Math.max(0, matchIdx - 200)
    const windowEnd = Math.min(stripped.length, matchIdx + 200)
    const window = stripped.substring(windowStart, windowEnd)

    const status: ParsedStatus = {}

    // Context usage
    status.contextUsed = parseInt(match[1]) * 1000
    status.contextTotal = parseInt(match[2]) * 1000
    status.contextPercent = parseInt(match[3])

    // Model name — look for known model prefixes
    for (const model of MODEL_PATTERNS) {
      if (window.includes(model)) {
        status.model = model
        break
      }
    }

    // Effort level
    const effortMatch = window.match(/effort:\s*(high|medium|low)/i)
    if (effortMatch) {
      status.effort = effortMatch[1].toLowerCase()
    }

    // Cost (appears after API usage)
    const costMatch = window.match(/\$(\d+\.\d{2})/)
    if (costMatch) {
      status.cost = `$${costMatch[1]}`
    }

    // 5h rate limit
    const rate5hMatch = window.match(/5h\s+(\d+)%/)
    if (rate5hMatch) {
      status.rateLimit5h = parseInt(rate5hMatch[1])
    }

    // 7d rate limit
    const rate7dMatch = window.match(/7d\s+(\d+)%/)
    if (rate7dMatch) {
      status.rateLimit7d = parseInt(rate7dMatch[1])
    }

    return status
  } catch {
    return null
  }
}
