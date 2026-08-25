<template>
  <div class="bc-page">
    <div class="page-header">
      <div>
        <h2>体脂秤 / 体成分管理</h2>
        <p class="text-secondary text-sm">通过蓝牙连接体脂秤（如小米 XMTZC01YM），读取真实 BIA 测量数据</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showScanner = true"><el-icon><Bluetooth /></el-icon> 连接体脂秤</el-button>
      </div>
    </div>

    <div class="grid">
      <el-card class="customer-card">
        <template #header>选择客户</template>
        <el-select v-model="customerId" filterable remote :remote-method="searchCustomers" :loading="loadingCustomers"
          placeholder="输入姓名/手机号搜索客户" style="width: 100%" @change="onCustomerChange">
          <el-option v-for="c in customers" :key="c.id" :label="c.name + ' (' + c.phone + ')'" :value="c.id" />
        </el-select>
        <div v-if="currentCustomer" class="customer-info">
          <div class="info-row"><span>性别</span><strong>{{ currentCustomer.gender === 1 ? '男' : '女' }}</strong></div>
          <div class="info-row"><span>年龄</span><strong>{{ currentCustomer.age || '-' }} 岁</strong></div>
          <div class="info-row"><span>身高</span><strong>{{ currentCustomer.heightCm || '-' }} cm</strong></div>
          <div class="info-row"><span>当前体重</span><strong>{{ currentCustomer.weightKg || '-' }} kg</strong></div>
        </div>
      </el-card>

      <el-card class="latest-card" v-if="latest">
        <template #header>最近一次测量 · {{ formatDate(latest.measuredAt) }}</template>
        <div class="bca-grid">
          <div class="bca-item"><div class="value">{{ latest.weightKg?.toFixed(1) }}</div><div class="label">体重 kg</div></div>
          <div class="bca-item"><div class="value">{{ latest.bmi?.toFixed(1) || '-' }}</div><div class="label">BMI</div></div>
          <div class="bca-item"><div class="value">{{ latest.bodyFatPercent?.toFixed(1) || '-' }}</div><div class="label">体脂率 %</div></div>
          <div class="bca-item"><div class="value">{{ latest.muscleMassKg?.toFixed(1) || '-' }}</div><div class="label">肌肉量 kg</div></div>
          <div class="bca-item"><div class="value">{{ latest.bodyWaterPercent?.toFixed(1) || '-' }}</div><div class="label">水分率 %</div></div>
          <div class="bca-item"><div class="value">{{ latest.visceralFat?.toFixed(1) || '-' }}</div><div class="label">内脏脂肪</div></div>
          <div class="bca-item"><div class="value">{{ latest.boneMassKg?.toFixed(1) || '-' }}</div><div class="label">骨量 kg</div></div>
          <div class="bca-item"><div class="value">{{ latest.proteinKg?.toFixed(1) || '-' }}</div><div class="label">蛋白质 kg</div></div>
          <div class="bca-item"><div class="value">{{ latest.bmrKcal || '-' }}</div><div class="label">基础代谢 kcal</div></div>
          <div class="bca-item"><div class="value">{{ latest.metabolicAge || '-' }}</div><div class="label">身体年龄</div></div>
          <div class="bca-item"><div class="value">{{ latest.bodyScore || '-' }}</div><div class="label">评分</div></div>
        </div>
        <div class="device-meta">来源：{{ latest.source }} · {{ latest.deviceModel }} {{ latest.deviceMac ? '(' + latest.deviceMac + ')' : '' }}</div>
      </el-card>

      <el-card class="history-card">
        <template #header>历史记录</template>
        <el-table :data="history" stripe>
          <el-table-column prop="measuredAt" label="测量时间" :formatter="(r:any) => formatDate(r.measuredAt)" />
          <el-table-column prop="weightKg" label="体重" :formatter="(r:any) => r.weightKg?.toFixed(1) + ' kg'" />
          <el-table-column prop="bmi" label="BMI" :formatter="(r:any) => r.bmi?.toFixed(1) || '-'" />
          <el-table-column prop="bodyFatPercent" label="体脂率" :formatter="(r:any) => r.bodyFatPercent?.toFixed(1) + '%' || '-'" />
          <el-table-column prop="muscleMassKg" label="肌肉量" :formatter="(r:any) => r.muscleMassKg?.toFixed(1) + ' kg' || '-'" />
          <el-table-column prop="bodyWaterPercent" label="水分率" :formatter="(r:any) => r.bodyWaterPercent?.toFixed(1) + '%' || '-'" />
          <el-table-column prop="source" label="来源" />
        </el-table>
      </el-card>
    </div>

    <!-- 蓝牙扫描对话框 -->
    <el-dialog v-model="showScanner" title="蓝牙扫描体脂秤" width="480px">
      <div class="scan-area">
        <el-button type="primary" :loading="scanning" @click="startScan"><el-icon><Search /></el-icon> 开始扫描</el-button>
        <el-button @click="simulateRead" type="success" plain>演示模式（生成示例数据）</el-button>
      </div>
      <el-table :data="devices" v-loading="scanning" empty-text="点击开始扫描">
        <el-table-column prop="name" label="设备名" />
        <el-table-column prop="rssi" label="信号" width="80" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="connectAndRead(row)">连接测量</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { customerApi } from '@/api';
import axios from 'axios';

const customerId = ref('');
const customers = ref<any[]>([]);
const loadingCustomers = ref(false);
const currentCustomer = ref<any>(null);
const latest = ref<any>(null);
const history = ref<any[]>([]);
const showScanner = ref(false);
const scanning = ref(false);
const devices = ref<any[]>([]);

async function searchCustomers(q: string) {
  loadingCustomers.value = true;
  try {
    const res: any = await customerApi.list({ page: 1, pageSize: 20, keyword: q });
    customers.value = res.items || [];
  } finally { loadingCustomers.value = false; }
}

async function onCustomerChange() {
  if (!customerId.value) return;
  const c = customers.value.find((x: any) => x.id === customerId.value);
  if (c) currentCustomer.value = c;
  await loadHistory();
  await loadLatest();
}

async function loadLatest() {
  if (!customerId.value) { latest.value = null; return; }
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    const res: any = await axios.get(`${apiBase}/body-compositions/latest/${customerId.value}`, { headers: { Authorization: `Bearer ${token}` } });
    latest.value = res;
  } catch (e) { latest.value = null; }
}

async function loadHistory() {
  if (!customerId.value) { history.value = []; return; }
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    const res: any = await axios.get(`${apiBase}/body-compositions?customerId=${customerId.value}&pageSize=50`, { headers: { Authorization: `Bearer ${token}` } });
    history.value = res.items || [];
  } catch (e) { history.value = []; }
}

async function startScan() {
  scanning.value = true;
  devices.value = [];
  try {
    const api = (window as any).electronAPI;
    if (!api?.bodyScaleScan) { ElMessage.warning('当前为浏览器模式，无法调用蓝牙'); scanning.value = false; return; }
    devices.value = await api.bodyScaleScan(8000);
    if (devices.value.length === 0) ElMessage.info('未发现体脂秤，可使用演示模式');
  } catch (e: any) { ElMessage.error('扫描失败：' + e?.message); }
  finally { scanning.value = false; }
}

async function simulateRead() {
  const heightM = (currentCustomer.value?.heightCm || 170) / 100;
  const weightKg = 60 + Math.random() * 10;
  const sample = {
    weightKg: +weightKg.toFixed(1),
    bmi: +(weightKg / (heightM * heightM)).toFixed(1),
    bodyFatPercent: 22,
    muscleMassKg: 28,
    bodyWaterPercent: 55,
    visceralFat: 8,
    boneMassKg: 2.8,
    proteinKg: 12.5,
    bmrKcal: 1600,
    metabolicAge: 32,
    bodyScore: 82,
    source: 'MANUAL',
    deviceModel: 'Yunmai-XMTZC01YM (演示)',
    deviceMac: 'AA:BB:CC:DD:EE:01',
  };
  showScanner.value = false;
  await saveData(sample);
}

async function connectAndRead(row: any) {
  if (!customerId.value || !currentCustomer.value) { ElMessage.warning('请先选择客户'); return; }
  const api = (window as any).electronAPI;
  try {
    await api.bodyScaleConnect(row.id);
    const data = await api.bodyScaleRead(row.id, { gender: currentCustomer.value.gender, age: currentCustomer.value.age, heightCm: currentCustomer.value.heightCm });
    if (!data) { ElMessage.error('读取失败，请确认设备已开机并上称'); return; }
    showScanner.value = false;
    await saveData(data);
  } catch (e: any) { ElMessage.error('测量失败：' + e?.message); }
}

async function saveData(data: any) {
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    await axios.post(`${apiBase}/body-compositions`, { ...data, customerId: customerId.value }, { headers: { Authorization: `Bearer ${token}` } });
    ElMessage.success('已保存测量结果');
    await loadLatest();
    await loadHistory();
  } catch (e: any) { ElMessage.error('保存失败：' + e?.message); }
}

function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }
onMounted(() => { searchCustomers(''); });
</script>

<style lang="scss" scoped>
.bc-page { padding: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.customer-card, .latest-card { grid-column: span 1; }
.history-card { grid-column: span 2; }
.customer-info { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed var(--border-color, #e5e7eb); font-size: 13px; }
.info-row strong { color: #059669; }
.bca-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.bca-item { background: rgba(5,150,105,0.04); border-radius: 8px; padding: 12px; text-align: center; }
.bca-item .value { font-size: 22px; font-weight: 700; color: #059669; }
.bca-item .label { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.device-meta { margin-top: 12px; font-size: 12px; color: var(--text-tertiary); }
.scan-area { display: flex; gap: 12px; margin-bottom: 12px; }
</style>
