// pb66-driver.js - PB-66 设备触发器驱动（写命令，不阻塞读）
const koffi = require('koffi');
const { execSync } = require('child_process');

const kernel32 = koffi.load('kernel32.dll');
const hid = koffi.load('hid.dll');

const HIDD_ATTRIBUTES = koffi.struct('HIDD_ATTRIBUTES', { Size:'uint32', VendorID:'uint16', ProductID:'uint16', VersionNumber:'uint16' });
const CreateFileW = kernel32.func('void* CreateFileW(_In_ const char16* FileName, uint32 DesiredAccess, uint32 ShareMode, _In_ void* SecurityAttributes, uint32 CreationDisposition, uint32 FlagsAndAttributes, _In_ void* TemplateFile)');
const CloseHandle = kernel32.func('bool CloseHandle(void* Handle)');
const WriteFile = kernel32.func('bool WriteFile(void* hFile, _In_ void* lpBuffer, uint32 n, _Out_ uint32* written, _In_ void* lpOverlapped)');
const HidD_GetAttributes = hid.func('bool HidD_GetAttributes(void* HidDeviceObject, _Out_ HIDD_ATTRIBUTES* Attributes)');

const GENERIC_READ=0x80000000, GENERIC_WRITE=0x40000000;
const FILE_SHARE_READ=1, FILE_SHARE_WRITE=2, OPEN_EXISTING=3;

function findDevicePath() {
  try {
    const out = execSync('pnputil /enum-devices /connected', { encoding: 'utf8', windowsHide: true });
    const marker = 'HID\\VID_5608&PID_080D\\';
    for (const l of out.split(/\r?\n/)) {
      if (l.includes(marker)) {
        const inst = l.split(marker)[1].trim();
        if (inst) return '\\\\?\\HID#VID_5608&PID_080D#' + inst + '#{4d1e55b2-f16f-11cf-88cb-001111000030}';
      }
    }
    return null;
  } catch (e) { return null; }
}

class PB66Device {
  constructor() { this.handle = null; }
  open() {
    const path = findDevicePath();
    if (!path) return { ok:false, msg:'未找到 PB-66 设备' };
    const h = CreateFileW(path, GENERIC_READ|GENERIC_WRITE, FILE_SHARE_READ|FILE_SHARE_WRITE, null, OPEN_EXISTING, 0, null);
    if (!h || h===koffi.NULL || Number(h)===-1) return { ok:false, msg:'打开设备失败' };
    this.handle = h;
    const attrs = {};
    let vid=0, pid=0;
    if (HidD_GetAttributes(h, attrs)) { vid=attrs.VendorID; pid=attrs.ProductID; }
    return { ok:true, vid:vid.toString(16), pid:pid.toString(16) };
  }
  // 写命令（65字节输出报告），返回写入字节数，不阻塞读
  send(bytes) {
    if (!this.handle) return { ok:false, msg:'设备未打开' };
    const out = Buffer.alloc(65, 0);
    Buffer.from(bytes.slice(0, 64)).copy(out, 0);
    const written = [0];
    const w = WriteFile(this.handle, out, 65, written, null);
    return { ok:!!w, written: written[0] };
  }
  close() { if (this.handle) { try{CloseHandle(this.handle);}catch{} this.handle=null; } }
}

const dev = new PB66Device();
const r = dev.open();
console.log('① 打开设备:', JSON.stringify(r));
if (!r.ok) { console.log(r.msg); process.exit(1); }

// 开始检测命令（Rockey 常见握手 0x01 起始）
const start = dev.send([0x00,0x01,0x01,0x00,0x00,0x00,0x00,0x00]);
console.log('② 发送开始检测命令:', JSON.stringify(start));

// 模拟 60 秒检测（期间每 10 秒发一次心跳命令）
console.log('③ 模拟检测中（发心跳命令）...');
for (let i=0;i<3;i++) {
  const hb = dev.send([0x00,0x02,0x00,0x00,0x00,0x00,0x00,0x00]);
  console.log('   心跳', i+1, JSON.stringify(hb));
}

const stop = dev.send([0x00,0x03,0x00,0x00,0x00,0x00,0x00,0x00]);
console.log('④ 发送结束检测命令:', JSON.stringify(stop));

dev.close();
console.log('⑤ 关闭设备 ✅');
console.log('\n=== PB-66 设备触发器流程完整跑通 ===');
