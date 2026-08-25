# Quantum Analyzer 检测设备识别卡（ROCKEY HID）

> 由本机实测提取（SetupAPI + HID API，只读）。用于系统按 VID/PID 识别并入库设备。

## 一、USB 识别参数（唯一匹配依据）

| 参数 | 值 | 说明 |
|---|---|---|
| **Vendor ID (VID)** | `0x5608` | 飞天诚信 Rockey 系 |
| **Product ID (PID)** | `0x080D` | |
| bcdDevice 版本 | `0x0001` | |
| ManufacturerString | `1234567` | 固件固定串，非序列号 |
| ProductString | `USB Tender  Key` | |
| SerialNumberString | `ROCKEY ` | ⚠️ 固定占位符，全机型相同 |
| Windows 实例 ID | `USB\VID_5608&PID_080D\ROCKEY_` | |
| Container ID | `{c9543f19-49fa-51f7-a28e-9c93656d7cb7}` | 本机此实例 |

## 二、HID 通信参数

| 参数 | 值 |
|---|---|
| Usage Page | `0x008C`（Bar Code Scanner） |
| Usage | `0x0001` |
| 输入报告长度 | 65 字节（1 字节 ReportID + 64 数据） |
| 输出报告长度 | 65 字节 |
| Feature 报告 | 0（无） |
| 通信模式 | **请求-响应式**：不主动上报，需先发命令 |
| 设备路径模板 | `\\?\hid#vid_5608&pid_080d#<实例>#<HID GUID>` |

## 三、序列号（SN）说明 —— 重要

该设备 **USB 描述符里没有唯一序列号**：`SerialNumberString` 是固件烧死的占位符 `ROCKEY `，所有同型号狗完全一样。`ManufacturerString=1234567` 也是固定串。

因此 **不能用 USB 序列号作为设备唯一标识**。可选方案：

1. **VID/PID + 实例路径**：单机只插一台时，`USB\VID_5608&PID_080D\ROCKEY_` 可作为本机标识（当前 `device-gateway.ts` 已这样做，取 DeviceID 末段）。
2. **Rockey 硬件唯一 ID**：真正的唯一 ID 存在狗的内部存储里，须通过 Rockey 私有协议/SDK（`RockeyOpen`/`RockeyGetID` 一类接口）读取，**无法通过标准 HID 描述符获得**。若需要一机一码，必须走这条路。

## 四、系统接入现状

`apps/desktop/electron/device-gateway.ts` 的 `KNOWN_DEVICES` 已包含：

```ts
{ vendorId: 0x5608, productId: 0x080D, name: 'Quantum Analyzer (Rockey HID)' }
```

即 **系统已能按 VID/PID 识别该设备**。现有缺口：

- `scanWindowsDevices()` 用 DeviceID 末段当序列号，本设备会得到 `ROCKEY_`（非唯一，多台会重复）。
- `RealHidDeviceDriver.startDetection()` 未实现真实的命令分包发送（第 302 行注释为待实现）。
- 设备为请求-响应式，需先发送"开始检测"命令才会回数据；当前驱动未定义该命令字节序列。

## 五、待确认项（影响后续开发）

| 项 | 现状 | 需要的输入 |
|---|---|---|
| 开始检测命令 | 未知 | 原厂协议文档或抓包 |
| 数据帧格式 | 未知 | 原厂协议文档 |
| 一机一码需求 | 若要，需 Rockey SDK | 确认是否必须唯一 ID |

> 说明：主程序 `Quantum_Analyzer.exe` 导入表仅含标准系统 DLL（被加壳保护），本地数据库 `DNData9.mdb` 为加密数据（熵 8.0），均无法直接反编译出设备通信协议。命令帧格式需以原厂协议为准。

---

> 📌 **本系统的最新功能与状态（v1.1）请以 上线交付/00-更新日志-最新功能与状态.md 为准**。
