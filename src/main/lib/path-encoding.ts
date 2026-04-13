/**
 * Encode an absolute filesystem path to a Claude session namespace.
 *
 * Claude Code uses the literal cwd path as the session namespace key,
 * replacing \, /, :, and . with -
 *
 * Validated 2026-04-13 against Claude Code 2.1.104 on Windows.
 */
export function encodePath(absolutePath: string): string {
  return absolutePath.replace(/[\\/:\.]/g, '-')
}

/**
 * Normalize a path from git output (forward slashes) to Windows backslashes.
 * Git on Windows outputs paths like C:/Users/... which need normalizing
 * before encoding or comparing with native Windows paths.
 */
export function normalizeGitPath(gitPath: string): string {
  return gitPath.replace(/\//g, '\\')
}
