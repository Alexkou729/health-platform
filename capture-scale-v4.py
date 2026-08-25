"""小米/云麦 XMTZC01YM 抓包 v4
关键: 触发"先下后上"测量循环才会出数据
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
        print(f"  第{i+1}/{rounds}轮")
    return None

async def main():
    target = await scan_with_retry(NAME_MATCH)
    if not target:
        print("未找到秤"); sys.exit(1)
    print(f"\n[2] 连接 {target.address}")
    async with BleakClient(target.address) as client:
        print("[3] 订阅 0x0051/0x0052/0x0081")
        for n, u in [("0051", CHARS["0051_rw"]), ("0052", CHARS["0052_rw"]), ("0081", CHARS["0081_notify"])]:
            try: await client.start_notify(u, on_notify); print(f"  {n} OK")
            except Exception as e: print(f"  {n} 失败: {e}")

        print("\n[4] 发 12 字节用户资料")
        ui = build_userinfo("male", 30, 170, 70)
        print(f"  payload: {ui.hex()}")
        try: await client.write_gatt_char(CHARS["0051_rw"], ui, response=False); print("  写 OK")
        except Exception as e: print(f"  写失败: {e}")

        # === 关键步骤：用户需要在脚本期间下秤再上秤 ===
        print("\n" + "="*60)
        print("【重要】现在你需要:")
        print("  1) 先从秤上下来（脚离开电极）")
        print("  2) 等 2 秒")
        print("  3) 再踩上秤（脚+手都接触）")
        print("  4) 秤会嘀一声开始测")
        print("  5) 保持站姿 30 秒")
        print("="*60)

        print("\n[5] 等待 35 秒收集 notify")
        for i in range(35):
            await asyncio.sleep(1)
            if i in [2, 5, 10, 15, 20, 25, 30]:
                print(f"  {i+1}s... 已收 {len(received)} 包")
            if len(received) > 0 and i > 3:
                print(f"  收到数据! 继续收集...")

        # 再尝试发一个体重请求
        if len(received) == 0:
            print("\n[6] 还没收到，再试发体重请求")
            for label, payload in [
                ("[02 00]", bytes([0x02, 0x00])),
                ("[A1 01 04]", bytes([0xA1, 0x01, 0x04])),
                ("[0E 01]", bytes([0x0E, 0x01])),
            ]:
                try:
                    await client.write_gatt_char(CHARS["0051_rw"], payload, response=False)
                    print(f"  写 0x0051 {label}: {payload.hex()}")
                    await asyncio.sleep(3)
                except: pass
            await asyncio.sleep(10)
            print(f"  现在共 {len(received)} 包")

        print(f"\n[7] 总计 {len(received)} 个 notify")
        out = "E:/work Codex/健康管理/platform/scale-capture-v4.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"device": target.name, "address": target.address,
                      "received_count": len(received), "packets": received}, f, indent=2)
        print(f"数据已保存: {out}")
        if received:
            print("\n=== 有数据了！把这些 NOTIFY 行贴给我 ===")
        else:
            print("\n=== 还是 0 通知，通知我，我换 Wireshark 抓 HCI 原始流量 ===")

asyncio.run(main())
