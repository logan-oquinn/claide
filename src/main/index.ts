import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { SessionManager } from './session-manager'
import { ShellManager } from './shell-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { readRecentProjects, addRecentProject } from './lib/recent-projects'
import { readSettings, writeSettings, type ClaideSettings } from './lib/settings-store'
import { setClaudePathOverride } from './lib/claude-cli'
import { listDirectory, readFileContents } from './lib/file-tree'
import { IPC } from '../shared/types'
import type { ShellResizePayload, RecentProject } from '../shared/types'

let mainWindow: BrowserWindow | null = null
const sessionManager = new SessionManager()
const shellManager = new ShellManager()

function applySettings(settings: ClaideSettings): void {
  setClaudePathOverride(settings.claudePath)
  shellManager.setShellPathOverride(settings.shellPath)
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open-project')
        },
        { type: 'separator' },
        { label: 'New Session', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-session') },
        { type: 'separator' },
        { label: 'Toggle Shell', accelerator: 'CmdOrCtrl+`', click: () => mainWindow?.webContents.send('menu:toggle-shell') },
        { type: 'separator' },
        { label: 'Close Project', click: () => mainWindow?.webContents.send('menu:close-project') },
        { label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('menu:settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: 'Claide',
    backgroundColor: '#141425',
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

function registerFileTreeIpc(): void {
  ipcMain.handle(IPC.FILETREE_LIST, (_event, dirPath: string, rootPath: string) => {
    return listDirectory(dirPath, rootPath)
  })

  ipcMain.handle(IPC.FILETREE_READ, (_event, filePath: string) => {
    return readFileContents(filePath)
  })
}

function registerProjectIpc(): void {
  // Pick a folder via native dialog
  ipcMain.handle(IPC.PROJECT_PICK, async (): Promise<string | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Open Project'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const picked = result.filePaths[0]
    addRecentProject(picked)
    return picked
  })

  // Get recent projects list
  ipcMain.handle(IPC.PROJECT_RECENT, (): RecentProject[] => {
    return readRecentProjects()
  })
}

function registerSettingsIpc(): void {
  ipcMain.handle(IPC.SETTINGS_GET, (): ClaideSettings => {
    return readSettings()
  })

  ipcMain.handle(IPC.SETTINGS_SAVE, (_event, settings: ClaideSettings): void => {
    writeSettings(settings)
    applySettings(settings)
  })

  // Browse for a file (used by settings panel for CLI path selection)
  ipcMain.handle(IPC.SETTINGS_BROWSE, async (_event, type: 'file' | 'directory'): Promise<string | null> => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: [type === 'file' ? 'openFile' : 'openDirectory'],
      title: type === 'file' ? 'Select Executable' : 'Select Directory'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
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
  // Apply saved settings before anything else
  applySettings(readSettings())

  createMenu()
  registerProjectIpc()
  registerFileTreeIpc()
  registerSettingsIpc()
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
