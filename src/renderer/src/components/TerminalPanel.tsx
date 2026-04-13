import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface Props {
  sessionUuid: string
  visible: boolean
}

export default function TerminalPanel({ sessionUuid, visible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void)[]>([])

  const fit = useCallback(() => {
    if (fitAddonRef.current && termRef.current) {
      try {
        fitAddonRef.current.fit()
        const { cols, rows } = termRef.current
        window.claide.resizeSession(sessionUuid, cols, rows)
      } catch {
        // fit() can throw if container has zero size (hidden panel)
      }
    }
  }, [sessionUuid])

  // Create terminal once on mount, never destroy on switch
  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      theme: {
        background: '#1a1a2e',
        foreground: '#e0e0e0',
        cursor: '#6c63ff',
        selectionBackground: '#3a3a5a',
        black: '#1a1a2e',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#fbbf24',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e0e0e0',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Forward user input to main process
    const inputDisposable = term.onData((data: string) => {
      window.claide.sendInput(sessionUuid, data)
    })

    // Receive terminal output from main process
    const removeDataListener = window.claide.onSessionData((event) => {
      if (event.uuid === sessionUuid) {
        term.write(event.data)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      // Only fit if visible — hidden containers have zero size
      if (containerRef.current && containerRef.current.offsetHeight > 0) {
        fit()
      }
    })
    resizeObserver.observe(containerRef.current)

    cleanupRef.current = [
      () => inputDisposable.dispose(),
      removeDataListener,
      () => resizeObserver.disconnect(),
      () => term.dispose(),
    ]

    // Initial fit if visible
    requestAnimationFrame(() => {
      if (visible) fit()
    })

    return () => {
      for (const cleanup of cleanupRef.current) cleanup()
      cleanupRef.current = []
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionUuid]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fit when becoming visible
  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => fit())
    }
  }, [visible, fit])

  return (
    <div
      ref={containerRef}
      className="terminal-container"
      style={{
        width: '100%',
        height: '100%',
        display: visible ? 'block' : 'none',
      }}
    />
  )
}
