"""
抓取小米/云麦 XMTZC01YM 真实测量数据（站秤上跑）
用法: 站上秤保持姿势 -> 跑此脚本 -> 把输出贴给我
"""
import asyncio, sys, json
try:
    from bleak import BleakScanner, BleakClient
except ImportError:
    print("需要 bleak: pip install bleak"); sys.exit(1)

SERVICE = "0000fe95-0000-1000-8000-00805f9b34fb"  # Xiaomi Inc.
CHAR_CMD = "00000051-0000-1000-8000-00805f9b34fb"  # 核心数据通道
CHAR_RT  = "00000052-0000-1000-8000-00805f9b34fb"  # 实时体重
CHAR_RN  = "00001881-0000-1000-8000-00805f9b34fb"  # 实时通知
NAME_MATCH = "Xiaomi 8-Electrode"

received = []

def on_notify(sender, data):
    hex_str = " ".join(f"{b:02x}" for b in data)
    print(f"  NOTIFY [{len(data)}B]: {hex_str}")
    received.append({"char": str(sender.uuid)[-8:], "data": hex_str})

async def scan_with_retry(name_match, rounds=5, per_round=5):
    print(f"[1] 多次扫描中（{rounds}轮x{per_round}秒）—— 保持站秤姿势！")
    print("    重要: 现在就该站到秤上、双手握电极，等秤嘀一声开始测")
    all_devs = []
    for i in range(rounds):
        devs = await BleakScanner.discover(timeout=per_round)
        print(f"  第 {i+1}/{rounds} 轮扫到 {len(devs)} 个设备")
        for d in devs:
            all_devs.append(d)
            if name_match.lower() in (d.name or "").lower():
                print(f"  >> 找到: {d.name}  [{d.address}]")
                return d, all_devs
        if i < rounds - 1:
            print("  还没找到。再踏一下秤、握紧电极，等广播")
            await asyncio.sleep(1)
    return None, all_devs

async def main():
    target, all_devs = await scan_with_retry(NAME_MATCH)
    if not target:
        print("\n[诊断] 所有扫到的设备:")
        for d in all_devs:
            print(f"  - {d.address}  {d.name or '(无名)'}")
        print("\n未找到。排查:")
        print("  1) 米家App已解除绑定？")
        print("  2) 脚踩秤+双手紧握手柄电极，金属片要接触皮肤")
        print("  3) 听到'嘀'一声开始测后，广播窗口约5-8秒")
        sys.exit(1)
    print(f"[2] 找到 {target.name}  [{target.address}]")
    print(f"[3] 连接并订阅 0x0051/0x0052/0x0081 notify（请保持站姿）...")
    async with BleakClient(target.address) as client:
        await client.start_notify(CHAR_CMD, on_notify)
        try: await client.start_notify(CHAR_RT, on_notify)
        except: pass
        try: await client.start_notify(CHAR_RN, on_notify)
        except: pass
        print("[4] 发送启动测量命令到 0x0051（写无响应+notify）...")
        # 尝试多个常见 Xiaomi 启动命令
        cmds = [bytes([0x02]), bytes([0x03]), bytes([0x01, 0x01]), bytes([0xa1, 0x01])]
        for i, c in enumerate(cmds):
            try:
                await client.write_gatt_char(CHAR_CMD, c, response=False)
                print(f"  写 0x0051: {c.hex()}")
                await asyncio.sleep(2.5)
            except Exception as e:
                print(f"  命令{i+1}失败: {e}")
        print(f"[5] 收到 {len(received)} 个 notify 数据包")
        out = "E:/work Codex/健康管理/platform/scale-raw-capture.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"device": target.name, "address": target.address, "received": received}, f, indent=2)
        print(f"[6] 数据已保存: {out}")
        print("===  把控制台所有 hex 数据贴给我 ===")

asyncio.run(main())
