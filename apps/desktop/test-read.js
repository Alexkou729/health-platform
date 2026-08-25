// PB-66 设备读取测试：打开设备 -> 连读3次 -> 打印返回字节
const koffi = require('koffi');
const { execSync } = require('child_process');

const kernel32 = koffi.load('kernel32.dll');
const hid = koffi.load('hid.dll');
const CreateFileW = kernel32.func('void* CreateFileW(_In_ const char16* FileName, uint32 DesiredAccess, uint32 ShareMode, _In_ void* SecurityAttributes, uint32 CreationDisposition, uint32 FlagsAndAttributes, _In_ void* TemplateFile)');
const CloseHandle = kernel32.func('bool CloseHandle(void* Handle)');
const WriteFile = kernel32.func('bool WriteFile(void* hFile, _In_ void* lpBuffer, uint32 n, _Out_ uint32* written, _In_ void* lpOverlapped)');
const ReadFile = kernel32.func('bool ReadFile(void* hFile, _Out_ void* lpBuffer, uint32 nNumberOfBytesToRead, _Out_ uint32* lpNumberOfBytesRead, _In_ void* lpOverlapped)');
const HidD_GetAttributes = hid.func('bool HidD_GetAttributes(void* HidDeviceObject, _Out_ void* Attributes)');

const GENERIC_READ = 0x80000000, GENERIC_WRITE = 0x40000000;
const FILE_SHARE_READ = 1, FILE_SHARE_WRITE = 2, OPEN_EXISTING = 3;

function findDevicePath() {
  try {
    const out = execSync('pnputil /enum-devices /connected', { encoding: 'utf8', windowsHide: true });
    const marker = 'HID\\VID_5608&PID_080D\\';
    for (const line of out.split(/\r?\n/)) {
      if (line.includes(marker)) {
        const inst = line.split(marker)[1].trim();
        if (inst) return `\\\\?\\HID#VID_5608&PID_080D#${inst}#{4d1e55b2-f16f-11cf-88cb-001111000030}`;
      }
    }
  } catch {}
  return null;
}

const path = findDevicePath();
if (!path) { console.log('未找到 PB-66 设备（请确认已插入）'); process.exit(1); }
console.log('设备路径:', path);

const h = CreateFileW(path, GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE, null, OPEN_EXISTING, 0, null);
if (!h || Number(h) === -1) { console.log('打开设备失败（可能被原软件占用，请关闭原软件）'); process.exit(1); }
console.log('已打开设备 handle=', Number(h));

// 发送开始命令（与 pb66.ts 一致）
const cmd = [0x00, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00];
const out = Buffer.alloc(65, 0); Buffer.from(cmd.slice(0,64)).copy(out, 0);
const written = [0]; WriteFile(h, out, 65, written, null);
console.log('已发送开始命令, written=', written[0]);

async function readOnce(label) {
  const buf = Buffer.alloc(66, 0);
  const read = [0];
  const ok = ReadFile(h, buf, 65, read, null);
  const data = Buffer.from(buf.slice(0, read[0] || 0));
  console.log(label + ': ok=' + !!ok + ' read=' + read[0] + ' hex=' + data.toString('hex'));
  console.log(label + ': ascii=' + JSON.stringify(data.toString('utf8')));
}

(async () => {
  await readOnce('READ#1');
  await new Promise(r => setTimeout(r, 1000));
  await readOnce('READ#2');
  await new Promise(r => setTimeout(r, 1000));
  await readOnce('READ#3');
  CloseHandle(h);
  console.log('已关闭设备');
})();
