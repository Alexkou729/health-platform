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

  // 设备检测
  detectDevices: () => ipcRenderer.invoke('device:detect'),
  scanDevices: () => ipcRenderer.invoke('device:scan'),
  startDeviceGateway: (port?: number) => ipcRenderer.invoke('device:gateway:start', port),
  setDeviceLed: (mode: 'idle' | 'working') => ipcRenderer.invoke('device:led', mode),

  // PB-66 设备触发器
  pb66IsPresent: () => ipcRenderer.invoke('device:pb66:isPresent'),
  pb66Open: () => ipcRenderer.invoke('device:pb66:open'),
  pb66Start: () => ipcRenderer.invoke('device:pb66:start'),
  pb66Heartbeat: () => ipcRenderer.invoke('device:pb66:heartbeat'),
  pb66Stop: () => ipcRenderer.invoke('device:pb66:stop'),
  pb66Read: () => ipcRenderer.invoke('device:pb66:read'),
  pb66Cancel: () => ipcRenderer.invoke('device:pb66:cancel'),
  pb66Reset: () => ipcRenderer.invoke('device:pb66:reset'),

  // 体脂秤（BLE BIA）
  bodyScaleScan: (timeoutMs?: number) => ipcRenderer.invoke('bodyScale:scan', timeoutMs),
  bodyScaleConnect: (deviceId: string) => ipcRenderer.invoke('bodyScale:connect', deviceId),
  bodyScaleRead: (deviceId: string, customer: any) => ipcRenderer.invoke('bodyScale:read', deviceId, customer),
  bodyScaleDisconnect: (deviceId: string) => ipcRenderer.invoke('bodyScale:disconnect', deviceId),
  originalSystemLaunch: () => ipcRenderer.invoke('originalSystem:launch'),
  originalSystemScanLocal: () => ipcRenderer.invoke('originalSystem:scanLocal'),
  originalSystemDiscover: () => ipcRenderer.invoke('originalSystem:discover'),
  /** 完整检测周期：握手→状态→触发数据流→读帧→派生通道值 */
  pb66Run: (frameCount?: number) => ipcRenderer.invoke('device:pb66:run', frameCount),
  pb66Close: () => ipcRenderer.invoke('device:pb66:close'),
});
