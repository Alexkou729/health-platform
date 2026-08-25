/**
 * Rockey HID Dongle Driver for Quantum Analyzer
 * 
 * 实测协议规格:
 * - VID: 0x5608, PID: 0x080D
 * - 同步 HID 通信（不支持 Overlapped I/O）
 * - 65 字节帧（1 字节 Report ID + 64 字节数据）
 * - 命令格式: [00][CMD][PARAM...][00填充]
 * - 响应格式: [00][LEN][FLAGS][BASE64_PAYLOAD]
 *   FLAGS: 0x0000=成功, 0xFFFF=失败
 * 
 * 依赖: node-hid (^3.1.0)
 * 安装: npm install node-hid && npx electron-rebuild
 */

import HID from 'node-hid';

// ===== 设备识别常量 =====
export const ROCKEY_VID = 0x5608;
export const ROCKEY_PID = 0x080d;
export const REPORT_SIZE = 65; // 1字节报告ID + 64字节数据
export const DATA_SIZE = 64;

// ===== 命令定义（实测验证） =====
export enum RockeyCommand {
  /** 初始化/握手 - 返回63字节加密响应 */
  INIT = 0x00,
  /** 查询状态 - 返回63字节加密响应 */
  STATUS = 0x01,
  /** 查询A - 返回63字节加密响应 */
  QUERY_A = 0x03,
  /** 查询B - 返回63字节加密响应 */
  QUERY_B = 0x04,
  /** 触发数据流（检测模式）- 返回连续22字节帧 */
  START_STREAM = 0x06,
  /** 单次读取 - 返回22字节响应 */
  SINGLE_READ = 0x07,
  // 注意: 0x08 及以上命令会导致设备断开 (err=1167)，禁止使用
}

// ===== 响应状态 =====
export enum RockeyStatus {
  SUCCESS = 0x0000,
  FAILURE = 0xffff,
}

// ===== 响应结构 =====
export interface RockeyResponse {
  /** 报告ID（固定0） */
  reportId: number;
  /** 载荷长度 */
  payloadLength: number;
  /** 状态标志 */
  flags: RockeyStatus;
  /** 原始载荷（base64编码） */
  rawPayload: Buffer;
  /** base64解码后的数据 */
  decodedPayload: Buffer | null;
  /** 原始完整响应 */
  raw: Buffer;
}

// ===== 设备信息 =====
export interface RockeyDeviceInfo {
  vendorId: number;
  productId: number;
  path: string;
  manufacturer?: string;
  product?: string;
  serialNumber?: string;
  usage?: number;
  usagePage?: number;
}

/**
 * Rockey 加密狗驱动
 * 
 * 使用方式:
 * ```
 * const driver = new RockeyDriver();
 * if (await driver.open()) {
 *   const resp = await driver.sendCommand(RockeyCommand.INIT);
 *   driver.close();
 * }
 * ```
 */
export class RockeyDriver {
  private device: HID.HID | null = null;
  private _connected = false;
  private _devicePath: string | null = null;

  get connected(): boolean {
    return this._connected;
  }

  get devicePath(): string | null {
    return this._devicePath;
  }

  /**
   * 枚举系统中的 Rockey 设备
   */
  static findDevices(): RockeyDeviceInfo[] {
    try {
      const devices = HID.devices();
      return devices
        .filter((d) => d.vendorId === ROCKEY_VID && d.productId === ROCKEY_PID)
        .map((d) => ({
          vendorId: d.vendorId,
          productId: d.productId,
          path: d.path,
          manufacturer: d.manufacturer,
          product: d.product,
          serialNumber: d.serialNumber,
          usage: d.usage,
          usagePage: d.usagePage,
        }));
    } catch {
      return [];
    }
  }

  /**
   * 打开设备
   * 注意: node-hid 默认使用同步模式，这正是该设备要求的
   */
  async open(): Promise<boolean> {
    if (this._connected) return true;

    const devices = RockeyDriver.findDevices();
    if (devices.length === 0) {
      throw new Error('ROCKEY device not found (VID=0x5608, PID=0x080D)');
    }

    const target = devices[0];
    try {
      this.device = new HID.HID(target.path);
      this._connected = true;
      this._devicePath = target.path;

      // 设置读取超时（node-hid 不直接支持超时，用 setTimeout 包装）
      return true;
    } catch (err) {
      this._connected = false;
      throw new Error(`Failed to open ROCKEY device: ${(err as Error).message}`);
    }
  }

  /**
   * 发送命令并读取单个响应
   * @param cmd 命令字节
   * @param params 额外参数（可选）
   * @param timeoutMs 读取超时（默认2000ms）
   */
  async sendCommand(
    cmd: RockeyCommand,
    params?: Buffer,
    timeoutMs = 2000
  ): Promise<RockeyResponse | null> {
    if (!this.device || !this._connected) {
      throw new Error('Device not open');
    }

    // 构建64字节命令数据: [CMD][PARAM...][00填充]
    const cmdData = Buffer.alloc(DATA_SIZE, 0);
    cmdData[0] = cmd;
    if (params && params.length > 0) {
      params.copy(cmdData, 1, 0, Math.min(params.length, DATA_SIZE - 1));
    }

    // 写入（node-hid 的 write 会自动添加报告ID前缀）
    // node-hid write 期望的数据不包含报告ID
    try {
      this.device.write([...cmdData]);
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('1167') || msg.includes('disconnect')) {
        this._connected = false;
        throw new Error('Device disconnected (too many commands sent)');
      }
      throw err;
    }

    // 读取响应（带超时）
    return this.readResponse(timeoutMs);
  }

  /**
   * 读取单个响应（带超时）
   */
  private async readResponse(timeoutMs = 2000): Promise<RockeyResponse | null> {
    if (!this.device) return null;

    return new Promise<RockeyResponse | null>((resolve) => {
      const timer = setTimeout(() => {
        // node-hid 同步读取无法真正中断，但标记超时
        resolve(null);
      }, timeoutMs);

      try {
        // node-hid 同步读取（阻塞）
        const data = this.device.readTimeout(timeoutMs);
        clearTimeout(timer);

        if (!data || data.length === 0) {
          resolve(null);
          return;
        }

        const buf = Buffer.from(data);
        resolve(this.parseResponse(buf));
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  /**
   * 解析响应
   * 格式: [00][LEN][FLAGS_HI][FLAGS_LO][PAYLOAD...]
   */
  private parseResponse(raw: Buffer): RockeyResponse {
    const reportId = raw[0] ?? 0;
    const payloadLength = raw[1] ?? 0;
    const flags = ((raw[2] ?? 0) << 8) | (raw[3] ?? 0);
    const rawPayload = raw.slice(4);

    // 尝试 base64 解码载荷
    let decodedPayload: Buffer | null = null;
    const asciiPart = rawPayload
      .filter((b) => b >= 32 && b < 127)
      .toString('ascii')
      .trim();
    if (asciiPart.length > 4) {
      try {
        // 补齐 base64 padding
        const padded = asciiPart + '='.repeat((4 - (asciiPart.length % 4)) % 4);
        decodedPayload = Buffer.from(padded, 'base64');
      } catch {
        decodedPayload = null;
      }
    }

    return {
      reportId,
      payloadLength,
      flags: flags as RockeyStatus,
      rawPayload,
      decodedPayload,
      raw,
    };
  }

  /**
   * 触发检测数据流
   * 发送 START_STREAM 命令后连续读取响应帧
   * 
   * @param onFrame 每帧回调（22字节短帧）
   * @param maxFrames 最大读取帧数（默认20）
   * @param frameIntervalMs 帧间隔（默认100ms）
   */
  async startDetectionStream(
    onFrame: (frame: Buffer, index: number) => void,
    maxFrames = 20,
    frameIntervalMs = 100
  ): Promise<Buffer[]> {
    if (!this.device || !this._connected) {
      throw new Error('Device not open');
    }

    // 发送 START_STREAM 命令
    const cmdData = Buffer.alloc(DATA_SIZE, 0);
    cmdData[0] = RockeyCommand.START_STREAM;
    this.device.write([...cmdData]);

    // 连续读取响应帧
    const frames: Buffer[] = [];
    for (let i = 0; i < maxFrames; i++) {
      await this.sleep(frameIntervalMs);

      try {
        const data = this.device.readTimeout(800);
        if (!data || data.length === 0) break;

        const buf = Buffer.from(data);
        frames.push(buf);
        onFrame(buf, i);
      } catch {
        break;
      }
    }

    return frames;
  }

  /**
   * 执行完整检测流程
   * 1. 初始化
   * 2. 触发数据流
   * 3. 收集所有帧
   */
  async performFullDetection(
    onProgress?: (progress: number, frame?: Buffer) => void
  ): Promise<{ frames: Buffer[]; raw: Buffer }> {
    // Step 1: 初始化
    onProgress?.(0);
    const initResp = await this.sendCommand(RockeyCommand.INIT);
    if (!initResp || initResp.flags !== RockeyStatus.SUCCESS) {
      throw new Error('Device initialization failed');
    }
    onProgress?.(5);

    // Step 2: 查询状态
    const statusResp = await this.sendCommand(RockeyCommand.STATUS);
    onProgress?.(10);

    // Step 3: 触发数据流
    const frames = await this.startDetectionStream((frame, idx) => {
      const progress = 10 + Math.round((idx / 20) * 85);
      onProgress?.(progress, frame);
    }, 20, 100);

    onProgress?.(100);

    // 合并所有帧
    const raw = Buffer.concat(frames);
    return { frames, raw };
  }

  /**
   * 关闭设备
   */
  close(): void {
    if (this.device) {
      try {
        this.device.close();
      } catch {
        // ignore
      }
      this.device = null;
    }
    this._connected = false;
    this._devicePath = null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
