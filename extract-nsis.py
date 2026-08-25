import pefile, lzma, struct, os, re

exe = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-install.exe'
out_dir = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-extracted'
os.makedirs(out_dir, exist_ok=True)

pe = pefile.PE(exe)
# 找 overlay 起始位置（最后一个 section 末尾对齐）
overlay_offset = pe.get_overlay_data_start_offset()
print(f"Overlay starts at: {overlay_offset} (0x{overlay_offset:x})")
print(f"File size: {os.path.getsize(exe)}")

with open(exe, 'rb') as f:
    f.seek(overlay_offset)
    overlay = f.read()

print(f"Overlay size: {len(overlay)} bytes")
print(f"Overlay header: {overlay[:32].hex()}")

# NSIS v3 header: first 4 bytes = total payload size, then LZMA stream
# 但也可能 header 有变体。先尝试直接读取 LZMA
# LZMA1 header: 1 byte props, 4 bytes dict, 8 bytes size
# NSIS 通常 lc=3 lp=0 pb=2 -> props=0x5d

# 在 overlay 中搜索 LZMA1 起点
def try_lzma_decompress(data, offset):
    if offset >= len(data): return None
    # 尝试读取 LZMA1 header
    if offset + 13 > len(data): return None
    props = data[offset]
    dict_size = struct.unpack('<I', data[offset+1:offset+5])[0]
    uncomp_size = struct.unpack('<q', data[offset+5:offset+13])[0]
    # NSIS LZMA props 通常 0x5d (lc=3 lp=0 pb=2) dict size 通常 64KB-256KB
    if props not in (0x5d, 0x6d, 0x7d): return None
    if dict_size not in (1<<16, 1<<17, 1<<18, 1<<19, 1<<20, 1<<21, 1<<22, 1<<23, 1<<24): return None
    try:
        # 用 Python lzma (xz 格式不行, 需手动构造过滤器)
        filters = [{"id": lzma.FILTER_LZMA1, "lc": props % 9, "lp": (props // 9) % 5, "pb": props // 45, "dict_size": dict_size}]
        decomp = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filters)
        result = decomp.decompress(data[offset+13:])
        return (offset, dict_size, uncomp_size, result)
    except Exception as e:
        return None

# 扫描查找 LZMA 流
print("\n===== 扫描 LZMA1 流 =====")
results = []
for off in range(0, min(len(overlay), 200000), 1):
    if overlay[off] == 0x5d:  # NSIS 最常见 props
        r = try_lzma_decompress(overlay, off)
        if r and len(r[3]) > 1000:
            print(f"  Found LZMA at offset {off} ({hex(off)}), dict={r[1]}, decompressed={len(r[3])} bytes")
            results.append(r)
            if len(results) >= 5:
                break

print(f"\n总找到 {len(results)} 个 LZMA 流")

# 保存解压结果，分析内容
for i, (off, dict_size, uncomp_size, data) in enumerate(results):
    outpath = os.path.join(out_dir, f'nsis_decompressed_{i}.bin')
    with open(outpath, 'wb') as f:
        f.write(data)
    print(f"\n===== 流 {i}: offset={off}, decompressed={len(data)} bytes -> {outpath} =====")
    # 在解压数据中搜索算法/条件关键字
    text = data.decode('utf-8', errors='ignore')
    keywords = ['algorithm', 'calc', 'compute', 'check', 'condition', 'flag', 'if', 'function', 
                '公式', '计算', '判断', '阈值', '范围', '条件', '检测', '算法', '性别', '年龄', '体重',
                'triglyceride', 'cholesterol', 'BMI', 'blood', 'glucose']
    hits = []
    for kw in keywords:
        for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
            start = max(0, m.start() - 50)
            end = min(len(text), m.end() + 50)
            hits.append(text[start:end].replace('\n', ' ').replace('\r', ''))
            if len(hits) >= 8: break
        if len(hits) >= 8: break
    for h in hits[:8]:
        print(f"  >> {h}")
