import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type {
  ProjectState,
  SessionCreatePayload,
  SessionDataEvent,
  SessionLifecycleEvent
} from '../shared/types'

export interface ClaideAPI {
  platform: string
  cwd: string
  openProject(rootPath: string): Promise<ProjectState>
  createSession(cwd: string, name?: string): Promise<ProjectState>
  resumeSession(uuid: string, cwd: string): Promise<ProjectState>
  sendInput(uuid: string, data: string): void
  resizeSession(uuid: string, cols: number, rows: number): void
  stopSession(uuid: string): Promise<ProjectState>
  renameSession(uuid: string, displayName: string): Promise<ProjectState>
  onSessionData(callback: (event: SessionDataEvent) => void): () => void
  onSessionLifecycle(callback: (event: SessionLifecycleEvent) => void): () => void
  onProjectState(callback: (state: ProjectState) => void): () => void
  // Shell
  createShell(cwd: string): Promise<void>
  sendShellInput(data: string): void
  resizeShell(cols: number, rows: number): void
  onShellData(callback: (data: string) => void): () => void
}

const api: ClaideAPI = {
  platform: process.platform,
  cwd: process.cwd(),

  openProject(rootPath: string) {
    return ipcRenderer.invoke(IPC.PROJECT_OPEN, rootPath)
  },

  createSession(cwd: string, name?: string) {
    const payload: SessionCreatePayload = { cwd, name }
    return ipcRenderer.invoke(IPC.SESSION_CREATE, payload)
  },

  resumeSession(uuid: string, cwd: string) {
    return ipcRenderer.invoke(IPC.SESSION_RESUME, { uuid, cwd })
  },

  sendInput(uuid: string, data: string) {
    ipcRenderer.send(IPC.SESSION_INPUT, { uuid, data })
  },

  resizeSession(uuid: string, cols: number, rows: number) {
    ipcRenderer.send(IPC.SESSION_RESIZE, { uuid, cols, rows })
  },

  stopSession(uuid: string) {
    return ipcRenderer.invoke(IPC.SESSION_STOP, { uuid })
  },

  renameSession(uuid: string, displayName: string) {
    return ipcRenderer.invoke(IPC.SESSION_RENAME, { uuid, displayName })
  },

  onSessionData(callback: (event: SessionDataEvent) => void) {
    const handler = (_: unknown, event: SessionDataEvent) => callback(event)
    ipcRenderer.on(IPC.SESSION_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_DATA, handler)
  },

  onSessionLifecycle(callback: (event: SessionLifecycleEvent) => void) {
    const handler = (_: unknown, event: SessionLifecycleEvent) => callback(event)
    ipcRenderer.on(IPC.SESSION_LIFECYCLE, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_LIFECYCLE, handler)
  },

  onProjectState(callback: (state: ProjectState) => void) {
    const handler = (_: unknown, state: ProjectState) => callback(state)
    ipcRenderer.on(IPC.PROJECT_STATE, handler)
    return () => ipcRenderer.removeListener(IPC.PROJECT_STATE, handler)
  },

  // Shell
  createShell(cwd: string) {
    return ipcRenderer.invoke(IPC.SHELL_CREATE, cwd)
  },

  sendShellInput(data: string) {
    ipcRenderer.send(IPC.SHELL_INPUT, data)
  },

  resizeShell(cols: number, rows: number) {
    ipcRenderer.send(IPC.SHELL_RESIZE, { cols, rows })
  },

  onShellData(callback: (data: string) => void) {
    const handler = (_: unknown, data: string) => callback(data)
    ipcRenderer.on(IPC.SHELL_DATA, handler)
    return () => ipcRenderer.removeListener(IPC.SHELL_DATA, handler)
  }
}

contextBridge.exposeInMainWorld('claide', api)
