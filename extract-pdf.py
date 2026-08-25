import pypdf, os, json
base = "E:/work Codex/健康管理/platform/docs/设备代工/o报告/extracted"
out = "E:/work Codex/健康管理/platform/docs/设备代工/o报告/extracted-text.txt"
pdfs = sorted([f for f in os.listdir(base) if f.lower().endswith('.pdf')])
with open(out, 'w', encoding='utf-8') as f:
    for pdf in pdfs:
        try:
            reader = pypdf.PdfReader(os.path.join(base, pdf))
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            f.write(f"\n===== {pdf} =====\n")
            f.write(text)
            print(f"OK {pdf}: {len(text)} 字")
        except Exception as e:
            print(f"ERR {pdf}: {e}")
print("完成，保存到", out)
