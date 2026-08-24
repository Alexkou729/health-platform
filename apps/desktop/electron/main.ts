/**
 * Electron 主进程 (更新版 - 集成设备网关)
 */
import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { setupDeviceIpc, startDeviceGateway, detectDevices, RealHidDeviceDriver } from './device-gateway';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let gatewayProcess: any = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    title: '健康管理系统',
    backgroundColor: '#0a0e27',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
  setupIpcHandlers();
}

function setupIpcHandlers() {
  // 窗口控制
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // 外部
  ipcMain.handle('shell:open', (_, url) => shell.openExternal(url));

  // 文件
  ipcMain.handle('dialog:save', async (_, options) => {
    return await dialog.showSaveDialog(mainWindow!, options);
  });

  // 应用信息
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    userData: app.getPath('userData'),
  }));

  // 配置
  ipcMain.handle('config:read', () => {
    try {
      const configPath = path.join(app.getPath('userData'), 'config.json');
      return fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    } catch { return {}; }
  });

  ipcMain.handle('config:write', (_, data) => {
    try {
      fs.writeFileSync(path.join(app.getPath('userData'), 'config.json'), JSON.stringify(data, null, 2));
      return true;
    } catch { return false; }
  });

  // 设备相关 IPC
  setupDeviceIpc(mainWindow);
}

Menu.setApplicationMenu(null);

app.whenReady().then(() => {
  createWindow();

  // 自动检测设备
  detectDevices().then(devices => {
    if (devices.length > 0) {
      console.log('✅ 检测到 Quantum Analyzer 兼容设备:', devices);
      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow?.webContents.send('device:detected', devices);
        });
      }
    } else {
      console.log('ℹ️  未检测到 USB 设备，可启动模拟器');
    }
  });

  // 自动启动设备网关（模拟器模式）
  if (process.env.AUTO_GATEWAY !== 'false') {
    gatewayProcess = startDeviceGateway(mainWindow, 8888);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (gatewayProcess) {
    try { gatewayProcess.kill(); } catch {}
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (gatewayProcess) {
    try { gatewayProcess.kill(); } catch {}
  }
});
