import pefile, lzma, struct, os, re

exe = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-install.exe'
out_dir = r'E:\work Codex\健康管理\platform\docs\设备代工\V13-extracted'
os.makedirs(out_dir, exist_ok=True)

with open(exe, 'rb') as f:
    f.seek(0xc800)  # overlay start
    overlay = f.read()

# 找到 NullsoftInst 签名的位置
sig = b'\xef\xbe\xad\xdeNullsoftInst'
idx = overlay.find(sig)
print(f"NSIS signature at overlay offset: {idx}")
# dwLength 在签名之前 4 字节
dwLength = struct.unpack('<I', overlay[idx-4:idx])[0]
print(f"EXEHEAD dwLength: {dwLength} ({hex(dwLength)})")

# LZMA 数据起始：通常在 EXEHEAD 之后
data_start = idx - 4 + dwLength
print(f"Expected LZMA data start: {data_start} ({hex(data_start)})")

# 看 data_start 周围的内容
print(f"Data at data_start: {overlay[data_start:data_start+32].hex()}")
print(f"Next 16 bytes as ASCII: {overlay[data_start:data_start+16]}")

# NSIS LZMA 压缩数据前有 4 字节 size
comp_size_bytes = overlay[data_start:data_start+4]
comp_size = struct.unpack('<I', comp_size_bytes)[0]
print(f"Compressed size: {comp_size} ({hex(comp_size)})")

# LZMA stream 从 data_start+4 开始
lzma_offset = data_start + 4
print(f"LZMA stream offset: {lzma_offset}")

# 尝试解压 NSIS LZMA (props=0x5d 通常)
def try_lzma(data, offset):
    try:
        props = data[offset]
        dict_size = struct.unpack('<I', data[offset+1:offset+5])[0]
        # NSIS LZMA1 props 通常 0x5d
        if props != 0x5d: return None
        filters = [{"id": lzma.FILTER_LZMA1, "lc": 3, "lp": 0, "pb": 2, "dict_size": dict_size}]
        decomp = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filters)
        result = decomp.decompress(data[offset+5:])
        return result
    except Exception as e:
        return f"ERR: {e}"

result = try_lzma(overlay, lzma_offset)
if isinstance(result, bytes) and len(result) > 100:
    print(f"\n✓ 解压成功: {len(result)} bytes")
    outpath = os.path.join(out_dir, 'nsis_full.bin')
    with open(outpath, 'wb') as f:
        f.write(result)
    print(f"保存到: {outpath}")
    
    # 在解压数据中找算法、条件、关键字
    text = result.decode('utf-8', errors='ignore')
    
    # 寻找有意义的字符串（中文+英文）
    print(f"\n===== 解压内容分析 =====")
    # 中文片段
    cn_matches = re.findall(r'[\u4e00-\u9fff]{2,40}', text)
    print(f"中文字符串片段数: {len(cn_matches)}")
    for s in cn_matches[:60]:
        print(f"  {s}")
else:
    print(f"\n解压失败: {result}")
    # 尝试不同 props
    print("尝试不同 LZMA props...")
    for props in [0x5d, 0x6d, 0x7d]:
        for ds in [1<<16, 1<<17, 1<<18, 1<<19, 1<<20, 1<<21, 1<<22, 1<<23, 1<<24]:
            try:
                filters = [{"id": lzma.FILTER_LZMA1, "lc": props%9, "lp": (props//9)%5, "pb": props//45, "dict_size": ds}]
                decomp = lzma.LZMADecompressor(format=lzma.FORMAT_RAW, filters=filters)
                result = decomp.decompress(overlay[lzma_offset+5:])
                if len(result) > 100:
                    print(f"  ✓ props=0x{props:02x} dict={ds}: {len(result)} bytes")
                    with open(os.path.join(out_dir, 'nsis_full.bin'), 'wb') as f:
                        f.write(result)
                    break
            except: pass
        else: continue
        break
