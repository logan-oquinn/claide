import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('claide', {
  platform: process.platform
})
