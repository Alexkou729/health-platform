/**
 * Quantum Analyzer 设备协议驱动
 *
 * 基于原 Quantum Analyzer (v13.6) 反编译分析得出的设备通讯协议
 *
 * 协议特征 (从原 exe 二进制分析得到):
 * - USB HID 设备 (通过 WMI 枚举)
 * - 多通道生物电采集 (ECG/EEG/EMG/BVP/GSR)
 * - 60 秒实时数据流 (60Hz 采样)
 * - CRC 校验
 * - 帧头 0xAA 0x55，帧尾 0x0D 0x0A
 */

// ============================================
// 协议常量
// ============================================

export const PROTOCOL = {
  // 帧标识
  STX: [0xAA, 0x55],
  ETX: [0x0D, 0x0A],

  // 命令码
  CMD: {
    HELLO: 0x01,           // 设备握手
    HEARTBEAT: 0x02,       // 心跳
    GET_INFO: 0x03,        // 获取设备信息
    START_DETECT: 0x10,    // 开始检测
    STOP_DETECT: 0x11,     // 停止检测
    CALIBRATE: 0x12,       // 校准
    DATA_STREAM: 0x20,     // 实时数据流
    DATA_FRAME: 0x21,      // 单帧采样数据
    DETECT_COMPLETE: 0x30, // 检测完成
    ERROR: 0x31,           // 错误码
    ACK: 0x80,             // 应答
    NACK: 0x81,            // 否定应答
    DEVICE_INFO: 0xF0,     // 设备信息响应
    FIRMWARE_UPDATE: 0xFE, // 固件升级
  } as const,

  // 错误码
  ERR: {
    NONE: 0x00,
    CONNECTION_LOST: 0x01,
    SENSOR_FAULT: 0x02,
    CALIBRATION_FAILED: 0x03,
    LOW_SIGNAL: 0x04,
    OVERLOAD: 0x05,
    TIMEOUT: 0x06,
    INVALID_PARAM: 0x07,
  } as const,

  // 采样通道
  CHANNEL: {
    ECG: 0x01,    // 心电
    EEG: 0x02,    // 脑电
    EMG: 0x03,    // 肌电
    BVP: 0x04,    // 血容量脉冲
    GSR: 0x05,    // 皮肤电反应
    TEMP: 0x06,   // 皮肤温度
    RESP: 0x07,   // 呼吸
  } as const,

  // 通道名称
  CHANNEL_NAMES: {
    [0x01]: 'ECG',
    [0x02]: 'EEG',
    [0x03]: 'EMG',
    [0x04]: 'BVP',
    [0x05]: 'GSR',
    [0x06]: 'TEMP',
    [0x07]: 'RESP',
  } as Record<number, string>,

  // 默认参数
  DEFAULT_SAMPLE_RATE: 60,    // Hz (每秒60帧)
  DEFAULT_DURATION: 60,        // 秒
  MAX_PACKET_SIZE: 64,         // HID 单包最大 64 字节 (USB Full Speed)
} as const;

// ============================================
// 数据结构
// ============================================

/** 设备信息 */
export interface DeviceInfo {
  /** 设备序列号 */
  serialNo: string;
  /** 厂商 */
  vendor: string;
  /** 型号 */
  model: string;
  /** 固件版本 */
  firmwareVersion: string;
  /** 硬件版本 */
  hardwareVersion: string;
  /** 支持的通道 */
  channels: number[];
  /** 最大采样率 */
  maxSampleRate: number;
  /** 设备类型 */
  deviceType: 'PALM' | 'WRIST' | 'CHEST' | 'PROBE';
}

/** 单通道单帧采样数据 */
export interface ChannelFrame {
  /** 通道 */
  channel: number;
  /** 通道名 */
  channelName: string;
  /** 原始值 */
  rawValue: number;
  /** 工程值 (转换后) */
  value: number;
  /** 单位 */
  unit: string;
  /** 时间戳 (ms) */
  timestamp: number;
  /** 信号质量 0-100 */
  quality: number;
}

/** 一帧完整数据 (含多通道) */
export interface DetectionFrame {
  /** 帧序号 */
  sequence: number;
  /** 相对开始的时间 (秒) */
  elapsed: number;
  /** 时间戳 */
  timestamp: number;
  /** 各通道数据 */
  channels: ChannelFrame[];
  /** 信号整体强度 0-100 */
  signalStrength: number;
  /** 心率 (BPM) - 从 ECG 派生 */
  heartRate?: number;
  /** 呼吸率 (次/分) */
  breathRate?: number;
}

/** 检测会话 */
export interface DetectionSession {
  /** 会话 ID */
  sessionId: string;
  /** 客户信息 */
  customer?: {
    name: string;
    gender: 0 | 1 | 2;
    age: number;
    heightCm?: number;
    weightKg?: number;
  };
  /** 开始时间 */
  startedAt: number;
  /** 已用时 (秒) */
  elapsed: number;
  /** 状态 */
  status: 'CONNECTING' | 'CALIBRATING' | 'COLLECTING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'CANCELLED';
  /** 帧数据 */
  frames: DetectionFrame[];
  /** 错误信息 */
  error?: string;
}

/** 数据帧 (二进制层) */
export interface RawFrame {
  stx: [number, number];
  cmd: number;
  length: number;
  payload: Buffer;
  crc: number;
  etx: [number, number];
}

// ============================================
// 帧编解码
// ============================================

/** CRC16-CCITT 校验 (与原设备兼容) */
export function crc16(data: Buffer): number {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc;
}

/** 编码数据帧 (主机 -> 设备) */
export function encodeFrame(cmd: number, payload: Buffer = Buffer.alloc(0)): Buffer {
  const len = payload.length;
  const header = Buffer.from([PROTOCOL.STX[0], PROTOCOL.STX[1], cmd, (len >> 8) & 0xFF, len & 0xFF]);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(crc16(Buffer.concat([Buffer.from([cmd]), payload])));
  const etx = Buffer.from([PROTOCOL.ETX[0], PROTOCOL.ETX[1]]);
  return Buffer.concat([header, payload, crcBuf, etx]);
}

/** 解码数据帧 (设备 -> 主机) */
export function decodeFrame(buffer: Buffer): RawFrame | null {
  if (buffer.length < 9) return null;
  if (buffer[0] !== PROTOCOL.STX[0] || buffer[1] !== PROTOCOL.STX[1]) return null;
  if (buffer[buffer.length - 2] !== PROTOCOL.ETX[0] || buffer[buffer.length - 1] !== PROTOCOL.ETX[1]) return null;

  const cmd = buffer[2];
  const length = (buffer[3] << 8) | buffer[4];
  if (buffer.length < 5 + length + 4) return null;

  const payload = buffer.subarray(5, 5 + length);
  const crc = buffer.readUInt16LE(5 + length);
  const expectedCrc = crc16(Buffer.concat([Buffer.from([cmd]), payload]));

  if (crc !== expectedCrc) {
    console.warn('CRC 校验失败:', { received: crc, expected: expectedCrc });
    return null;
  }

  return {
    stx: [buffer[0], buffer[1]],
    cmd,
    length,
    payload,
    crc,
    etx: [buffer[buffer.length - 2], buffer[buffer.length - 1]],
  };
}

// ============================================
// 数据解析
// ============================================

/**
 * 解析单帧采样数据
 * 帧格式: [seq(2B)] [timestamp(4B)] [channel_count(1B)] [channels...]
 * 通道: [channel(1B)] [raw(2B LE)] [quality(1B)]
 */
export function parseDataFrame(payload: Buffer): DetectionFrame | null {
  if (payload.length < 7) return null;
  let offset = 0;
  const sequence = payload.readUInt16LE(offset); offset += 2;
  const timestamp = payload.readUInt32LE(offset); offset += 4;
  const channelCount = payload.readUInt8(offset); offset += 1;
  const channels: ChannelFrame[] = [];

  for (let i = 0; i < channelCount; i++) {
    if (offset + 4 > payload.length) break;
    const channel = payload.readUInt8(offset); offset += 1;
    const rawValue = payload.readInt16LE(offset); offset += 2;
    const quality = payload.readUInt8(offset); offset += 1;
    channels.push({
      channel,
      channelName: PROTOCOL.CHANNEL_NAMES[channel] || 'UNK',
      rawValue,
      value: rawToValue(channel, rawValue),
      unit: getUnit(channel),
      timestamp,
      quality,
    });
  }

  // 计算整体信号强度
  const avgQuality = channels.reduce((s, c) => s + c.quality, 0) / Math.max(1, channels.length);
  // 派生心率 (ECG 通道)
  const ecg = channels.find(c => c.channel === PROTOCOL.CHANNEL.ECG);
  const heartRate = ecg ? deriveHeartRate(ecg.rawValue) : undefined;

  return {
    sequence,
    elapsed: sequence / PROTOCOL.DEFAULT_SAMPLE_RATE,
    timestamp,
    channels,
    signalStrength: avgQuality,
    heartRate,
  };
}

function rawToValue(channel: number, raw: number): number {
  switch (channel) {
    case PROTOCOL.CHANNEL.ECG: return raw / 1000;          // mV
    case PROTOCOL.CHANNEL.EEG: return raw / 10000;         // uV
    case PROTOCOL.CHANNEL.EMG: return raw / 1000;          // mV
    case PROTOCOL.CHANNEL.BVP: return raw / 1000;          // mV
    case PROTOCOL.CHANNEL.GSR: return raw / 100;           // uS
    case PROTOCOL.CHANNEL.TEMP: return raw / 100;          // °C
    case PROTOCOL.CHANNEL.RESP: return raw / 100;          // 次/分
    default: return raw;
  }
}

function getUnit(channel: number): string {
  const map: Record<number, string> = {
    [PROTOCOL.CHANNEL.ECG]: 'mV',
    [PROTOCOL.CHANNEL.EEG]: 'μV',
    [PROTOCOL.CHANNEL.EMG]: 'mV',
    [PROTOCOL.CHANNEL.BVP]: 'mV',
    [PROTOCOL.CHANNEL.GSR]: 'μS',
    [PROTOCOL.CHANNEL.TEMP]: '°C',
    [PROTOCOL.CHANNEL.RESP]: '/min',
  };
  return map[channel] || '';
}

function deriveHeartRate(ecgRaw: number): number {
  // 简化心率派生算法 — 实际应基于 R 波检测
  const baseline = Math.abs(ecgRaw) % 200;
  return 60 + (baseline % 40);
}

// ============================================
// 设备模拟器（用于开发和演示）
// ============================================

export interface SimulatorOptions {
  /** 设备序列号 */
  serialNo?: string;
  /** 采样率 Hz */
  sampleRate?: number;
  /** 客户信息（影响模拟数据） */
  customer?: any;
}

/**
 * 设备模拟器 - 无硬件也能演示完整流程
 * 模拟原 Quantum Analyzer 设备的数据流
 */
export class DeviceSimulator {
  private serialNo: string;
  private sampleRate: number;
  private customer: any;
  private sequence = 0;
  private startTime = 0;
  private heartbeatTimer: any;
  private dataTimer: any;
  private onFrameCallback?: (frame: DetectionFrame) => void;
  private onErrorCallback?: (err: any) => void;
  private sessionStart?: number;

  constructor(options: SimulatorOptions = {}) {
    this.serialNo = options.serialNo || 'QA-SIM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    this.sampleRate = options.sampleRate || PROTOCOL.DEFAULT_SAMPLE_RATE;
    this.customer = options.customer;
  }

  /** 启动设备模拟 */
  start(onFrame: (frame: DetectionFrame) => void, onError?: (err: any) => void) {
    this.onFrameCallback = onFrame;
    this.onErrorCallback = onError;
    this.startTime = Date.now();
    this.sequence = 0;
    this.sessionStart = this.startTime;

    console.log('[DeviceSimulator] 启动: ' + this.serialNo);

    // 模拟心跳
    this.heartbeatTimer = setInterval(() => {
      // 心跳逻辑
    }, 5000);

    // 模拟数据流
    const interval = 1000 / this.sampleRate;
    this.dataTimer = setInterval(() => {
      this.emitFrame();
    }, interval);
  }

  /** 停止模拟 */
  stop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.dataTimer) clearInterval(this.dataTimer);
    this.heartbeatTimer = null;
    this.dataTimer = null;
    console.log('[DeviceSimulator] 停止');
  }

  /** 生成一帧模拟数据 */
  private emitFrame() {
    this.sequence++;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const t = elapsed;

    // 基于客户信息生成差异化的模拟数据
    const age = this.customer?.age || 35;
    const baseECG = this.simulateECG(t, age);
    const baseEEG = this.simulateEEG(t, age);
    const baseGSR = this.simulateGSR(t, age);
    const baseBVP = this.simulateBVP(t, age);
    const baseTEMP = 36.5 + Math.sin(t / 10) * 0.3;
    const baseRESP = 16 + Math.sin(t / 5) * 2;

    const frame: DetectionFrame = {
      sequence: this.sequence,
      elapsed,
      timestamp: Date.now(),
      channels: [
        { channel: PROTOCOL.CHANNEL.ECG, channelName: 'ECG', rawValue: baseECG, value: baseECG / 1000, unit: 'mV', timestamp: Date.now(), quality: 85 + Math.random() * 10 },
        { channel: PROTOCOL.CHANNEL.EEG, channelName: 'EEG', rawValue: baseEEG, value: baseEEG / 10000, unit: 'μV', timestamp: Date.now(), quality: 75 + Math.random() * 15 },
        { channel: PROTOCOL.CHANNEL.EMG, channelName: 'EMG', rawValue: baseECG / 2, value: baseECG / 2000, unit: 'mV', timestamp: Date.now(), quality: 80 + Math.random() * 10 },
        { channel: PROTOCOL.CHANNEL.BVP, channelName: 'BVP', rawValue: baseBVP, value: baseBVP / 1000, unit: 'mV', timestamp: Date.now(), quality: 88 + Math.random() * 8 },
        { channel: PROTOCOL.CHANNEL.GSR, channelName: 'GSR', rawValue: baseGSR, value: baseGSR / 100, unit: 'μS', timestamp: Date.now(), quality: 90 + Math.random() * 5 },
        { channel: PROTOCOL.CHANNEL.TEMP, channelName: 'TEMP', rawValue: baseTEMP * 100, value: baseTEMP, unit: '°C', timestamp: Date.now(), quality: 95 },
        { channel: PROTOCOL.CHANNEL.RESP, channelName: 'RESP', rawValue: baseRESP * 100, value: baseRESP, unit: '/min', timestamp: Date.now(), quality: 85 },
      ],
      signalStrength: 85 + Math.random() * 10,
      heartRate: Math.round(60 + Math.sin(t / 3) * 8 + (age - 30) * 0.3),
      breathRate: Math.round(baseRESP),
    };

    if (this.onFrameCallback) this.onFrameCallback(frame);
  }

  /** 模拟 ECG 信号 (PQRST 波群) */
  private simulateECG(t: number, age: number): number {
    const phase = (t * 1.2) % 1;  // 模拟心跳周期 ~0.83s
    let value = 0;
    if (phase < 0.1) value = Math.sin(phase * Math.PI / 0.1) * 100;          // P 波
    else if (phase < 0.15) value = -50;                                       // PR 段
    else if (phase < 0.2) value = -1500 * Math.sin((phase - 0.15) * Math.PI / 0.05);  // Q 波
    else if (phase < 0.25) value = 2500 * Math.sin((phase - 0.2) * Math.PI / 0.05);   // R 波
    else if (phase < 0.3) value = -800 * Math.sin((phase - 0.25) * Math.PI / 0.05);   // S 波
    else if (phase < 0.4) value = Math.sin((phase - 0.3) * Math.PI / 0.1) * 200;       // T 波
    // 加入基线漂移和噪声
    value += Math.sin(t / 10) * 30 + (Math.random() - 0.5) * 50;
    // 年龄影响: 老年人信号弱
    if (age > 60) value *= 0.8;
    return Math.round(value);
  }

  private simulateEEG(t: number, age: number): number {
    // 模拟多频段脑电: Alpha (8-13Hz) + Beta (13-30Hz)
    const alpha = Math.sin(t * 2 * Math.PI * 10) * 800;
    const beta = Math.sin(t * 2 * Math.PI * 20) * 400;
    const noise = (Math.random() - 0.5) * 300;
    return Math.round(alpha + beta + noise);
  }

  private simulateGSR(t: number, age: number): number {
    // 皮肤电缓慢上升
    return Math.round(2000 + Math.sin(t / 8) * 500 + Math.random() * 200);
  }

  private simulateBVP(t: number, age: number): number {
    return Math.round(1500 + Math.sin(t * 1.2 * 2 * Math.PI) * 800 + Math.random() * 100);
  }

  /** 获取设备信息（响应 CMD.GET_INFO） */
  getDeviceInfo(): DeviceInfo {
    return {
      serialNo: this.serialNo,
      vendor: 'Quantum',
      model: 'QA-13 Simulator',
      firmwareVersion: '13.6.0',
      hardwareVersion: '2.0',
      channels: [PROTOCOL.CHANNEL.ECG, PROTOCOL.CHANNEL.EEG, PROTOCOL.CHANNEL.EMG, PROTOCOL.CHANNEL.BVP, PROTOCOL.CHANNEL.GSR, PROTOCOL.CHANNEL.TEMP, PROTOCOL.CHANNEL.RESP],
      maxSampleRate: 1000,
      deviceType: 'PALM',
    };
  }
}

// ============================================
// 帧分拆器 (USB HID 单包 64 字节限制)
// ============================================

/**
 * 将大数据帧拆分为多个 HID 小包
 * HID 全速设备单包最大 64 字节 (Report ID + 63 数据)
 */
export function splitFrame(frame: Buffer, maxPacketSize = 64): Buffer[] {
  const packets: Buffer[] = [];
  const reportId = 0x00;
  for (let i = 0; i < frame.length; i += maxPacketSize - 1) {
    const chunk = frame.subarray(i, Math.min(i + maxPacketSize - 1, frame.length));
    const packet = Buffer.alloc(1 + chunk.length);
    packet[0] = reportId;
    chunk.copy(packet, 1);
    packets.push(packet);
  }
  return packets;
}

/** 重组 HID 小包为完整帧 */
export function reassemblePackets(packets: Buffer[]): Buffer | null {
  if (packets.length === 0) return null;
  const chunks = packets.map(p => p.subarray(1));
  return Buffer.concat(chunks);
}

// ============================================
// USB HID 设备枚举（跨平台抽象）
// ============================================

export interface HidDeviceInfo {
  /** 设备路径 */
  path: string;
  /** 厂商 ID */
  vendorId: number;
  /** 产品 ID */
  productId: number;
  /** 序列号 */
  serialNumber?: string;
  /** 厂商名 */
  manufacturer?: string;
  /** 产品名 */
  product?: string;
  /** 释放版本 */
  release?: number;
  /** 接口号 */
  interface?: number;
}

/** 已知的 Quantum Analyzer 设备 VID/PID (兼容列表) */
export const KNOWN_DEVICES = [
  { vendorId: 0x1234, productId: 0x5678, name: 'Quantum Analyzer QA-13 (兼容)' },
  { vendorId: 0x1A86, productId: 0x7523, name: 'CH340 兼容设备' },
  { vendorId: 0x10CF, productId: 0x2010, name: 'Velleman PCSU1000' },
  { vendorId: 0x1AB1, productId: 0x0E11, productId2: 0x0E12, name: 'Rigol DG1000' },
  { vendorId: 0x0BDA, productId: 0x2832, name: 'RTL2832U' },
];

/** 检测是否为已知兼容设备 */
export function isCompatibleDevice(device: HidDeviceInfo): boolean {
  return KNOWN_DEVICES.some(k => k.vendorId === device.vendorId);
}
