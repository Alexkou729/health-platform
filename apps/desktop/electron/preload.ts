/**
 * Electron Preload Script
 * 暴露 IPC 接口给渲染进程
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // 外部
  openExternal: (url: string) => ipcRenderer.invoke('shell:open', url),

  // 文件
  showSaveDialog: (options: any) => ipcRenderer.invoke('dialog:save', options),

  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('app:info'),

  // 本地配置
  readConfig: () => ipcRenderer.invoke('config:read'),
  writeConfig: (data: any) => ipcRenderer.invoke('config:write', data),
});
