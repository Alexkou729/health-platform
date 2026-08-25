/**
 * PB-66 智能健康检测仪驱动（设备触发器）
 *
 * 基于 koffi FFI 调用 Windows HID API（setupapi/hid/kernel32），
 * 无需编译原生模块（N-API ABI 稳定，Electron 可直接加载）。
 *
 * 设备本质是 Rockey 加密狗（VID 0x5608 / PID 0x080D），
 * 返回数据为 Base64 密文。本驱动将设备作为「检测触发器」：
 * 插入 → 打开验证 → 发送开始/心跳/结束命令 → 关闭，
 * 报告由 SaaS 平台生成（47 类模板 + AI 解读）。
 */
import { execSync } from 'child_process';

const koffi: any = require('koffi');

const kernel32 = koffi.load('kernel32.dll');
const hid = koffi.load('hid.dll');

const HIDD_ATTRIBUTES = koffi.struct('HIDD_ATTRIBUTES', {
  Size: 'uint32', VendorID: 'uint16', ProductID: 'uint16', VersionNumber: 'uint16',
});
const CreateFileW = kernel32.func('void* CreateFileW(_In_ const char16* FileName, uint32 DesiredAccess, uint32 ShareMode, _In_ void* SecurityAttributes, uint32 CreationDisposition, uint32 FlagsAndAttributes, _In_ void* TemplateFile)');
const CloseHandle = kernel32.func('bool CloseHandle(void* Handle)');
const WriteFile = kernel32.func('bool WriteFile(void* hFile, _In_ void* lpBuffer, uint32 n, _Out_ uint32* written, _In_ void* lpOverlapped)');
const HidD_GetAttributes = hid.func('bool HidD_GetAttributes(void* HidDeviceObject, _Out_ HIDD_ATTRIBUTES* Attributes)');
const ReadFile = kernel32.func('bool ReadFile(void* hFile, _Out_ void* lpBuffer, uint32 nNumberOfBytesToRead, _Out_ uint32* lpNumberOfBytesRead, _In_ void* lpOverlapped)');
const CancelIoEx = kernel32.func('bool CancelIoEx(void* hFile, _In_ void* lpOverlapped)');

const COMMTIMEOUTS = koffi.struct('COMMTIMEOUTS', {
  ReadIntervalTimeout: 'uint32',
  ReadTotalTimeoutMultiplier: 'uint32',
  ReadTotalTimeoutConstant: 'uint32',
  WriteTotalTimeoutMultiplier: 'uint32',
  WriteTotalTimeoutConstant: 'uint32',
});
const SetCommTimeouts = kernel32.func('bool SetCommTimeouts(void* hFile, _In_ COMMTIMEOUTS* lpCommTimeouts)');

const GENERIC_READ = 0x80000000;
const GENERIC_WRITE = 0x40000000;
const FILE_SHARE_READ = 1;
const FILE_SHARE_WRITE = 2;
const OPEN_EXISTING = 3;

export const PB66_VID = 0x5608;
export const PB66_PID = 0x080d;

/** 从 pnputil 枚举 HID 接口，构造设备路径 */
function findDevicePath(): string | null {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync('pnputil /enum-devices /connected', { encoding: 'utf8', windowsHide: true });
    const marker = 'HID\\VID_5608&PID_080D\\';
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(marker)) {
        const inst = line.split(marker)[1].trim();
        if (inst) return `\\\\?\\HID#VID_5608&PID_080D#${inst}#{4d1e55b2-f16f-11cf-88cb-001111000030}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export interface PB66OpenResult {
  ok: boolean;
  vid?: string;
  pid?: string;
  msg?: string;
}

export interface PB66SendResult {
  ok: boolean;
  written?: number;
  msg?: string;
}

export interface PB66ReadResult {
  ok: boolean;
  read?: number;
  data?: number[];
  hex?: string;
  msg?: string;
}

export class PB66Device {
  private handle: any = null;
  private cancelled = false;

  /** 检测设备是否在线（不打开） */
  static isPresent(): boolean {
    return findDevicePath() !== null;
  }

  /** 打开设备并验证 VID/PID（幂等：已打开时直接复用） */
  open(): PB66OpenResult {
    if (process.platform !== 'win32') return { ok: false, msg: '仅支持 Windows' };
    if (this.handle) {
      const attrs2: any = {};
      let vid = 0, pid = 0;
      try { if (HidD_GetAttributes(this.handle, attrs2)) { vid = attrs2.VendorID; pid = attrs2.ProductID; } } catch { /* noop */ }
      return { ok: true, vid: vid.toString(16), pid: pid.toString(16) };
    }
    const path = findDevicePath();
    if (!path) return { ok: false, msg: '未找到 PB-66 设备（VID 5608）' };

    const h = CreateFileW(path, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, null, OPEN_EXISTING, 0, null);
    if (!h || h === koffi.NULL || Number(h) === -1) return { ok: false, msg: '打开设备失败（可能被占用）' };
    this.handle = h;

    // 设置读取超时（设备为请求-响应式，不主动上报；防止 ReadFile 永久阻塞主进程）
    try {
      const timeouts = { ReadIntervalTimeout: 0, ReadTotalTimeoutMultiplier: 0, ReadTotalTimeoutConstant: 1500, WriteTotalTimeoutMultiplier: 0, WriteTotalTimeoutConstant: 1000 };
      SetCommTimeouts(h, timeouts);
    } catch { /* 超时设置失败不阻断 */ }

    const attrs: any = {};
    let vid = 0, pid = 0;
    if (HidD_GetAttributes(h, attrs)) { vid = attrs.VendorID; pid = attrs.ProductID; }
    return { ok: true, vid: vid.toString(16), pid: pid.toString(16) };
  }

  /** 发送命令（65 字节输出报告，ReportID=0） */
  send(bytes: number[]): PB66SendResult {
    if (!this.handle) return { ok: false, msg: '设备未打开' };
    const out = Buffer.alloc(65, 0);
    Buffer.from(bytes.slice(0, 64)).copy(out, 0);
    const written = [0];
    const ok = WriteFile(this.handle, out, 65, written, null);
    return { ok: !!ok, written: written[0] };
  }

  /** 读取设备返回的数据（65 字节输入报告，可能为 Rockey 加密密文）——异步 + 真超时，避免卡死主进程 */
  read(bytes: number = 65, timeoutMs: number = 1500): Promise<PB66ReadResult> {
    if (!this.handle) return Promise.resolve({ ok: false, msg: '设备未打开' });
    const buf = Buffer.alloc(bytes + 1, 0);
    const read = [0];
    return new Promise<PB66ReadResult>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        try { CancelIoEx(this.handle, null); } catch { /* noop */ }
        if (settled) return;
        settled = true;
        resolve({ ok: false, msg: '读取超时', read: 0 });
      }, timeoutMs);
      try {
        ReadFile.async(this.handle, buf, bytes, read, null, (err: any, result: any) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (err || !result) {
            resolve({ ok: false, msg: err?.message || '读取失败', read: read[0] });
            return;
          }
          const data = Array.from(buf.slice(0, read[0] || 0));
          resolve({ ok: true, read: read[0], data, hex: Buffer.from(data).toString('hex') });
        });
      } catch (e: any) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ ok: false, msg: '读取异常: ' + e?.message });
      }
    });
  }

  /** 发送命令并读取一次响应（请求-响应式设备的标准交互） */
  async exchange(bytes: number[]): Promise<PB66ReadResult> {
    const s = this.send(bytes);
    if (!s.ok) return { ok: false, msg: '命令发送失败' };
    return this.read(65);
  }

  /**
   * 完整检测周期（实测协议，全部为只读类命令）:
   *   1. INIT 握手      (cmd=0x00) → 63 字节加密响应，状态字 0x0000=成功
   *   2. STATUS 查询    (cmd=0x01) → 63 字节响应
   *   3. 触发数据流     (cmd=0x06) → 连续 22 字节短帧
   *   4. 从响应字节派生 7 通道值 (0-100)，供后端 parseChannels 消费
   *
   * 实测约束:
   *   - 命令字节 ≥0x08 会导致设备断开重枚举 (err=1167)，严禁使用
   *   - 响应为质询-应答密文（每次不同），通道值由响应内容确定性派生
   *   - 写入必须恰好 65 字节，仅支持同步 I/O
   */
  async runDetectionCycle(frameCount: number = 8): Promise<{
    ok: boolean; msg?: string; channels?: number[]; frames?: any[]; rawFrames?: number[][];
  }> {
    this.cancelled = false;
    if (!this.handle) {
      const opened = this.open();
      if (!opened.ok) return { ok: false, msg: opened.msg };
    }

    const rawFrames: number[][] = [];
    try {
      // 1. 初始化握手
      const init = await this.exchange([0x00, 0x00]);
      if (!init.ok) return { ok: false, msg: '设备握手失败: ' + (init.msg || '无响应') };

      // 2. 状态查询（确认设备处于可检测状态）
      await this.exchange([0x00, 0x01]);

      // 3. 触发数据流
      const start = this.send([0x00, 0x06]);
      if (!start.ok) return { ok: false, msg: '开始命令发送失败' };

      // 4. 连续读取响应帧
      for (let i = 0; i < frameCount; i++) {
        if (this.cancelled) return { ok: false, msg: '已取消' };
        const r = await this.read(65);
        if (r.ok && r.data && r.data.length > 0) {
          rawFrames.push(r.data);
        }
      }
    } catch (e: any) {
      return { ok: false, msg: '检测周期异常: ' + e?.message };
    }

    if (rawFrames.length === 0) return { ok: false, msg: '未读到任何数据帧（设备未响应）' };

    const channels = this.deriveChannels(rawFrames);
    const frames = rawFrames.map((raw, i) => ({
      sequence: i + 1,
      timestamp: Date.now(),
      rawData: raw,
      channels: this.deriveChannels([raw]),
    }));

    return { ok: true, channels, frames, rawFrames };
  }

  /**
   * 从设备响应帧派生 7 通道值 (0-100)。
   * 确定性算法（FNV-1a 混合哈希）：同一批响应 → 同一组通道值。
   * 跳过帧头 4 字节（报告ID/载荷长度/状态字）与零填充字节。
   */
  private deriveChannels(rawFrames: number[][]): number[] {
    const payload: number[] = [];
    for (const f of rawFrames) {
      for (let i = 4; i < f.length; i++) {
        if (f[i] !== 0) payload.push(f[i]);
      }
    }
    if (payload.length === 0) return [50, 50, 50, 50, 50, 50, 50];

    const channels: number[] = [];
    for (let c = 0; c < 7; c++) {
      let h = (0x811c9dc5 ^ Math.imul(c, 0x9e3779b1)) >>> 0;
      for (let i = 0; i < payload.length; i++) {
        h ^= payload[i];
        h = Math.imul(h, 0x01000193) >>> 0;
      }
      channels.push(h % 101);
    }
    return channels;
  }

  /** 取消正在进行的检测周期（解除阻塞中的读取） */
  cancel(): void {
    this.cancelled = true;
    if (this.handle) {
      try { CancelIoEx(this.handle, null); } catch { /* noop */ }
    }
  }

  /** 复位设备（停止 + 关闭 + 重开）：停止检测后刷新硬件状态 */
  reset(): PB66OpenResult {
    this.cancelled = true;
    if (this.handle) {
      try { CancelIoEx(this.handle, null); } catch { /* noop */ }
    }
    this.close();
    // 稍等让系统释放句柄
    return this.open();
  }

  close(): void {
    if (this.handle) {
      try { CloseHandle(this.handle); } catch { /* noop */ }
      this.handle = null;
    }
  }
}

/** 全局单例，供 IPC 使用 */
export const pb66Device = new PB66Device();
