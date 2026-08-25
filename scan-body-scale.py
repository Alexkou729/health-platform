"""
扫描小米/云麦 XMTZC01YM 等体脂秤的 BLE 服务和特征
用法：站到秤上保持站立 -> 运行此脚本 -> 把输出贴给我
"""
import asyncio, sys, json
try:
    from bleak import BleakScanner, BleakClient
except ImportError:
    print("需要安装 bleak: pip install bleak"); sys.exit(1)

KNOWN_NAMES = ["XMTZC01YM", "8-Electrode", "YUNMAI", "Mi Body Scale"]

async def scan(timeout=12):
    print(f"\n[1] 扫描 {timeout}s 内可见的 BLE 设备...")
    devices = await BleakScanner.discover(timeout=timeout)
    targets = []
    for d in devices:
        name = d.name or "(无名称)"
        match = any(k.upper() in name.upper() for k in KNOWN_NAMES)
        marker = "  <-- ★ 体脂秤候选" if match else ""
        rssi = getattr(d, "rssi", None)
        if rssi is None and hasattr(d, "details"):
            try: rssi = d.details.get("rssi")
            except: rssi = None
        rssi_str = f"{rssi}dBm" if rssi is not None else "??dBm"
        print(f"  [{rssi_str}] {d.address}  {name}{marker}")
        if match:
            targets.append(d)
    if not targets:
        print("\n未发现候选。请确认: 解除米家绑定 + 站秤上手脚接触电极 + 重试")
        sys.exit(0)
    return targets

async def enumerate_services(address):
    print(f"\n[2] 连接 {address} 并枚举 service/characteristic...")
    async with BleakClient(address) as client:
        # 兼容新旧 bleak
        try:
            svcs = await client.get_services()
        except AttributeError:
            svcs = client.services
        result = {"address": str(address), "services": []}
        for s in svcs:
            svc_info = {"uuid": str(s.uuid), "description": s.description, "characteristics": []}
            for c in s.characteristics:
                props = ",".join(c.properties) if c.properties else ""
                svc_info["characteristics"].append({
                    "uuid": str(c.uuid), "description": c.description,
                    "properties": props, "handle": c.handle,
                })
                print(f"    Svc {s.uuid[-8:]} -> Char {c.uuid[-8:]} [{props}] {c.description or ""}")
            result["services"].append(svc_info)
        return result

async def main():
    targets = await scan(12)
    if len(targets) > 1:
        print(f"\n发现 {len(targets)} 个候选，选第 1 个: {targets[0].name}")
    chosen = targets[0]
    print(f"\n选定的设备: {chosen.name} [{chosen.address}]")
    data = await enumerate_services(chosen.address)
    out = "E:/work Codex/健康管理/platform/body-scale-services.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n[3] 完整服务已保存: {out}")
    print("\n===== 把 service/characteristic UUID 输出贴给我 =====")

asyncio.run(main())
