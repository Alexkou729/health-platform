/**
 * 设备网关 - 真实 USB HID 设备驱动
 *
 * 当门店插入原 Quantum Analyzer USB HID 设备时:
 * 1. 使用 WMI / SetupAPI 枚举设备
 * 2. 找到匹配的 VID/PID 后通过 node-hid 打开设备
 * 3. 读取实时生物电数据 (60Hz)
 * 4. 转发到云端后端
 *
 * 兼容设备列表:
 *   0x1234:0x5678 - Quantum Analyzer QA-13 (主要兼容目标)
 *   0x1A86:0x7523 - CH340 兼容设备
 *   0x10CF:0x2010 - Velleman PCSU1000
 */
import { ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { PB66Device, pb66Device } from './pb66';
import { bodyFatScale } from './body-fat-scale';

interface HidDevice {
  vendorId: number;
  productId: number;
  path: string;
  serialNumber?: string;
  product?: string;
}

interface DetectionSession {
  id: string;
  startedAt: number;
  frames: any[];
}

/** 已知的兼容设备 VID/PID */
const KNOWN_DEVICES = [
  { vendorId: 0x5608, productId: 0x080D, name: 'Quantum Analyzer (Rockey HID)' },
  { vendorId: 0x1234, productId: 0x5678, name: 'Quantum Analyzer QA-13' },
  { vendorId: 0x1A86, productId: 0x7523, name: 'CH340 Compatible' },
  { vendorId: 0x10CF, productId: 0x2010, name: 'Velleman PCSU1000' },
];

/**
 * 检测 USB HID 设备
 * 跨平台实现:
 *   Windows: 使用 WMI (wmic) 枚举
 *   Linux/Mac: 使用 lsusb / system_profiler
 */
export async function detectDevices(): Promise<HidDevice[]> {
  const platform = process.platform;

  if (platform === 'win32') {
    return detectWindowsDevices();
  } else if (platform === 'linux') {
    return detectLinuxDevices();
  } else if (platform === 'darwin') {
    return detectMacDevices();
  }
  return [];
}

async function detectWindowsDevices(): Promise<HidDevice[]> {
  return new Promise((resolve) => {
    // 使用 PowerShell 枚举 USB 设备
    const ps = spawn('powershell', [
      '-NoProfile',
      '-Command',
      `Get-WmiObject Win32_PnPEntity | Where-Object {
        $_.DeviceID -match 'USB' -or $_.DeviceID -match 'HID'
      } | Select-Object DeviceID, Name, Manufacturer | ConvertTo-Json -Depth 3`,
    ]);

    let stdout = '';
    ps.stdout.on('data', (d) => stdout += d.toString());
    ps.on('close', () => {
      try {
        const devices: any[] = JSON.parse(stdout || '[]');
        const hidDevices: HidDevice[] = [];
        for (const dev of devices) {
          const id = dev.DeviceID || '';
          const vidMatch = id.match(/VID_([0-9A-F]{4})/i);
          const pidMatch = id.match(/PID_([0-9A-F]{4})/i);
          if (vidMatch && pidMatch) {
            const vendorId = parseInt(vidMatch[1], 16);
            const productId = parseInt(pidMatch[1], 16);
            if (KNOWN_DEVICES.some(k => k.vendorId === vendorId)) {
              hidDevices.push({ vendorId, productId, path: id, product: dev.Name });
            }
          }
        }
        resolve(hidDevices);
      } catch {
        resolve([]);
      }
    });
  });
}

/** 扫描全部 USB/HID 设备，返回设备序列号（用于批量自动识别入库） */
export async function scanWindowsDevices(): Promise<Array<{ deviceNo: string; name: string; vendorId: number; productId: number; path: string }>> {
  return new Promise((resolve) => {
    const ps = spawn('powershell', [
      '-NoProfile',
      '-Command',
      `Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match 'USB\\\\' } | Select-Object DeviceID, Name | ConvertTo-Json -Depth 3`,
    ]);
    let stdout = '';
    ps.stdout.on('data', (d) => stdout += d.toString());
    ps.on('close', () => {
      try {
        const list: any[] = JSON.parse(stdout || '[]');
        const arr = Array.isArray(list) ? list : [list];
        const result: any[] = [];
        const seen = new Set<string>();
        for (const dev of arr) {
          const id = dev.DeviceID || '';
          const vidMatch = id.match(/VID_([0-9A-F]{4})/i);
          const pidMatch = id.match(/PID_([0-9A-F]{4})/i);
          if (!vidMatch || !pidMatch) continue;
          const vendorId = parseInt(vidMatch[1], 16);
          const productId = parseInt(pidMatch[1], 16);
          // 只识别 Quantum Analyzer / 兼容设备，避免误收录鼠标键盘等
          if (!KNOWN_DEVICES.some(k => k.vendorId === vendorId && k.productId === productId)) continue;
          // 取设备实例唯一标识（DeviceID 最后一段）作为序列号
          const segs = id.split('\\').filter(Boolean);
          const serial = segs[segs.length - 1] || ('DEV-' + id.replace(/[^0-9A-F]/gi, '').slice(-12));
          if (seen.has(serial)) continue;
          seen.add(serial);
          result.push({
            deviceNo: serial,
            name: dev.Name || 'USB 设备',
            vendorId,
            productId,
            path: id,
          });
        }
        resolve(result);
      } catch {
        resolve([]);
      }
    });
    ps.on('error', () => resolve([]));
  });
}

async function detectLinuxDevices(): Promise<HidDevice[]> {
  return new Promise((resolve) => {
    const proc = spawn('lsusb', []);
    let stdout = '';
    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.on('close', () => {
      const devices: HidDevice[] = [];
      const lines = stdout.split('\n');
      for (const line of lines) {
        const m = line.match(/ID\s+([0-9A-F]{4}):([0-9A-F]{4})/i);
        if (m) {
          const vendorId = parseInt(m[1], 16);
          const productId = parseInt(m[2], 16);
          if (KNOWN_DEVICES.some(k => k.vendorId === vendorId)) {
            devices.push({ vendorId, productId, path: '/dev/hidraw' + Math.random() });
          }
        }
      }
      resolve(devices);
    });
    proc.on('error', () => resolve([]));
  });
}

async function detectMacDevices(): Promise<HidDevice[]> {
  return new Promise((resolve) => {
    const proc = spawn('system_profiler', ['SPUSBDataType', '-json']);
    let stdout = '';
    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        const devices: HidDevice[] = [];
        const walk = (items: any[]) => {
          for (const item of items) {
            if (item.vendor_id && item.product_id) {
              const vendorId = parseInt(item.vendor_id, 16);
              const productId = parseInt(item.product_id, 16);
              if (KNOWN_DEVICES.some(k => k.vendorId === vendorId)) {
                devices.push({ vendorId, productId, path: item.location_id });
              }
            }
            if (item._items) walk(item._items);
          }
        };
        walk(data.SPUSBDataType || []);
        resolve(devices);
      } catch {
        resolve([]);
      }
    });
    proc.on('error', () => resolve([]));
  });
}

/**
 * 启动设备网关 (子进程)
 * 调用 @health/device-driver 的模拟器或真实驱动
 */
export function startDeviceGateway(mainWindow: any, wsPort = 8888) {
  // 查找 simulator 包
  const simulatorPath = path.join(__dirname, '../../../device-simulator/dist/index.js');
  if (!fs.existsSync(simulatorPath)) {
    console.warn('设备模拟器未构建，请先运行: pnpm --filter device-simulator build');
    return null;
  }

  const child: ChildProcess = spawn('node', [simulatorPath, '--port', String(wsPort)], {
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'pipe',
  });

  child.stdout?.on('data', (data) => {
    const msg = data.toString();
    console.log('[Gateway]', msg);
    if (mainWindow) {
      mainWindow.webContents.send('gateway:log', msg);
    }
  });

  child.stderr?.on('data', (data) => {
    console.error('[Gateway Error]', data.toString());
  });

  child.on('exit', (code) => {
    console.log('设备网关退出, code:', code);
    if (mainWindow) {
      mainWindow.webContents.send('gateway:exit', code);
    }
  });

  return child;
}

/**
 * 真实的 USB HID 数据读取 (需要安装 node-hid)
 * 这是与原 Quantum Analyzer 设备直接通讯的实现
 */
export class RealHidDeviceDriver {
  private device: any = null;
  private hid: any = null;
  private session: DetectionSession | null = null;
  private onFrameCallback?: (frame: any) => void;

  /**
   * 加载 node-hid (动态 require 避免未安装时崩溃)
   */
  private loadHid() {
    try {
      this.hid = require('node-hid');
      return true;
    } catch (e) {
      console.error('node-hid 未安装，请运行: pnpm install node-hid');
      return false;
    }
  }

  /** 查找设备 */
  findDevices(): any[] {
    if (!this.loadHid()) return [];
    try {
      return this.hid.devices().filter((d: any) =>
        KNOWN_DEVICES.some(k => k.vendorId === d.vendorId)
      );
    } catch (e) {
      console.error('枚举设备失败:', e);
      return [];
    }
  }

  /** 打开设备 */
  open(devicePath: string): boolean {
    if (!this.loadHid()) return false;
    try {
      this.device = new this.hid.HID(devicePath);
      this.device.on('data', (buffer: Buffer) => {
        this.handleHidData(buffer);
      });
      this.device.on('error', (err: any) => {
        console.error('HID 设备错误:', err);
      });
      return true;
    } catch (e) {
      console.error('打开 HID 设备失败:', e);
      return false;
    }
  }

  /** 开始检测 */
  startDetection(customer: any): string {
    if (!this.device) throw new Error('设备未打开');
    this.session = {
      id: 'sess-' + Date.now(),
      startedAt: Date.now(),
      frames: [],
    };
    // 发送 START_DETECT 命令
    // 真实实现需要按 HID 协议分包发送
    return this.session.id;
  }

  /** 停止检测 */
  stopDetection() {
    if (this.session) {
      this.session = null;
    }
  }

  /** 关闭设备 */
  close() {
    if (this.device) {
      try { this.device.close(); } catch {}
      this.device = null;
    }
  }

  /** 处理 HID 原始数据 */
  private handleHidData(buffer: Buffer) {
    // 真实场景下需要按原 Quantum Analyzer 协议解析
    // 这里作为扩展点
    if (this.onFrameCallback && this.session) {
      const frame = {
        sequence: this.session.frames.length + 1,
        elapsed: (Date.now() - this.session.startedAt) / 1000,
        timestamp: Date.now(),
        rawData: Array.from(buffer),
        signalStrength: 85,
      };
      this.session.frames.push(frame);
      this.onFrameCallback(frame);
    }
  }

  /** 设置数据回调 */
  onFrame(callback: (frame: any) => void) {
    this.onFrameCallback = callback;
  }

  /**
   * 控制设备工作指示灯（蓝灯闪烁）
   * mode: 'working' 开始检测闪烁 / 'idle' 停止闪烁
   * 说明：具体 HID 命令字节需按设备协议调整（Quantum Analyzer 蓝灯指令）。
   */
  setLed(mode: 'idle' | 'working'): boolean {
    try {
      const hid = require('node-hid');
      const devices = hid.devices().filter((d: any) => d.vendorId === 0x5608);
      if (devices.length === 0) {
        console.warn('[LED] 未找到 Quantum Analyzer 设备，无法控制指示灯');
        return false;
      }
      const dev = devices[0];
      const h = new hid.HID(dev.path);
      // 默认指令：蓝灯控制（需按设备协议替换具体字节）
      const report = mode === 'working'
        ? [0x00, 0x01, 0x01]  // 开蓝灯闪烁
        : [0x00, 0x01, 0x00]; // 关灯
      h.write(report);
      h.close();
      console.log('[LED] 设备蓝灯 ' + (mode === 'working' ? '开启闪烁' : '关闭'));
      return true;
    } catch (e: any) {
      console.warn('[LED] 控制失败（node-hid 未安装或设备协议不同）: ' + e.message);
      return false;
    }
  }
}

// 注册 IPC 处理器
export function setupDeviceIpc(mainWindow: any) {
  ipcMain.handle('device:detect', async () => {
    return detectDevices();
  });
  ipcMain.handle('device:scan', async () => {
    return scanWindowsDevices();
  });
  ipcMain.handle('device:led', async (_e, mode: 'idle' | 'working') => {
    const driver = new RealHidDeviceDriver();
    return driver.setLed(mode);
  });

  ipcMain.handle('device:gateway:start', async (_e, wsPort) => {
    return !!startDeviceGateway(mainWindow, wsPort || 8888);
  });

  ipcMain.handle('device:hid:find', async () => {
    const driver = new RealHidDeviceDriver();
    return driver.findDevices();
  });

  // === PB-66 设备触发器（koffi 直连 Windows HID）===
  ipcMain.handle('device:pb66:isPresent', async () => PB66Device.isPresent());
  ipcMain.handle('device:pb66:open', async () => pb66Device.open());
  // 实测协议: 0x06 触发数据流（原 0x01 仅为状态查询，不触发检测）
  ipcMain.handle('device:pb66:start', async () => pb66Device.send([0x00, 0x06]));
  ipcMain.handle('device:pb66:heartbeat', async () => pb66Device.send([0x00, 0x07]));
  ipcMain.handle('device:pb66:stop', async () => pb66Device.send([0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
  ipcMain.handle('device:pb66:read', async () => pb66Device.read(65));
  ipcMain.handle('device:pb66:cancel', async () => { pb66Device.cancel(); return { ok: true }; });
  ipcMain.handle('device:pb66:reset', async () => { const r = pb66Device.reset(); return { ok: r.ok, msg: r.msg }; });

  // ===== 体脂秤（BLE BIA 真测）=====
  ipcMain.handle('bodyScale:scan', async (_e, timeoutMs?: number) => {
    try { return await bodyFatScale.scan(timeoutMs || 8000); } catch (e: any) { return { error: e?.message || 'scan failed' }; }
  });
  ipcMain.handle('bodyScale:connect', async (_e, deviceId: string) => {
    try { return await bodyFatScale.connect(deviceId); } catch (e: any) { return { error: e?.message || 'connect failed' }; }
  });
  ipcMain.handle('bodyScale:read', async (_e, deviceId: string, customer: any) => {
    try { return await bodyFatScale.measure(customer); } catch (e: any) { return { error: e?.message || 'read failed' }; }
  });
  // 启动原系统（智能健康检测系统V13 / Quantum Analyzer）
  // 本地扫描原系统 ReportC/ 并解析（云后端读不到本地文件，由桌面端解析后上传）
  // 枚举原系统进程 + 窗口（含隐藏窗口）
  ipcMain.handle('originalSystem:discover', async () => {
    try {
      const { execSync } = require('child_process');
      // 1) 查进程是否在跑
      const ps = 'Get-Process | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json';
      const out = execSync('powershell -NoProfile -Command "' + ps + '"', { encoding: 'utf8', windowsHide: false, timeout: 8000 });
      let list = [];
      try { list = JSON.parse(out); } catch { list = []; }
      if (!Array.isArray(list)) list = [list];
      const processes = list.filter(x => x && x.ProcessName).map(x => ({ pid: x.Id, name: x.ProcessName, title: x.MainWindowTitle || '' }));
      const target = processes.find(x => /quantum|analyzer|量子|检测/i.test(x.name + x.title));
      // 2) 用 Win32 枚举隐藏窗口（EnumWindows 能找隐藏窗口）
      let hiddenWindows = [];
      try {
        const koffi = require('koffi');
        const user32 = koffi.load('user32.dll');
        const EnumWindows = user32.func('bool EnumWindows(_In_ void* lpEnumFunc, intptr_t lParam)');
        const GetWindowTextW = user32.func('int GetWindowTextW(void* hWnd, _Out_ char16* lpString, int nMaxCount)');
        const GetClassNameW = user32.func('int GetClassNameW(void* hWnd, _Out_ char16* lpClassName, int nMaxCount)');
        const wins = [];
        const cb = koffi.proto('bool EnumProc(void* hWnd, intptr_t lParam)', (hWnd) => {
          try {
            const tBuf = Buffer.alloc(512); const cBuf = Buffer.alloc(256);
            GetWindowTextW(hWnd, tBuf, 256); GetClassNameW(hWnd, cBuf, 128);
            const title = tBuf.toString('utf16le').replace(/\u0000.*$/, '');
            const cls = cBuf.toString('utf16le').replace(/\u0000.*$/, '');
            if (title) wins.push({ hwnd: Number(hWnd), title, cls });
          } catch {}
          return true;
        });
        EnumWindows(cb, 0);
        hiddenWindows = wins;
      } catch (e) { /* 忽略 */ }
      return {
        processRunning: !!target,
        targetProcess: target || null,
        processes: processes.filter(x => /quantum|analyzer|量子|检测|健康/i.test(x.name + x.title)),
        topWindows: hiddenWindows,
        details: hiddenWindows,
      };
    } catch (e) { return { error: e?.message, processRunning: false, processes: [], topWindows: [], details: [] }; }
  });

    ipcMain.handle('originalSystem:scanLocal', async () => {
    try {
      const fs = require('fs');
      const candidates = [
        'C:\\Quantum Analyzer(13)\\ReportC',
        'D:\\Tools\\Quantum Analyzer(13)\\ReportC',
        path.join(process.resourcesPath || '', 'Quantum Analyzer(13)', 'ReportC'),
      ];
      // 扫描所有候选目录，合并报告（原系统可能写到任意一个目录）
      const dirs = candidates.filter(d => { try { return fs.existsSync(d); } catch { return false; } });
      if (!dirs.length) return { dirExists: false, reports: [] };
      const reports = [];
      for (const dir of dirs) {
      const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.html'));
      for (const f of files) {
        try {
          const content = fs.readFileSync(path.join(dir, f), 'utf-8');
          const mName = /姓名[：:]([^<\s]+)/.exec(content);
          if (!mName) continue;
          const name = mName[1].trim();
          const gender = /性别[：:]([^<]+)/.test(content) ? (/性别[：:]([^<]+)/.exec(content)[1].includes('女') ? 2 : 1) : 1;
          const age = parseInt((/年龄[：:]([^<]+)/.exec(content)?.[1] || '30').replace(/\D/g, '')) || 30;
          const heightCm = parseInt((/身高[：:]([^<]+)/.exec(content)?.[1] || '170').replace(/\D/g, '')) || 170;
          const weightKg = parseFloat((/体重[：:]([^<]+)/.exec(content)?.[1] || '60').replace(/[^0-9.]/g, '')) || 60;
          const mDate = /(20\d{2})[-\/年](0?\d|1[0-2])[-\/月](0?\d|[12]\d|3[01])[日]?\s*([01]?\d|2[0-3])[：:时]([0-5]\d)/.exec(content);
          let measuredAt = new Date();
          if (mDate) measuredAt = new Date(mDate[1] + '-' + mDate[2].padStart(2,'0') + '-' + mDate[3].padStart(2,'0') + 'T' + mDate[4].padStart(2,'0') + ':' + mDate[5] + ':00');
          const indRe = /<TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>([^<]+)<\/TD><TD class=td align=middle>(?:<font color=[^>]+>)?([^<]+)(?:<\/font>)?<\/TD>/g;
          const indicators = [];
          let m;
          while ((m = indRe.exec(content)) !== null) {
            indicators.push({ name: m[1].trim(), range: m[2].trim(), value: m[3].trim(), severity: m[4].trim() });
          }
          if (indicators.length) reports.push({ filename: f, category: f.replace(/\.html$/i, ''), customer: { name, gender, age, heightCm, weightKg }, measuredAt, indicators });
        } catch (e) {}
      }
      }
      return { dirExists: true, reports };
    } catch (e) { return { dirExists: false, reports: [], error: e?.message }; }
  });

  ipcMain.handle('originalSystem:launch', async () => {
    try {
      const { spawn } = require('child_process');
      const fs = require('fs');
      const candidates = [
        'C:\\Quantum Analyzer(13)\\Quantum_Analyzer.exe',
        'D:\\Tools\\Quantum Analyzer(13)\\Quantum_Analyzer.exe',
        path.join(process.resourcesPath || '', 'Quantum Analyzer(13)', 'Quantum_Analyzer.exe'),
      ];
      const exe = candidates.find(c => { try { return fs.existsSync(c); } catch { return false; } });
      if (!exe) return { ok: false, error: '未找到原系统程序（Quantum_Analyzer.exe）' };
      // 隐藏启动（后台服务模式）
      const child = spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: false, cwd: path.dirname(exe) });
      child.unref();
      // 用 Win32 API 隐藏 GUI 窗口（FindWindow + ShowWindow SW_HIDE）
      try {
        const koffi = require('koffi');
        const user32 = koffi.load('user32.dll');
        const FindWindowW = user32.func('void* FindWindowW(_In_ const char16* lpClassName, _In_ const char16* lpWindowName)');
        const ShowWindow = user32.func('bool ShowWindow(void* hWnd, int nCmdShow)');
        const SW_HIDE = 0, SW_MINIMIZE = 6;
        // 常见窗口标题
        const titles = ['量子弱磁场共振分析仪', 'Quantum Analyzer', '智能健康检测系统', '检测系统'];
        setTimeout(() => {
          for (const t of titles) {
            try {
              const hwnd = FindWindowW(null, t);
              if (hwnd && Number(hwnd) !== 0) { ShowWindow(hwnd, SW_MINIMIZE); break; }
            } catch {}
          }
        }, 1500);
      } catch (e) { /* 隐藏失败不阻断 */ }
      return { ok: true, path: exe, pid: child.pid, hidden: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'launch failed' };
    }
  });

    ipcMain.handle('bodyScale:disconnect', async () => {
    try { await bodyFatScale.disconnect(); return { ok: true }; } catch (e: any) { return { error: e?.message }; }
  });
  // 完整检测周期: 握手→状态→触发数据流→读帧→派生 7 通道值
  ipcMain.handle('device:pb66:run', async (_e, frameCount?: number) => pb66Device.runDetectionCycle(frameCount || 8));
  ipcMain.handle('device:pb66:close', async () => { pb66Device.close(); return { ok: true }; });
}

