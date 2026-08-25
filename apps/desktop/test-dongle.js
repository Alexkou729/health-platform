const koffi = require("koffi");
const path = require("path");
const dllPath = path.join(__dirname, "Dongle_d.dll");

const DONGLE_INFO = koffi.struct("DONGLE_INFO", {
  m_Ver: "uint16",
  m_Type: "uint16",
  m_BirthDay: koffi.array("uint8", 8),
  m_Agent: "uint32",
  m_PID: "uint32",
  m_UserID: "uint32",
  m_HID: koffi.array("uint8", 8),
  m_IsMother: "uint32",
  m_DevType: "uint32",
});

const dll = koffi.load(dllPath);
const Dongle_Enum = dll.func("int Dongle_Enum(_Out_ DONGLE_INFO *info, _Out_ int *count)");

const info = {};
const count = [0];
try {
  const rv = Dongle_Enum(info, count);
  console.log("rv =", rv, "count =", count[0]);
  const hid = (info.m_HID || []).map(b => b.toString(16).padStart(2, "0")).join("");
  console.log("PID = 0x" + (info.m_PID || 0).toString(16), "HID =", hid, "Ver =", info.m_Ver, "Type =", info.m_Type);
} catch (e) {
  console.error("ERR:", e.message);
}
