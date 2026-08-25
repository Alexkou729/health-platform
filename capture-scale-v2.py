"""小米/云麦 XMTZC01YM 深度抓包 v2
策略: 读初始配置 -> 订阅所有notify -> 写用户资料 -> 等20s
"""
import asyncio, sys, json
try:
    from bleak import BleakScanner, BleakClient
except ImportError:
    print("需要 bleak"); sys.exit(1)

SERVICE = "0000fe95-0000-1000-8000-00805f9b34fb"
CHARS = {
    "0050_read":   "00000050-0000-1000-8000-00805f9b34fb",
    "0051_rw":     "00000051-0000-1000-8000-00805f9b34fb",
    "0052_rw":     "00000052-0000-1000-8000-00805f9b34fb",
    "0081_notify": "00001881-0000-1000-8000-00805f9b34fb",
    "0082_write":  "00001882-0000-1000-8000-00805f9b34fb",
}
NAME_MATCH = "Xiaomi 8-Electrode"

received = []

def on_notify(sender, data):
    hex_str = " ".join(f"{b:02x}" for b in data)
    print(f"  NOTIFY [{len(data):>2d}B] {str(sender.uuid)[-8:]:>8s}: {hex_str}")
    received.append({"char": str(sender.uuid)[-8:], "data_hex": hex_str, "len": len(data)})

async def scan_with_retry(name_match, rounds=8, per_round=4):
    print(f"[1] 扫描中（最多 {rounds*per_round}秒），立刻站秤上！")
    for i in range(rounds):
        devs = await BleakScanner.discover(timeout=per_round)
        for d in devs:
            if name_match.lower() in (d.name or "").lower():
                print(f"  >> 第{i+1}轮: {d.name}  [{d.address}]")
                return d
        print(f"  第{i+1}/{rounds}轮 扫到{len(devs)}设备")
    return None

async def try_read(client, char_uuid, label):
    try:
        data = await client.read_gatt_char(char_uuid)
        hex_str = " ".join(f"{b:02x}" for b in data)
        print(f"  READ   {label} [{len(data):>2d}B]: {hex_str}")
        return data
    except Exception as e:
        print(f"  READ   {label} 失败: {e}")
        return None

async def main():
    target = await scan_with_retry(NAME_MATCH)
    if not target:
        print("未找到，排查: 米家解除绑定 + 站秤上 + 双手握电极")
        sys.exit(1)
    print(f"\n[2] 连接 {target.address}")
    async with BleakClient(target.address) as client:
        print("[3] 订阅 0x0051 / 0x0052 / 0x0081 notify")
        for name, uuid in [("0051", CHARS["0051_rw"]), ("0052", CHARS["0052_rw"]), ("0081", CHARS["0081_notify"])]:
            try:
                await client.start_notify(uuid, on_notify)
                print(f"  订阅 {name} OK")
            except Exception as e:
                print(f"  订阅 {name} 失败: {e}")

        print("\n[4] 主动读 0x0050（设备配置/历史）")
        await try_read(client, CHARS["0050_read"], "0050")

        print("\n[5] 试发多种 Xiaomi 启动/握手命令")
        cmds = [
            ("0x0051 [02]",            CHARS["0051_rw"], bytes([0x02])),
            ("0x0051 [03]",            CHARS["0051_rw"], bytes([0x03])),
            ("0x0051 [A0 01 04]",     CHARS["0051_rw"], bytes([0xa0, 0x01, 0x04])),
            ("0x0082 [02]",            CHARS["0082_write"], bytes([0x02])),
        ]
        for label, uuid, payload in cmds:
            try:
                await client.write_gatt_char(uuid, payload, response=False)
                print(f"  写 {label}: {payload.hex()}")
                await asyncio.sleep(2)
            except Exception as e:
                print(f"  写 {label} 失败: {e}")

        print(f"\n[6] 等待 20 秒收集 notify...")
        for i in range(20):
            await asyncio.sleep(1)
            if i % 5 == 4:
                print(f"  {i+1}s... 已收 {len(received)} 包")

        print(f"\n[7] 总计 {len(received)} 个 notify")
        out = "E:/work Codex/健康管理/platform/scale-capture-v2.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"device": target.name, "address": target.address,
                      "received_count": len(received), "packets": received}, f, indent=2)
        print(f"数据已保存: {out}")
        print("\n=== 把所有 NOTIFY/READ 开头的行贴给我 ===")

asyncio.run(main())
