"""小米/云麦 XMTZC01YM 抓包 v5
关键修正: 启动命令写 0x0052（实时体重），不是 0x0051
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
}
NAME_MATCH = "Xiaomi 8-Electrode"

received = []

def on_notify(sender, data):
    hex_str = " ".join(f"{b:02x}" for b in data)
    print(f"  *** NOTIFY [{len(data):>2d}B] {str(sender.uuid)[-8:]}: {hex_str}")
    received.append({"char": str(sender.uuid)[-8:], "data_hex": hex_str, "len": len(data)})

def build_userinfo(gender, age, height_cm, weight_kg):
    return bytes([0x20, 0x09, 0x10, 0x00, 0x9c, 0x00 if gender == "male" else 0x01, age, height_cm, int(weight_kg*2), 0x00, 0x00, 0x00])

async def scan_with_retry(name_match, rounds=10, per_round=4):
    print(f"[1] 扫描（最多40秒）")
    for i in range(rounds):
        devs = await BleakScanner.discover(timeout=per_round)
        for d in devs:
            if name_match.lower() in (d.name or "").lower():
                print(f"  >> 第{i+1}轮: {d.name}  [{d.address}]")
                return d
        print(f"  第{i+1}/{rounds}轮 扫到{len(devs)}设备")
    return None

async def try_write(client, uuid, payload, label):
    try:
        await client.write_gatt_char(uuid, payload, response=False)
        print(f"  写 {label}: {payload.hex()}")
    except Exception as e:
        print(f"  写 {label} 失败: {e}")

async def main():
    target = await scan_with_retry(NAME_MATCH)
    if not target:
        print("未找到秤"); sys.exit(1)
    print(f"\n[2] 连接 {target.address}")
    async with BleakClient(target.address) as client:
        print("[3] 订阅全部 3 个 notify")
        for n, u in [("0051", CHARS["0051_rw"]), ("0052", CHARS["0052_rw"]), ("0081", CHARS["0081_notify"])]:
            try: await client.start_notify(u, on_notify); print(f"  {n} OK")
            except Exception as e: print(f"  {n} 失败: {e}")

        # === 关键修复：先写 0x0052 启动实时体重 ===
        print("\n[4] 写 0x0052 启动实时体重（关键修正）")
        for payload in [bytes([0x01]), bytes([0x02]), bytes([0x03]), bytes([0x00])]:
            await try_write(client, CHARS["0052_rw"], payload, f"0x0052 [{payload.hex()}]")
            await asyncio.sleep(2)

        # 然后写 0x0051 用户资料
        print("\n[5] 写 0x0051 用户资料")
        ui = build_userinfo("male", 30, 170, 70)
        await try_write(client, CHARS["0051_rw"], ui, "0x0051 [12字节用户资料]")
        await asyncio.sleep(2)

        # 再写 0x0052 启动命令（用户资料写完后）
        print("\n[6] 写 0x0052 启动测量（写用户资料后）")
        for payload in [bytes([0x01]), bytes([0x02]), bytes([0x10])]:
            await try_write(client, CHARS["0052_rw"], payload, f"0x0052 [{payload.hex()}]")
            await asyncio.sleep(1.5)

        # 再试 0x0051 启动
        print("\n[7] 写 0x0051 启动 BIA")
        for payload in [bytes([0x01]), bytes([0x02]), bytes([0x10])]:
            await try_write(client, CHARS["0051_rw"], payload, f"0x0051 [{payload.hex()}]")
            await asyncio.sleep(1.5)

        # === 用户下-上秤 ===
        print("\n" + "="*60)
        print("【现在】从秤上下来，等3秒，再踩上（脚+手）")
        print("="*60)
        print("\n[8] 等待 30 秒收 notify")
        for i in range(30):
            await asyncio.sleep(1)
            if i in [2, 5, 10, 15, 20, 25]:
                print(f"  {i+1}s... 已收 {len(received)} 包")

        print(f"\n[9] 总计 {len(received)} 个 notify")
        out = "E:/work Codex/健康管理/platform/scale-capture-v5.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"device": target.name, "address": target.address,
                      "received_count": len(received), "packets": received}, f, indent=2)
        print(f"数据已保存: {out}")
        if received:
            print("\n=== 有数据了！把 NOTIFY 行贴给我 ===")
        else:
            print("\n=== 还是 0 通知。试试用米家App配对+Android btsnoop 抓包 ===")

asyncio.run(main())
