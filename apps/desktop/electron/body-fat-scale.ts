/**
 * 小米/云麦 XMTZC01YM 八电极体脂秤 驱动
 *
 * 实现基于 Vanuan/yunmai-noble 开源协议（XMTZC01YM 是 0xFE95 新协议，但包结构类似）：
 *   [0] packetSignature  1B
 *   [1] firmwareVersion  1B
 *   [2] packetLength     1B
 *   [3] packetType       1B  (1=measuring, 2=measured)
 *   [4..N] data          (big-endian, packetLength-5 bytes)
 *   [N+1] checksum       1B
 *
 * 测量完成数据 (packetType=2) 大致结构:
 *   [0]    historicalInfo  1B
 *   [1-4]  date            uint32 BE
 *   [5-8]  userId          uint32 BE
 *   [9-10] weight          uint16 BE /100 = kg
 *   [11-12]resistance      uint16 BE  阻抗
 *   [13-14]fatPercentage   uint16 BE /100
 *   [15+...] 其他 (8 电极会带 8 段成分,体水分,肌肉量等)
 */
import { EventEmitter } from 'events';

// ===== BLE UUID (XMTZC01YM 新协议) =====
const SERVICE_YUNMAI = '0000fe95-0000-1000-8000-00805f9b34fb'; // Xiaomi Inc.
const CHARS = {
  '0050': '00000050-0000-1000-8000-00805f9b34fb', // read: 设备配置
  '0051': '00000051-0000-1000-8000-00805f9b34fb', // write+notify: 体成分
  '0052': '00000052-0000-1000-8000-00805f9b34fb', // write+notify: 实时体重
  '0081': '00001881-0000-1000-8000-00805f9b34fb', // notify: 实时通知
  '0082': '00001882-0000-1000-8000-00805f9b34fb', // write: 命令
};
const NAME_MATCH = ['XMTZC01YM', 'Mi Body Scale', 'YUNMAI', '8-Electrode'];

export interface ScaleDevice {
  id: string; name: string; rssi: number; model?: string;
}

export interface BodyCompositionData {
  weightKg?: number;
  bmi?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  bodyWaterPercent?: number;
  visceralFat?: number;
  boneMassKg?: number;
  proteinKg?: number;
  bmrKcal?: number;
  metabolicAge?: number;
  bodyScore?: number;
  deviceModel?: string;
  deviceMac?: string;
  measuredAt?: Date;
  rawHex?: string; // 原始字节（调试用）
}

class BodyFatScale extends EventEmitter {
  private noble: any = null;
  private peripheral: any = null;
  private chars: Record<string, any> = {};
  private scanning = false;

  private async ensureNoble(): Promise<boolean> {
    if (this.noble) return true;
    try {
      this.noble = require('@abandonware/noble');
      return true;
    } catch (e) {
      console.warn('[BodyFatScale] @abandonware/noble not loaded:', (e as any).message);
      return false;
    }
  }

  async scan(timeoutMs = 8000): Promise<ScaleDevice[]> {
    const ok = await this.ensureNoble();
    if (!ok) return [];
    return new Promise<ScaleDevice[]>((resolve) => {
      const devices: ScaleDevice[] = [];
      this.noble.on('discover', (p: any) => {
        const name: string = p.advertisement?.localName || '';
        if (NAME_MATCH.some((k) => name.toUpperCase().includes(k.toUpperCase()))) {
          (p as any)._matched = true;
          devices.push({ id: p.id, name, rssi: p.rssi || -100 });
        }
      });
      this.noble.startScanning([], true);
      this.scanning = true;
      setTimeout(() => {
        if (this.scanning) {
          this.noble.stopScanning();
          this.scanning = false;
        }
        resolve(devices);
      }, timeoutMs);
    });
  }

  async connect(deviceId: string): Promise<boolean> {
    const ok = await this.ensureNoble();
    if (!ok) return false;
    return new Promise<boolean>(async (resolve) => {
      try {
        // 找到 peripheral
        const peripherals = await this.noble.startScanningAsync([], true).catch(() => []);
        this.noble.stopScanning();
        const target = peripherals.find((p: any) => p.id === deviceId);
        if (!target) { resolve(false); return; }
        await target.connectAsync();
        this.peripheral = target;
        // 发现 service + characteristics
        await target.discoverServicesAsync();
        for (const s of target.services) {
          for (const c of s.characteristics) {
            const uuid = c.uuid.toLowerCase();
            for (const [k, fullUuid] of Object.entries(CHARS)) {
              if (fullUuid.toLowerCase().endsWith(uuid.slice(-12))) {
                this.chars[k] = c;
                break;
              }
            }
          }
        }
        // 订阅所有 notify 通道
        for (const k of ['0051', '0052', '0081']) {
          if (this.chars[k]) {
            try {
              await this.chars[k].subscribeAsync();
              this.chars[k].on('data', (data: Buffer) => this.onNotify(k, data));
            } catch {}
          }
        }
        resolve(true);
      } catch (e) {
        console.error('[BodyFatScale] connect error:', e);
        resolve(false);
      }
    });
  }

  private onNotify(charKey: string, data: Buffer) {
    const hex = data.toString('hex');
    console.log(`[BodyFatScale] NOTIFY ${charKey}: ${hex} (${data.length}B)`);
    const parsed = this.parsePacket(data);
    if (parsed && parsed.packetType === 2 && parsed.data) {
      const bc = this.parseMeasured(parsed.data, hex);
      this.emit('measurement', bc);
    } else if (parsed && parsed.packetType === 1 && parsed.data) {
      const progress = this.parseMeasuring(parsed.data);
      this.emit('progress', progress);
    }
  }

  /** 解析 Yunmai 包头 */
  private parsePacket(buf: Buffer): { packetSignature: number; firmwareVersion: number; packetLength: number; packetType: number; data: Buffer } | null {
    if (buf.length < 5) return null;
    return {
      packetSignature: buf[0],
      firmwareVersion: buf[1],
      packetLength: buf[2],
      packetType: buf[3],
      data: buf.slice(4, 4 + (buf[2] - 5)),
    };
  }

  /** 解析测量中 (packetType=1) */
  private parseMeasuring(data: Buffer): { weightKg?: number } {
    if (data.length < 6) return {};
    const weightRaw = (data[4] << 8) | data[5]; // big-endian uint16
    return { weightKg: weightRaw / 100 };
  }

  /** 解析测量完成 (packetType=2) - 8 电极扩展版 */
  private parseMeasured(data: Buffer, rawHex: string): BodyCompositionData {
    const result: BodyCompositionData = { rawHex };
    if (data.length < 15) return result;
    // 标准 7 项
    const date = (data[1] << 24) | (data[2] << 16) | (data[3] << 8) | data[4];
    const userId = (data[5] << 24) | (data[6] << 16) | (data[7] << 8) | data[8];
    const weight = ((data[9] << 8) | data[10]) / 100;
    const resistance = (data[11] << 8) | data[12];
    const fatPct = ((data[13] << 8) | data[14]) / 100;
    result.weightKg = weight;
    result.bodyFatPercent = fatPct;
    result.measuredAt = new Date(date * 1000);
    // 8 电极扩展数据 (取决于固件版本): 水分/肌肉/骨量/蛋白质/内脏脂肪/BMR/身体年龄
    // 按 2 字节/字段 big-endian 解析后半段
    for (let i = 15; i + 1 < data.length; i += 2) {
      const val = (data[i] << 8) | data[i + 1];
      const offset = (i - 15) / 2;
      // 不同固件偏移不同，按出现顺序映射
      if (offset === 0) result.muscleMassKg = val / 100;
      else if (offset === 1) result.bodyWaterPercent = val / 100;
      else if (offset === 2) result.visceralFat = val;
      else if (offset === 3) result.boneMassKg = val / 100;
      else if (offset === 4) result.proteinKg = val / 100;
      else if (offset === 5) result.bmrKcal = val;
      else if (offset === 6) result.metabolicAge = val;
      else if (offset === 7) result.bodyScore = val;
    }
    return result;
  }

  /** 触发测量 (写启动命令) */
  async triggerMeasure(cmd: number = 0x01): Promise<boolean> {
    if (!this.peripheral || !this.chars['0052']) return false;
    try {
      await this.chars['0052'].writeAsync(Buffer.from([cmd]), false);
      return true;
    } catch {
      return false;
    }
  }

  /** 写用户资料 (12 字节 Yunmai 格式) */
  async writeUserInfo(gender: 'male' | 'female', age: number, heightCm: number, weightKg: number): Promise<boolean> {
    if (!this.peripheral || !this.chars['0051']) return false;
    const genderB = gender === 'male' ? 0 : 1;
    const pkt = Buffer.from([0x20, 0x09, 0x10, 0x00, 0x9c, genderB, age, heightCm, Math.round(weightKg * 2), 0, 0, 0]);
    try {
      await this.chars['0051'].writeAsync(pkt, false);
      return true;
    } catch {
      return false;
    }
  }

  /** 断开 */
  async disconnect() {
    if (this.peripheral) {
      try { await this.peripheral.disconnectAsync(); } catch {}
      this.peripheral = null;
      this.chars = {};
    }
  }

  /** 一次性完整测量 (高级封装) */
  async measure(customer: { gender: 'male' | 'female'; age: number; heightCm: number; weightKg?: number }): Promise<BodyCompositionData | null> {
    if (!this.peripheral) return null;
    // 1. 写用户资料
    if (customer.weightKg) {
      await this.writeUserInfo(customer.gender, customer.age, customer.heightCm, customer.weightKg);
      await new Promise((r) => setTimeout(r, 200));
    }
    // 2. 触发测量
    await this.triggerMeasure(0x01);
    await this.triggerMeasure(0x02);
    // 3. 等待测量完成 notify
    return new Promise<BodyCompositionData | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 15000);
      this.once('measurement', (bc: BodyCompositionData) => {
        clearTimeout(timer);
        bc.deviceMac = this.peripheral?.id;
        bc.deviceModel = 'XMTZC01YM';
        resolve(bc);
      });
    });
  }
}

export const bodyFatScale = new BodyFatScale();
