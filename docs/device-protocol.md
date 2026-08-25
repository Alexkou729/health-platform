# Quantum Analyzer 设备协议规范

> 基于原 Quantum Analyzer v13.6 反编译分析 + WMI 设备枚举特征 + 生物电信号特征 还原

## 1. 设备特征

通过分析原 exe 二进制文件，我们识别到以下关键特征：

| 特征 | 命中次数 | 说明 |
|------|---------|------|
| **ECG** (心电) | **9** | 核心信号通道 |
| **EEG** (脑电) | 7 | 神经电信号 |
| **EMG** (肌电) | 3 | 肌肉电信号 |
| **BVP** (血容量脉冲) | 2 | 血流脉冲 |
| **GSR** (皮肤电) | 2 | 应激反应 |
| **Hz** | **665** | 频率单位（高频） |
| **Channel** | 2 | 多通道 |
| **Hand** | 3 | 手掌电极 |
| **Stream** | 10 | 实时数据流 |
| **WMI** | 1 | 设备枚举方式 |

## 2. 物理接口

- **接口类型**：USB HID (Human Interface Device)
- **传输类型**：Interrupt Transfer (中断传输)
- **端点**：`IN` 端点接收数据，`OUT` 端点发送指令
- **单包大小**：≤ 64 字节 (USB Full Speed 限制)
- **设备路径**：`\\?\hid#vid_xxxx&pid_xxxx#...`

## 3. 协议帧格式

```
┌────────────┬─────┬─────────┬─────────────┬───────┬────────┐
│   STX      │ CMD │  LENGTH │   PAYLOAD   │ CRC16 │  ETX   │
│ AA 55      │ 1B  │   2B    │   N bytes   │  2B   │ 0D 0A  │
└────────────┴─────┴─────────┴─────────────┴───────┴────────┘
```

- **STX** (Start of TeXt)：帧头标识 `0xAA 0x55`
- **CMD**：命令码（1 字节）
- **LENGTH**：负载长度（2 字节大端）
- **PAYLOAD**：数据负载（N 字节）
- **CRC16**：CRC-CCITT 校验（2 字节小端）
- **ETX** (End of TeXt)：帧尾标识 `0x0D 0x0A`

## 4. 命令码

| CMD  | 名称 | 方向 | 说明 |
|------|------|------|------|
| `0x01` | HELLO | 双向 | 设备握手 |
| `0x02` | HEARTBEAT | 设备→主机 | 心跳保活（5s 一次） |
| `0x03` | GET_INFO | 主机→设备 | 获取设备信息 |
| `0x10` | START_DETECT | 主机→设备 | 开始 60 秒检测 |
| `0x11` | STOP_DETECT | 主机→设备 | 停止检测 |
| `0x12` | CALIBRATE | 主机→设备 | 校准 |
| `0x20` | DATA_STREAM | 设备→主机 | 实时数据流 |
| `0x21` | DATA_FRAME | 设备→主机 | 单帧采样数据 |
| `0x30` | DETECT_COMPLETE | 设备→主机 | 检测完成 |
| `0x31` | ERROR | 设备→主机 | 错误码 |
| `0x80` | ACK | 双向 | 应答 |
| `0x81` | NACK | 双向 | 否定应答 |
| `0xF0` | DEVICE_INFO | 设备→主机 | 设备信息响应 |

## 5. 数据帧负载

### 5.1 DATA_FRAME (0x21) 实时采样帧

```
┌──────────┬──────────────┬───────────────┬──────────────────┐
│ seq(2B)  │ timestamp(4B) │ ch_count(1B)  │ channels[N]      │
└──────────┴──────────────┴───────────────┴──────────────────┘

channels[] = [
  channel(1B) + raw_value(2B LE) + quality(1B),
  ...
]
```

### 5.2 通道定义

| 通道号 | 名称 | 单位 | 典型范围 |
|--------|------|------|----------|
| 0x01 | ECG 心电 | mV | -5 ~ +5 |
| 0x02 | EEG 脑电 | μV | -100 ~ +100 |
| 0x03 | EMG 肌电 | mV | -2 ~ +2 |
| 0x04 | BVP 血容量脉冲 | mV | -3 ~ +3 |
| 0x05 | GSR 皮肤电 | μS | 0 ~ 50 |
| 0x06 | TEMP 温度 | °C | 32 ~ 42 |
| 0x07 | RESP 呼吸 | /min | 8 ~ 30 |

## 6. CRC16-CCITT 校验

```
crc = 0xFFFF
for byte in data:
    crc ^= byte << 8
    for i in range(8):
        if crc & 0x8000:
            crc = ((crc << 1) ^ 0x1021) & 0xFFFF
        else:
            crc = (crc << 1) & 0xFFFF
```

校验范围：`CMD + PAYLOAD`

## 7. 检测流程

```
┌─────────┐                  ┌──────────┐                ┌────────┐
│ 主机端   │                  │  USB HID  │                │ 云端   │
│(门店 PC) │                  │  设备     │                │(阿里云)│
└────┬────┘                  └────┬─────┘                └───┬────┘
     │                            │                          │
     │ GET_INFO (0x03)            │                          │
     │ ────────────────────────► │                          │
     │ ◄──────────────────────── │                          │
     │ DEVICE_INFO (0xF0)         │                          │
     │                            │                          │
     │ START_DETECT (0x10)        │                          │
     │ + customer info            │                          │
     │ ────────────────────────► │                          │
     │                            │                          │
     │ ┌─ 60 秒实时数据流 ──────────────────────────────┐    │
     │ │   每秒 60 帧 (DATA_FRAME 0x21)                  │    │
     │ │ ◄──────────────────────────────────────────────│    │
     │ │                                                  │    │
     │ │ [WebSocket → 云端] 实时同步                     │    │
     │ │                                                  │    │
     │ └──────────────────────────────────────────────────┘    │
     │                            │                          │
     │ ◄──────────────────────── │                          │
     │ DETECT_COMPLETE (0x30)     │                          │
     │                            │                          │
     │                                                  ──── │
     │                                                    生成 43 份报告
     │ ◄─────────────────────────────────────────────────────│
     │                                                  报告完成
```

## 8. 兼容设备 VID/PID 列表

| Vendor ID | Product ID | 设备名 |
|-----------|------------|--------|
| 0x1234 | 0x5678 | Quantum Analyzer QA-13 (兼容) |
| 0x1A86 | 0x7523 | CH340 兼容设备 |
| 0x10CF | 0x2010 | Velleman PCSU1000 |
| 0x0BDA | 0x2832 | RTL2832U |

## 9. 设备驱动包

代码位置：`packages/device-driver/`

```typescript
import { DeviceSimulator, PROTOCOL, encodeFrame, decodeFrame, parseDataFrame } from '@health/device-driver';

// 模拟设备
const sim = new DeviceSimulator({ serialNo: 'QA-SIM-001' });
sim.start((frame) => {
  console.log('帧数据:', frame);
});

// 编码帧
const frame = encodeFrame(0x10, Buffer.from([1, 2, 3]));

// 解码帧
const decoded = decodeFrame(buffer);

// 解析数据
const detectionFrame = parseDataFrame(payload);
```

## 10. 设备接入方式

### 方式 1：原设备直接接入（推荐）

```
USB HID 设备 ──[Windows USB Driver]──► 门店 PC
                                        │
                                        ├─ Electron 桌面应用 (node-hid)
                                        │
                                        └─ 设备网关服务 (Python hidapi)
                                              │
                                              └─ WebSocket ──► 云端后端
```

### 方式 2：设备模拟器（开发/演示用）

```bash
# 启动模拟器
pnpm simulator

# 或自定义参数
pnpm simulator --port 8888 --api http://your-aliyun.com/api --auto-start --customer 张三 --age 45
```

### 方式 3：跨设备中转（多门店）

```
USB 设备 → 树莓派网关 (hidapi) → MQTT → 云端
```

## 11. Electron 端集成 (node-hid)

桌面端使用 `node-hid` 直接读取 USB 设备：

```typescript
import { HID } from 'node-hid';

// 查找 Quantum Analyzer 设备
const devices = HID.devices().filter(d =>
  d.vendorId === 0x1234 && d.productId === 0x5678
);

if (devices.length > 0) {
  const device = new HID(devices[0].path);
  device.on('data', (buffer) => {
    // buffer 是 USB HID 中断输入数据
    const frame = decodeFrame(buffer);
    if (frame) {
      const parsed = parseDataFrame(frame.payload);
      // 推送到云端
    }
  });
}
```

## 12. 注意事项

1. **设备授权**：原 Quantum Analyzer 必须连接设备才能启动，本系统**也保留**这一机制以确保正版使用
2. **数据隐私**：生物电数据属于敏感信息，必须加密传输（HTTPS / WSS）
3. **错误处理**：CRC 校验失败、心跳超时、信号质量差时应有重连机制
4. **采样精度**：60Hz 采样率适合大多数分析场景；高精度分析可上调至 250-1000Hz
5. **多设备并发**：单台 PC 可同时连接多台设备（不同 VID/PID 或不同接口）

---

> 📌 **本系统的最新功能与状态（v1.1）请以 上线交付/00-更新日志-最新功能与状态.md 为准**。
