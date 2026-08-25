"""小米/云麦 XMTZC01YM 深度抓包 v3
关键修正: 发 12 字节 Yunmai 用户资料初始化包
"""
import asyncio, sys, json
try:
    from bleak import BleakScanner, BleakClient
except ImportError:
    print("需要 bleak"); sys.exit(1)

CHARS = {
    "0050_read":   "00000050-0000-1000-8000-00805f9b34fb",
    "0051_rw":     "00000051-0000-1000-8000-00805f9b34fb",
    "0052_rw":     "00000052-0000-1000-8000-00805f9b34fb",
    "0081_notify": "00001881-0000-1000-8000-00805f9b34fb",
    "0082_write":  "00001882-0000-1000-8000-00805f9b34fb",
    "device_name": "00002a00-0000-1000-8000-00805f9b34fb",
}
NAME_MATCH = "Xiaomi 8-Electrode"

received = []

def on_notify(sender, data):
    hex_str = " ".join(f"{b:02x}" for b in data)
    print(f"  NOTIFY [{len(data):>2d}B] {str(sender.uuid)[-8:]}: {hex_str}")
    received.append({"char": str(sender.uuid)[-8:], "data_hex": hex_str, "len": len(data)})

def build_userinfo(gender, age, height_cm, weight_kg):
    """构造 Yunmai/Xiaomi 8-电极秤用户资料包
    格式（参考 openScale/小米体脂秤开源协议）:
      [0] 0x20  - 协议头
      [1] 0x09  - 长度
      [2] 0x10  - 类型
      [3] 0x00
      [4] 0x9c  - 单位(kg=0x01<<2=0x04, jin=0x02<<2=0x08, lb=0x03<<2=0x0c) + 8-电极标记
      [5] gender (0=male, 1=female)
      [6] age
      [7] height_cm
      [8] weight * 2 (half-kg units)
      [9] athlete flag
      [10] 0x00
      [11] CRC
    """
    unit_byte = 0x9c  # kg + 8-electrode
    gender_b = 0 if gender == "male" else 1
    weight_b = int(weight_kg * 2)
    pkt = bytes([0x20, 0x09, 0x10, 0x00, unit_byte, gender_b, age, height_cm, weight_b, 0x00, 0x00, 0x00])
    return pkt

async def scan_with_retry(name_match, rounds=10, per_round=4):
    print(f"[1] 扫描中（最多 {rounds*per_round}秒），立刻站秤上！")
    for i in range(rounds):
        devs = await BleakScanner.discover(timeout=per_round)
        for d in devs:
            if name_match.lower() in (d.name or "").lower():
                print(f"  >> 第{i+1}轮: {d.name}  [{d.address}]")
                return d
        print(f"  第{i+1}/{rounds}轮 扫到{len(devs)}设备")
    return None

async def main():
    target = await scan_with_retry(NAME_MATCH)
    if not target:
        print("未找到，排查: 米家解除绑定 + 站秤上 + 双手握电极")
        sys.exit(1)
    print(f"\n[2] 连接 {target.address}")
    async with BleakClient(target.address) as client:
        print("[3] 读设备名（确认设备）")
        try:
            name = await client.read_gatt_char(CHARS["device_name"])
            print(f"  设备名: {bytes(name).decode('utf-8', errors='ignore')}")
        except Exception as e:
            print(f"  设备名读失败: {e}")

        print("[4] 订阅 0x0051 / 0x0052 / 0x0081 notify")
        for name, uuid in [("0051", CHARS["0051_rw"]), ("0052", CHARS["0052_rw"]), ("0081", CHARS["0081_notify"])]:
            try:
                await client.start_notify(uuid, on_notify)
                print(f"  订阅 {name} OK")
            except Exception as e:
                print(f"  订阅 {name} 失败: {e}")

        print("[5] 主动读 0x0050")
        try:
            d = await client.read_gatt_char(CHARS["0050_read"])
            print(f"  READ 0050: {' '.join(f'{b:02x}' for b in d)}")
        except Exception as e:
            print(f"  READ 0050 失败: {e}")

        print("\n[6] 发送 Yunmai 用户资料初始化包（关键，12字节）")
        userinfo = build_userinfo(gender="male", age=30, height_cm=170, weight_kg=70)
        print(f"  payload: {userinfo.hex()}")
        try:
            await client.write_gatt_char(CHARS["0051_rw"], userinfo, response=False)
            print("  写 0x0051 12字节 用户资料 OK")
        except Exception as e:
            print(f"  写失败: {e}")
        await asyncio.sleep(1)

        print("\n[7] 再发多种命令（单字节）")
        for label, uuid, payload in [
            ("0051 [02]",   CHARS["0051_rw"], bytes([0x02])),
            ("0051 [03]",   CHARS["0051_rw"], bytes([0x03])),
            ("0051 [A0 00]", CHARS["0051_rw"], bytes([0xA0, 0x00])),
            ("0082 [02]",   CHARS["0082_write"], bytes([0x02])),
            ("0051 [A0 09 10 00 9c 02 00 1E AA 00 00 00]",
                CHARS["0051_rw"], bytes.fromhex("a00910009c02001eaa000000")),
        ]:
            try:
                await client.write_gatt_char(uuid, payload, response=False)
                print(f"  写 {label}: {payload.hex()}")
                await asyncio.sleep(1.5)
            except Exception as e:
                print(f"  写 {label} 失败: {e}")

        print("\n[8] 等待 25 秒收集 notify...")
        for i in range(25):
            await asyncio.sleep(1)
            if i % 5 == 4:
                print(f"  {i+1}s... 已收 {len(received)} 包")

        print(f"\n[9] 总计 {len(received)} 个 notify")
        out = "E:/work Codex/健康管理/platform/scale-capture-v3.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"device": target.name, "address": target.address,
                      "received_count": len(received), "packets": received}, f, indent=2)
        print(f"数据已保存: {out}")
        print("\n=== 把所有 NOTIFY/READ 开头的行贴给我 ===")

asyncio.run(main())
