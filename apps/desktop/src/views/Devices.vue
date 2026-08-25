<template>
  <div class="devices-page">
    <div class="page-header">
      <div>
        <h2>设备管理</h2>
        <p class="text-secondary text-sm">共 {{ total }} 台设备 · 在线 {{ stats.online || 0 }} 台</p>
      </div>
      <div class="header-actions">
        <el-button type="success" @click="scanDevices" :loading="scanning"><el-icon><Aim /></el-icon>自动识别设备</el-button>
        <el-button @click="loadDevices" :icon="Refresh">刷新</el-button>
        <el-button type="primary" @click="showAddDialog = true"><el-icon><Plus /></el-icon>添加设备</el-button>
      </div>
    </div>

    <!-- 设备统计 -->
    <div class="stats-row fade-in">
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #059669, #0ea5e9)">
          <el-icon :size="22"><Cpu /></el-icon>
        </div>
        <div>
          <div class="stat-label">设备总数</div>
          <div class="stat-value">{{ stats.total || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #059669, #059669)">
          <el-icon :size="22"><CircleCheck /></el-icon>
        </div>
        <div>
          <div class="stat-label">在线</div>
          <div class="stat-value text-success">{{ stats.online || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706)">
          <el-icon :size="22"><Loading /></el-icon>
        </div>
        <div>
          <div class="stat-label">检测中</div>
          <div class="stat-value text-warning">{{ stats.detecting || 0 }}</div>
        </div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #6b7280, #4b5563)">
          <el-icon :size="22"><CircleClose /></el-icon>
        </div>
        <div>
          <div class="stat-label">离线</div>
          <div class="stat-value text-tertiary">{{ stats.offline || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- USB 设备检测提示 -->
    <el-alert v-if="usbDevices.length > 0" type="success" :closable="false" style="margin-bottom: 12px" show-icon>
      <template #title>
        扫描到 {{ usbDevices.length }} 台 USB 设备（含序列号），点击「一键注册到系统」自动入库
      </template>
      <div style="margin-top: 8px">
        <el-tag v-for="d in usbDevices" :key="d.path" style="margin-right: 8px; margin-bottom: 4px">
          {{ d.name }} · 序列号 {{ d.deviceNo }}
        </el-tag>
        <el-button type="primary" size="small" @click="bindUsbDevices" style="margin-left: 8px">一键注册到系统</el-button>
      </div>
    </el-alert>

    <div class="glass-card" style="flex: 1; overflow: hidden; display: flex; flex-direction: column">
      <el-table :data="items" style="flex: 1" stripe v-loading="loading">
        <el-table-column label="设备编号" width="180">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 8px">
              <div class="device-pulse" :class="`status-${row.status}`"></div>
              <strong>{{ row.deviceNo }}</strong>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="vendor" label="厂商" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="dark">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="VID/PID" width="180">
          <template #default="{ row }">
            <span class="text-xs text-tertiary">
              0x{{ (row.hidVendorId || 0).toString(16).toUpperCase() }} : 0x{{ (row.hidProductId || 0).toString(16).toUpperCase() }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="totalDetections" label="累计检测" width="100" />
        <el-table-column label="绑定时间" width="180">
          <template #default="{ row }">{{ formatDate(row.boundAt) }}</template>
        </el-table-column>
        <el-table-column label="到期时间" width="180">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expiresAt) }">{{ formatDate(row.expiresAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="store.name" label="门店" width="120" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="editDevice(row)">编辑</el-button>
            <el-button text type="success" size="small" @click="renewDevice(row)">续期</el-button>
            <el-button text type="danger" size="small" @click="removeDevice(row)">解绑</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadDevices"
        style="margin-top: 12px; justify-content: flex-end"
      />
    </div>

    <!-- 添加/编辑对话框 -->
    <el-dialog v-model="showAddDialog" :title="editing ? '编辑设备' : '添加设备'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="设备编号" required>
          <el-input v-model="form.deviceNo" placeholder="例如: QA-13-001" />
        </el-form-item>
        <el-form-item label="厂商">
          <el-input v-model="form.vendor" placeholder="Quantum" />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="form.model" placeholder="QA-13" />
        </el-form-item>
        <el-form-item label="VID">
          <el-input-number v-model="form.hidVendorId" :min="0" :max="65535" :step="1" />
        </el-form-item>
        <el-form-item label="PID">
          <el-input-number v-model="form.hidProductId" :min="0" :max="65535" :step="1" />
        </el-form-item>
        <el-form-item label="所属门店">
          <el-select v-model="form.storeId" placeholder="选择门店" style="width: 100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="到期时间">
          <el-date-picker v-model="form.expiresAt" type="datetime" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="submitDevice">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Cpu, CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue';
import { Aim } from '@element-plus/icons-vue';
import { deviceApi, storeApi } from '@/api';

const items = ref<any[]>([]);
const total = ref(0);
const stats = ref<any>({});
const stores = ref<any[]>([]);
const usbDevices = ref<any[]>([]);
const loading = ref(false);
const showAddDialog = ref(false);
const editing = ref(false);
const scanning = ref(false);

const filters = reactive({ page: 1, pageSize: 20 });

const form = reactive({
  id: '',
  deviceNo: '', vendor: 'Quantum', model: 'QA-13',
  hidVendorId: 0x5608, hidProductId: 0x080D,
  storeId: '', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
});

async function loadDevices() {
  loading.value = true;
  try {
    const [list, s] = await Promise.all([
      deviceApi.list({ page: filters.page, pageSize: filters.pageSize }),
      deviceApi.statistics(),
    ]);
    items.value = (list as any).items || [];
    total.value = (list as any).total || 0;
    stats.value = s;
  } catch (e: any) {
    ElMessage.error(e.message);
  } finally {
    loading.value = false;
  }
}

async function loadStores() {
  try {
    stores.value = (await storeApi.list()) as any[];
    if (stores.value.length > 0 && !form.storeId) form.storeId = stores.value[0].id;
  } catch {}
}

// 通过 Electron IPC 扫描 USB 设备（含序列号）
async function scanDevices() {
  scanning.value = true;
  try {
    const api = (window as any).electronAPI;
    if (!api?.scanDevices) {
      ElMessage.warning('当前版本不支持自动扫描，请通过「添加设备」手动录入设备编号');
      usbDevices.value = [];
      return;
    }
    const list = (await api.scanDevices()) || [];
    // 过滤掉明显是鼠标/键盘/摄像头等常见外设
    usbDevices.value = list.filter((d: any) => !/鼠标|键盘|触摸板|Camera|摄像头|指纹|Bluetooth/i.test(d.name));
    if (usbDevices.value.length === 0) ElMessage.info('未扫描到可注册的 USB 设备，请确认检测仪已插入');
    else ElMessage.success('扫描到 ' + usbDevices.value.length + ' 台设备');
  } catch (e: any) {
    ElMessage.error('扫描失败：' + (e.message || e));
  } finally {
    scanning.value = false;
  }
}

async function bindUsbDevices() {
  if (usbDevices.value.length === 0) return;
  try {
    const res: any = await deviceApi.sync(usbDevices.value.map((d: any) => ({
      deviceNo: d.deviceNo, vendor: 'Quantum', model: 'QA-13', vendorId: d.vendorId, productId: d.productId,
    })));
    ElMessage.success('已自动注册 ' + (res?.registered || usbDevices.value.length) + ' 台设备到系统');
    usbDevices.value = [];
    loadDevices();
  } catch (e: any) {
    ElMessage.error('注册失败：' + (e.message || e));
  }
}

function editDevice(row: any) {
  editing.value = true;
  Object.assign(form, row);
  showAddDialog.value = true;
}

async function submitDevice() {
  if (!form.deviceNo) { ElMessage.warning('请填写设备编号'); return; }
  try {
    const payload = {
      deviceNo: form.deviceNo,
      vendor: form.vendor,
      model: form.model,
      hidVendorId: form.hidVendorId,
      hidProductId: form.hidProductId,
      storeId: form.storeId,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    if (editing.value) await deviceApi.update(form.id, payload);
    else await deviceApi.create(payload);
    ElMessage.success('保存成功');
    showAddDialog.value = false;
    editing.value = false;
    Object.assign(form, { id: '', deviceNo: '', vendor: 'Quantum', model: 'QA-13', hidVendorId: 0x5608, hidProductId: 0x080D, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
    loadDevices();
  } catch (e: any) {
    ElMessage.error(e.message);
  }
}

async function removeDevice(row: any) {
  await ElMessageBox.confirm(`确定解绑设备 "${row.deviceNo}" 吗？`, '提示', { type: 'warning' });
  await deviceApi.remove(row.id);
  ElMessage.success('已解绑');
  loadDevices();
}

async function renewDevice(row: any) {
  const newExpiry = new Date(row.expiresAt);
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  await deviceApi.update(row.id, { expiresAt: newExpiry.toISOString() });
  ElMessage.success('已续期 1 年');
  loadDevices();
}

function statusLabel(s: number) { return ['离线', '在线', '检测中', '故障', '维护'][s] || '未知'; }
function statusType(s: number) { return ['', 'success', 'warning', 'danger', 'info'][s] || 'info'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }
function isExpired(d: string) { return d ? new Date(d).getTime() < Date.now() : false; }

let timer: any;
onMounted(() => {
  loadDevices();
  loadStores();
  // 每 10s 刷新一次状态
  timer = setInterval(() => {
    deviceApi.statistics().then(s => stats.value = s).catch(() => {});
  }, 10000);
});
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<style lang="scss" scoped>
.devices-page { display: flex; flex-direction: column; height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 8px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.stat-label { font-size: 12px; color: var(--text-tertiary); }
.stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
.text-success { color: #059669; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }
.text-tertiary { color: var(--text-tertiary); }

.device-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6b7280;
  flex-shrink: 0;
}
.device-pulse.status-1 { background: #059669; box-shadow: 0 0 8px rgba(5, 150, 105, 0.6); animation: pulse 2s infinite; }
.device-pulse.status-2 { background: #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.6); animation: pulse 1s infinite; }
.device-pulse.status-3 { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}
</style>
