import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface Props {
  cwd: string
}

export default function ShellPanel({ cwd }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const initialized = useRef(false)

  const fit = useCallback(() => {
    if (fitAddonRef.current && termRef.current) {
      try {
        fitAddonRef.current.fit()
        const { cols, rows } = termRef.current
        window.claide.resizeShell(cols, rows)
      } catch {
        // ignore zero-size
      }
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      theme: {
        background: '#141425',
        foreground: '#c0c0d8',
        cursor: '#6c63ff',
        selectionBackground: '#3a3a5a',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Forward input
    const inputDisposable = term.onData((data: string) => {
      window.claide.sendShellInput(data)
    })

    // Receive output
    const removeDataListener = window.claide.onShellData((data) => {
      term.write(data)
    })

    // Resize
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && containerRef.current.offsetHeight > 0) {
        fit()
      }
    })
    resizeObserver.observe(containerRef.current)

    // Spawn shell
    if (!initialized.current) {
      initialized.current = true
      window.claide.createShell(cwd)
    }

    requestAnimationFrame(() => fit())

    return () => {
      inputDisposable.dispose()
      removeDataListener()
      resizeObserver.disconnect()
      term.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [cwd, fit])

  return (
    <div
      ref={containerRef}
      className="shell-container"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
