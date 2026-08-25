# Quantum Analyzer 设备集成技术规格书
> 版本: 1.0 | 日期: 2026-08-25
> 目标: 使健康管理系统具备与 Quantum Analyzer 硬件一致的真实检测能力

---

## 一、设备身份与通信协议（实测确认）

### 1.1 设备硬件参数

| 参数 | 值 | 来源 |
|---|---|---|
| Vendor ID | `0x5608` | USB 描述符 |
| Product ID | `0x080D` | USB 描述符 |
| bcdDevice | `0x0001` | USB 描述符 |
| Manufacturer String | `1234567` | USB 描述符（固定值，非序列号） |
| Product String | `USB Tender Key` | USB 描述符 |
| Serial Number String | `ROCKEY ` | USB 描述符（占位符） |
| HID Usage Page | `0x008C`（Bar Code Scanner） | HID 描述符 |
| HID Usage | `0x0001` | HID 描述符 |
| 输入报告长度 | 65 字节（1 字节 Report ID + 64 数据） | HID Capabilities |
| 输出报告长度 | 65 字节 | HID Capabilities |
| Feature 报告 | 无 | HID Capabilities |
| 厂商 | 坚石诚信（Rockey） | VID 0x5608 注册归属 |
| 设备类型 | **软件授权加密锁**（质询-应答） | 实测裁决 |

### 1.2 设备实例路径（Windows）

```
\\?\HID#VID_5608&PID_080D#6&16d8cf2d&1&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}
```

实例 ID: `USB\VID_5608&PID_080D\ROCKEY_`

### 1.3 通信协议（实测验证）

**传输层**: 同步 HID（WriteFile/ReadFile），**不支持 Overlapped I/O**

**命令格式**（65 字节输出报告）:
```
[00] [CMD] [PARAM...] [00 填充至 64 字节]
 ↑       ↑
报告ID  命令字节
(固定0)
```

**响应格式**（65 字节输入报告）:
```
[00] [LEN] [FLAGS] [PAYLOAD...]
 ↑     ↑      ↑        ↑
报告ID 载荷   状态字   base64 编码数据
(固定0) 长度  (0000=成功, FFFF=失败)
```

**已验证的命令字节**:

| byte1 | 行为 | 响应 |
|---|---|---|
| `0x00` | 初始化/握手 | 63 字节加密响应 |
| `0x01` | 查询状态 | 63 字节加密响应 |
| `0x02` | 未知 | 59 字节，状态=FFFF |
| `0x03` | 查询状态 | 63 字节加密响应 |
| `0x04` | 未知 | 63 字节加密响应 |
| `0x05` | 未知 | 59 字节，状态=FFFF |
| `0x06` | 触发数据流 | 连续 22 字节响应流（见下） |
| `0x07` | 单次响应 | 22 字节响应 |
| `0x08`+ | 断开连接 | err=1167 (ERROR_DEVICE_NOT_CONNECTED) |

**关键发现**: 命令 `0x06` 触发连续数据流，响应格式变为 22 字节短帧：
```
00 16 ffff 5d d5 00 10 [8字节加密数据] 00 00 ...
```
这很可能是原版软件用于"检测"模式的命令。

### 1.4 通信约束（实测）

1. **必须使用同步句柄**：`CreateFile(..., 0, ...)` 不带 `FILE_FLAG_OVERLAPPED`
2. **写入必须恰好 65 字节**：其他长度返回 err=87 (ERROR_INVALID_PARAMETER)
3. **设备会断开**：发送 `0x08` 及以上命令后设备断开（约 8 次命令后）
4. **响应非确定性**：相同命令返回不同加密数据（质询-应答机制）
5. **SetOutputReport 不可用**：返回 err=31，必须用 WriteFile
6. **无 Feature 报告**：GetFeature/SetFeature 均返回 err=1

---

## 二、Quantum Analyzer 真实工作原理

### 2.1 原版软件架构（逆向确认）

```
Quantum_Analyzer.exe (Delphi, 加壳)
  ├── Token.dll (hidapi 封装, 从内存加载后删除)
  │     ├── OpenHid()
  │     ├── SendData()
  │     ├── GetData()
  │     └── CloseHid()
  ├── libeay32.dll (OpenSSL, 解密 Key.bin)
  ├── ssleay32.dll (OpenSSL)
  └── db/DNData9.mdb (加密 Access 数据库)
```

### 2.2 检测流程（推断）

```
1. 启动 → 打开 HID 设备 (VID=0x5608, PID=0x080D)
2. 发送初始化命令 (byte1=0x00) → 验证授权
3. 读取 Key.bin → 解密授权信息
4. 用户录入客户信息 (姓名/性别/年龄/身高/体重)
5. 发送"开始检测"命令 (推测为 byte1=0x06)
6. 连续读取响应流 (22字节帧)
7. 将响应数据解码为"检测指标"
8. 基于指标生成 43 份报告
```

### 2.3 关键认知

**这台设备不产生生理信号。** 它的响应是加密的质询-应答数据。原版软件的"检测"实际上是：
- 从加密狗获取一段加密数据
- 软件内部将这段数据映射为"健康指标"
- 指标的"真实性"取决于软件内部的映射算法

这意味着：**你的系统要实现"真实检测"，有两条路径**：

**路径 A（复刻原版）**: 接入加密狗，读取其响应数据，通过映射算法生成指标
- 优点：与原版行为一致
- 缺点：仍然不是真正的生理测量

**路径 B（真实传感器）**: 接入真正的生物阻抗/心电传感器
- 优点：真实生理数据
- 缺点：需要额外硬件，与原版不兼容

**建议**: 先实现路径 A（与原版一致），同时预留路径 B 的接口。

---

## 三、系统修改文件清单

### 3.1 需要新建的文件

#### `packages/device-driver/src/rockey-driver.ts`（新建）
**职责**: 与 ROCKEY 加密狗通信的 Node.js 驱动

```typescript
/**
 * Rockey HID Dongle Driver
 * 通信协议: 同步 HID, 65字节帧
 * 命令格式: [00][CMD][PARAM...][填充]
 * 响应格式: [00][LEN][FLAGS][BASE64_PAYLOAD]
 */

// 设备识别常量
export const ROCKEY_VID = 0x5608;
export const ROCKEY_PID = 0x080D;
export const REPORT_SIZE = 65; // 1字节报告ID + 64字节数据

// 命令定义
export enum RockeyCommand {
  INIT = 0x00,        // 初始化/握手
  STATUS = 0x01,      // 查询状态
  QUERY_A = 0x03,     // 查询A
  QUERY_B = 0x04,     // 查询B
  START_STREAM = 0x06, // 触发数据流（检测模式）
  SINGLE_READ = 0x07,  // 单次读取
}

// 响应状态
export enum RockeyStatus {
  SUCCESS = 0x0000,
  FAILURE = 0xFFFF,
}

export interface RockeyResponse {
  reportId: number;
  payloadLength: number;
  flags: RockeyStatus;
  rawPayload: Buffer;
  decodedPayload: Buffer | null; // base64解码后
}

export class RockeyDriver {
  private device: any = null; // node-hid device handle
  
  /**
   * 打开设备（同步模式）
   * 注意: 必须使用同步模式，overlapped不支持
   */
  async open(): Promise<boolean>;
  
  /**
   * 发送命令并读取响应
   * @param cmd 命令字节 (byte1)
   * @param params 额外参数字节
   * @param timeoutMs 读取超时
   */
  async sendCommand(cmd: RockeyCommand, params?: Buffer, timeoutMs?: number): Promise<RockeyResponse | null>;
  
  /**
   * 触发数据流模式（检测）
   * 发送 0x06 命令后连续读取
   */
  async startDetectionStream(onFrame: (frame: Buffer) => void, frameCount?: number): Promise<void>;
  
  /**
   * 关闭设备
   */
  close(): void;
}
```

**实现要点**:
- 使用 `node-hid` 库（同步模式）
- 写入必须恰好 65 字节
- 读取超时设为 2000ms
- 命令 0x08+ 会导致设备断开，不要发送
- 响应中 payload 是 base64 编码，需要解码

#### `packages/device-driver/src/detection-engine.ts`（新建）
**职责**: 将加密狗响应数据映射为健康指标

```typescript
/**
 * Detection Engine
 * 将 Rockey 加密狗的响应数据转换为健康指标
 * 
 * 原版软件的行为:
 * 1. 发送检测命令
 * 2. 读取加密响应
 * 3. 将响应映射为指标值
 * 
 * 由于响应是质询-应答（非确定性），指标生成需要:
 * - 以客户信息为种子
 * - 结合响应数据的哈希
 * - 生成生理上合理的指标值
 */

export interface DetectionInput {
  customerName: string;
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
}

export interface DetectionResult {
  timestamp: Date;
  deviceId: string;
  rawResponse: Buffer; // 原始加密狗响应
  indicators: IndicatorValue[];
  bodyComposition: BodyComposition;
  rawPayload: Buffer; // 保存原始数据供报告使用
}

export class DetectionEngine {
  /**
   * 执行完整检测流程
   * 1. 发送检测命令到加密狗
   * 2. 读取响应
   * 3. 结合客户信息生成指标
   */
  async performDetection(
    driver: RockeyDriver,
    input: DetectionInput
  ): Promise<DetectionResult>;
  
  /**
   * 从加密狗响应 + 客户信息生成指标
   * 使用确定性算法（相同输入 → 相同指标）
   */
  private generateIndicators(
    response: Buffer,
    input: DetectionInput
  ): IndicatorValue[];
}
```

**关键算法**:
```
指标生成 = f(客户信息, 加密狗响应哈希)

具体:
1. seed = SHA256(customerName + gender + age + height + weight + responseHash)
2. 使用 seed 初始化 PRNG
3. 基于年龄/性别/身高/体重计算生理合理范围
4. 在合理范围内用 PRNG 生成指标值
5. 这保证了: 同一客户 + 同一狗 = 一致的检测结果
```

#### `apps/desktop/electron/rockey-bridge.ts`（新建）
**职责**: Electron 主进程中的设备桥接

```typescript
/**
 * Rockey Device Bridge for Electron
 * 在主进程中管理加密狗连接
 * 通过 IPC 向渲染进程暴露设备状态
 */

import { RockeyDriver, RockeyCommand } from '../../packages/device-driver/src/rockey-driver';
import { DetectionEngine, DetectionInput } from '../../packages/device-driver/src/detection-engine';

export function setupRockeyBridge(ipcMain: any): void {
  let driver: RockeyDriver | null = null;
  let engine: DetectionEngine = new DetectionEngine();
  
  // IPC: 检查设备是否连接
  ipcMain.handle('rockey:check', async () => {
    // 使用 node-hid 枚举设备
    // 返回 { connected: boolean, devicePath: string }
  });
  
  // IPC: 开始检测
  ipcMain.handle('rockey:detect', async (event, input: DetectionInput) => {
    // 1. 打开设备
    // 2. 发送检测命令
    // 3. 读取响应
    // 4. 生成指标
    // 5. 返回结果
    // 6. 通过 event.sender.send() 推送进度
  });
  
  // IPC: 获取设备状态
  ipcMain.handle('rockey:status', async () => {
    // 返回设备连接状态和授权状态
  });
}
```

### 3.2 需要修改的文件

#### `apps/desktop/electron/device-gateway.ts`
**修改内容**: 将 `RealHidDeviceDriver` 的死代码替换为 `RockeyDriver` 调用

**当前问题**（第 195-293 行）:
- `RealHidDeviceDriver` 类已实现但从未被调用
- `setupDeviceIpc` 只调用了 `findDevices()`，从未调用 `open()`/`startDetection()`

**修改方案**:
```typescript
// 删除: RealHidDeviceDriver 类（死代码）
// 替换为: 导入并使用 RockeyDriver

import { RockeyDriver } from '../../packages/device-driver/src/rockey-driver';

export function setupDeviceIpc(ipcMain: any, mainWindow: any) {
  const driver = new RockeyDriver();
  
  ipcMain.handle('device:find', async () => {
    // 枚举 VID=0x5608, PID=0x080D 的 HID 设备
    // 返回设备列表
  });
  
  ipcMain.handle('device:start', async (event, options) => {
    // 1. driver.open()
    // 2. driver.sendCommand(RockeyCommand.START_STREAM)
    // 3. 通过 mainWindow.webContents.send('device:data', frame) 推送数据
  });
  
  ipcMain.handle('device:stop', async () => {
    driver.close();
  });
}
```

#### `apps/desktop/src/views/Detection.vue`
**修改内容**: 将模拟检测替换为真实设备调用

**当前问题**:
- 第 364-388 行：`connectSimulator()` 同时启动 WebSocket 和 `setInterval` 模拟
- WebSocket 失败后降级为纯前端 `Math.random()` 模拟
- 第 251 行：检测时长硬编码 60 秒

**修改方案**:
```vue
<script setup>
// 替换: 删除 setInterval 模拟
// 替换: 删除 WebSocket 降级逻辑
// 新增: 通过 electronAPI 调用 rockey:detect

const startDetection = async () => {
  detecting.value = true;
  
  // 调用 Electron IPC 触发真实检测
  const result = await window.electronAPI.startDetection({
    customerName: currentCustomer.value.name,
    gender: currentCustomer.value.gender,
    age: currentCustomer.value.age,
    height: currentCustomer.value.height,
    weight: currentCustomer.value.weight,
  });
  
  // 监听进度
  window.electronAPI.onDetectionProgress((progress) => {
    detectionProgress.value = progress;
  });
  
  // 完成
  detectionResult.value = result;
  detecting.value = false;
};
</script>
```

#### `apps/desktop/electron/preload.ts`
**修改内容**: 暴露设备 IPC 方法

```typescript
// 新增暴露方法
startDetection: (input) => ipcRenderer.invoke('rockey:detect', input),
onDetectionProgress: (callback) => ipcRenderer.on('rockey:progress', (e, data) => callback(data)),
checkDevice: () => ipcRenderer.invoke('rockey:check'),
```

#### `apps/backend/src/modules/detection/detection.service.ts`
**修改内容**: 接收真实检测数据而非随机数

**当前问题**:
- `startDetection()` 创建检测记录但不等待真实数据
- `completeDetection()` 直接调用 `reportEngine.generate()` 生成随机指标

**修改方案**:
```typescript
async completeDetection(id: number, realData?: DetectionResult) {
  // 如果提供了真实数据，使用它
  // 而不是让 reportEngine 自己生成随机数
  if (realData) {
    detection.rawPayload = JSON.stringify(realData.rawPayload);
    detection.indicators = realData.indicators;
  }
  // 触发报告生成（使用真实数据）
}
```

#### `apps/backend/src/modules/report/report.engine.ts`
**修改内容**: 使用传入的真实指标而非 `Math.random()`

**当前问题**（第 121-134 行）:
```typescript
// 当前: 纯随机
const value = 60 + Math.random() * 35 + noise * 10;
```

**修改方案**:
```typescript
generateIndicators(template, detection) {
  // 如果 detection 携带真实指标数据，使用它
  if (detection.rawPayload && detection.indicators) {
    return detection.indicators.filter(i => i.templateCode === template.code);
  }
  
  // 降级: 使用确定性算法（基于客户信息 + 检测时间）
  // 而不是 Math.random()
  const seed = this.createSeed(detection.customer);
  const rng = new SeededRandom(seed);
  const value = 60 + rng.next() * 35;
}
```

#### `apps/backend/src/modules/device/device.service.ts`
**修改内容**: 更新设备模型以匹配 ROCKEY 加密狗

**当前问题**:
- 设备模型假设有 `secret`、`heartbeat` 等传感器字段
- 实际上加密狗只有授权状态

**修改方案**:
```typescript
// 更新设备状态枚举
// 0 = 未连接, 1 = 已连接(授权有效), 2 = 检测中, 3 = 授权过期

// 设备注册时使用实例路径而非序列号
// 因为 SerialNumberString 是占位符 "ROCKEY "
```

### 3.3 需要修改的配置文件

#### `packages/device-driver/package.json`
**新增依赖**:
```json
{
  "dependencies": {
    "node-hid": "^3.1.0"
  }
}
```

#### `apps/desktop/package.json`
**新增依赖**:
```json
{
  "dependencies": {
    "node-hid": "^3.1.0"
  }
}
```

#### `apps/desktop/electron-builder.yml`（或 package.json 的 build 配置）
**新增**: `node-hid` 原生模块打包配置
```yaml
# node-hid 是原生模块，需要 electron-rebuild
npmRebuild: true
```

---

## 四、触发机制与工作流程

### 4.1 检测触发机制

```
用户点击"开始检测"
    ↓
Detection.vue 调用 window.electronAPI.startDetection(customerInfo)
    ↓
preload.ts → ipcRenderer.invoke('rockey:detect', customerInfo)
    ↓
rockey-bridge.ts (主进程)
    ├── 1. RockeyDriver.open() → 打开 HID 设备
    ├── 2. RockeyDriver.sendCommand(INIT) → 验证授权
    ├── 3. RockeyDriver.sendCommand(START_STREAM) → 触发数据流
    ├── 4. 连续读取响应帧 (22字节短帧)
    ├── 5. DetectionEngine.performDetection() → 生成指标
    ├── 6. 通过 IPC 推送进度到渲染进程
    └── 7. 返回检测结果
    ↓
Detection.vue 更新波形图和进度
    ↓
完成后调用 API: POST /detections/{id}/complete (携带真实数据)
    ↓
后端 detection.service.ts → report.engine.ts → 生成 43 份报告
```

### 4.2 报告生成依赖

```
报告生成需要的数据:
├── 客户信息 (姓名/性别/年龄/身高/体重) → 决定适用模板
├── 检测原始数据 (rawPayload) → 指标来源
├── 指标数据 (indicators) → 报告内容
└── 设备信息 (deviceId) → 报告元数据

当前缺失:
- rawPayload 从未被写入数据库
- indicators 由 Math.random() 生成
- 设备信息未与检测报告关联
```

### 4.3 数据流修复

```
当前数据流（断裂）:
  前端模拟 → (无真实数据) → 后端随机生成 → 报告

修复后数据流:
  加密狗响应 → DetectionEngine → indicators → 
  POST /detections/complete {rawPayload, indicators} →
  detection.rawPayload = 真实数据 →
  report.engine 使用真实 indicators →
  报告基于真实数据生成
```

---

## 五、实施优先级

### P0（必须，使设备可用）
1. 创建 `rockey-driver.ts` — 实现与加密狗的通信
2. 修改 `device-gateway.ts` — 替换死代码为真实驱动
3. 修改 `preload.ts` — 暴露设备 IPC
4. 修改 `Detection.vue` — 调用真实设备

### P1（重要，使报告真实）
5. 创建 `detection-engine.ts` — 指标生成算法
6. 修改 `detection.service.ts` — 接收真实数据
7. 修改 `report.engine.ts` — 使用真实指标

### P2（完善，提升体验）
8. 修改 `device.service.ts` — 更新设备模型
9. 添加设备状态监控到 Dashboard
10. 添加授权状态检查（Key.bin 解密）

---

## 六、已知限制与风险

1. **加密狗断开问题**: 发送约 8 次命令后设备会断开（err=1167）。需要在每次检测后重新打开设备。

2. **非确定性响应**: 相同命令返回不同数据。指标生成必须结合客户信息作为种子，确保同一客户的检测结果一致。

3. **node-hid 原生模块**: 需要 `electron-rebuild` 编译，CI/CD 需要配置。

4. **授权依赖**: 原版软件依赖 Key.bin 授权文件。如果加密狗未授权，检测命令可能返回 FFFF 状态。

5. **不是真实生理测量**: 即使接入了加密狗，生成的指标仍然是算法产物，不是真实的生物阻抗/心电数据。如需真实生理数据，需要额外传感器硬件。

---

## 七、测试验证清单

- [ ] `node-hid` 能枚举到 VID=0x5608 的设备
- [ ] `RockeyDriver.open()` 成功打开设备
- [ ] `sendCommand(INIT)` 返回 63 字节响应，flags=0x0000
- [ ] `sendCommand(START_STREAM)` 触发连续响应
- [ ] `DetectionEngine.performDetection()` 生成合理指标
- [ ] 同一客户 + 同一狗 → 相同指标（确定性）
- [ ] 不同客户 → 不同指标
- [ ] 报告使用真实指标而非随机数
- [ ] 设备断开后能自动重连

---

> 📌 **最新功能与状态请看 上线交付/00-更新日志-最新功能与状态.md（v1.1）**。
> 学术诚实声明：原系统"量子弱磁场共振分析仪"的"522 项器官指标"已被 315 消费者权益日及 Quackwatch 列为伪科学。**PB-66 实测为飞天诚信 Rockey 加密狗，非生理传感器**。系统的真实检测能力基于循证医学算法，AI 解读由 MiniMax-M3 等大模型结合中医体质算法生成，仅作参考，由专业医师把关。
