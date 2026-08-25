import pefile, lzma, struct, os, re

exe = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-install.exe'
out_dir = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-extracted'
os.makedirs(out_dir, exist_ok=True)

# 整个文件扫描 LZMA1 流（不仅 overlay）
with open(exe, 'rb') as f:
    data = f.read()

print(f"File size: {len(data)}")

# NSIS 通常 props=0x5d (lc=3, lp=0, pb=2)
# 不同的 dict size: 64KB-8MB
found = []
for off in range(0, len(data) - 100):
    if data[off] == 0x5d:
        # 检查接下来 4 字节是否是合理的 dict size
        dict_size = struct.unpack('<I', data[off+1:off+5])[0]
        if dict_size in [1<<16, 1<<17, 1<<18, 1<<19, 1<<20, 1<<21, 1<<22, 1<<23, 1<<24]:
            try:
                filters = [{"id": lzma.FILTER_LZMA1, "lc": 3, "lp": 0, "pb": 2, "dict_size": dict_size}]
                decomp = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filters)
                # 限制解压量（防止爆炸）
                result = b''
                chunk_idx = 0
                while chunk_idx < 200:
                    try:
                        chunk = decomp.decompress(data[off+5+chunk_idx:off+5+chunk_idx+1<<16])
                        if not chunk: break
                        result += chunk
                        chunk_idx += len(chunk) if chunk else 1
                        if len(result) > 200000: break  # 限制
                    except: break
                if len(result) > 500 and (b'\x00' in result[:100] or result[:20].isascii() or any(0x80 <= b <= 0xff for b in result[:20])):
                    found.append((off, dict_size, result))
            except: pass

print(f"\n找到 {len(found)} 个潜在 LZMA 流")
for i, (off, ds, content) in enumerate(found[:10]):
    # 检查是否是 NSIS 脚本（包含特定关键字）
    text = content.decode('utf-8', errors='ignore')
    is_script = 'Section' in text or 'Function' in text or 'Push' in text or 'NSIS' in text
    has_chinese = bool(re.search(r'[\u4e00-\u9fff]', text))
    print(f"\n[{i}] offset={off} (0x{off:x}), dict={ds}, decompressed={len(content)}")
    print(f"    is_script={is_script}, has_chinese={has_chinese}")
    if has_chinese and len(content) > 5000:
        outpath = os.path.join(out_dir, f'stream_{i}_{off:x}.bin')
        with open(outpath, 'wb') as f:
            f.write(content)
        print(f"    saved: {outpath}")
        # 输出中文片段
        cn = re.findall(r'[\u4e00-\u9fff]{3,}', text)
        print(f"    Chinese strings: {len(cn)}")
        for s in cn[:40]:
            print(f"      {s}")
