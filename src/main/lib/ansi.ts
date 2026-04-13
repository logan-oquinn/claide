/**
 * Strip ANSI escape sequences from terminal output.
 * Used by the status parser adapter — not a source of truth,
 * just a best-effort cleanup for pattern matching.
 */
export function stripAnsi(str: string): string {
  return str
    // CSI sequences: ESC [ ... letter
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // OSC sequences: ESC ] ... BEL
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\][^\x07]*\x07/g, '')
    // Charset selection: ESC ( digit/letter
    .replace(/\x1b[()][0-9A-B]/g, '')
    // Mode set/reset: ESC [ ? digits h/l/m
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[\??\d*[hlm]/g, '')
}
