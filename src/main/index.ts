import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { SessionManager } from './session-manager'
import { ShellManager } from './shell-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { IPC } from '../shared/types'
import type { ShellResizePayload } from '../shared/types'

let mainWindow: BrowserWindow | null = null
const sessionManager = new SessionManager()
const shellManager = new ShellManager()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Claide',
    backgroundColor: '#1a1a2e',
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerShellIpc(): void {
  function sendToRenderer(channel: string, ...args: unknown[]) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, ...args)
    }
  }

  shellManager.on('data', (data: string) => {
    sendToRenderer(IPC.SHELL_DATA, data)
  })

  ipcMain.handle(IPC.SHELL_CREATE, (_event, cwd: string) => {
    shellManager.create(cwd)
  })

  ipcMain.on(IPC.SHELL_INPUT, (_event, data: string) => {
    shellManager.write(data)
  })

  ipcMain.on(IPC.SHELL_RESIZE, (_event, payload: ShellResizePayload) => {
    shellManager.resize(payload.cols, payload.rows)
  })
}

app.whenReady().then(() => {
  registerIpcHandlers(sessionManager, () => mainWindow)
  registerShellIpc()
  createWindow()
})

app.on('window-all-closed', () => {
  sessionManager.destroyAll()
  shellManager.destroy()
  app.quit()
})

app.on('before-quit', () => {
  sessionManager.destroyAll()
  shellManager.destroy()
})
