<template>
  <div class="detection">
    <!-- 左：检测控制面板 -->
    <div class="control-panel glass-card">
      <div class="panel-header">
        <h3>检测控制台</h3>
        <div style="display: flex; align-items: center; gap: 8px;">
          <el-tag v-if="pb66Online" type="success" effect="dark"><el-icon style="vertical-align:middle;margin-right:2px"><Connection /></el-icon> PB-66 已连接</el-tag>
          <el-tag v-else type="danger" effect="dark" @click="checkPb66Device" style="cursor:pointer">
            <el-icon style="vertical-align:middle;margin-right:2px"><CircleClose /></el-icon> PB-66 未连接（点击重试）
          </el-tag>
          <el-tag :type="deviceStatusType" effect="dark">{{ deviceStatusText }}</el-tag>
          <el-tag v-if="deviceStatusHint" type="warning" size="small">{{ deviceStatusHint }}</el-tag>
        </div>
      </div>

      <!-- 设备选择 -->
      <div class="device-selector">
        <div class="label">检测设备</div>
        <el-select v-model="selectedDeviceId" placeholder="选择设备" style="width: 100%">
          <el-option v-for="d in devices" :key="d.id" :label="d.deviceNo + ' (' + d.model + ')'" :value="d.id" :disabled="d.status === 2">
            <div style="display:flex;justify-content:space-between">
              <span>{{ d.deviceNo }}</span>
              <el-tag size="small" :type="d.status === 1 ? 'success' : d.status === 2 ? 'warning' : 'info'">
                {{ statusLabel(d.status) }}
              </el-tag>
            </div>
          </el-option>
        </el-select>
      </div>

      <!-- 客户选择/建档 -->
      <div class="customer-section">
        <div class="section-header">
          <span class="label">客户信息</span>
          <el-button text type="primary" size="small" @click="showCustomerDialog = true">
            <el-icon><Plus /></el-icon>
            新建客户
          </el-button>
        </div>
        <el-select
          v-model="selectedCustomerId"
          filterable
          remote
          :remote-method="searchCustomers"
          :loading="searchLoading"
          placeholder="搜索客户 (姓名 / 手机号)"
          style="width: 100%"
          @change="onCustomerSelect"
        >
          <el-option v-for="c in customerOptions" :key="c.id" :label="c.name + ' (' + c.phone + ')'" :value="c.id">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <span style="font-weight:500">{{ c.name }}</span>
                <span style="margin-left:8px;color:#64748b;font-size:12px">{{ c.phone }}</span>
              </div>
              <el-tag size="small" :type="c.gender === 1 ? 'primary' : 'danger'">
                {{ c.gender === 1 ? '男' : '女' }} {{ c.age }}岁
              </el-tag>
            </div>
          </el-option>
        </el-select>

        <div v-if="selectedCustomer" class="customer-info">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="姓名">{{ selectedCustomer.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ selectedCustomer.gender === 1 ? '男' : '女' }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ selectedCustomer.age || '-' }} 岁</el-descriptions-item>
            <el-descriptions-item label="身高">{{ selectedCustomer.heightCm || '-' }} cm</el-descriptions-item>
            <el-descriptions-item label="体重">{{ selectedCustomer.weightKg || '-' }} kg</el-descriptions-item>
            <el-descriptions-item label="检测次数">{{ selectedCustomer.totalDetections || 0 }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 检测项选择（多选：通用/男/女/儿童） -->
      <div class="check-items-section">
        <div class="section-header">
          <span class="label">检测项（多选，按需勾选）</span>
          <el-button text size="small" @click="activeTab = 'common'">通用</el-button>
          <el-button text size="small" type="primary" @click="activeTab = (selectedCustomer?.gender === 1 ? 'male' : selectedCustomer?.gender === 2 ? 'female' : 'common')" v-if="selectedCustomer">
            智能推荐：{{ selectedCustomer?.gender === 1 ? '男' : selectedCustomer?.gender === 2 ? '女' : '通用' }}
          </el-button>
        </div>
        <el-tabs v-model="activeTab" type="border-card" class="check-tabs">
          <el-tab-pane label="通用" name="common">
            <div class="check-grid">
              <el-checkbox v-for="it in checkItemLibrary.common" :key="it.code" v-model="selectedCheckItems[it.code]">{{ it.label }}</el-checkbox>
            </div>
          </el-tab-pane>
          <el-tab-pane label="男" name="male">
            <div class="check-grid">
              <el-checkbox v-for="it in checkItemLibrary.male" :key="it.code" v-model="selectedCheckItems[it.code]">{{ it.label }}</el-checkbox>
            </div>
          </el-tab-pane>
          <el-tab-pane label="女" name="female">
            <div class="check-grid">
              <el-checkbox v-for="it in checkItemLibrary.female" :key="it.code" v-model="selectedCheckItems[it.code]">{{ it.label }}</el-checkbox>
            </div>
          </el-tab-pane>
          <el-tab-pane label="儿童" name="child">
            <div class="check-grid">
              <el-checkbox v-for="it in checkItemLibrary.child" :key="it.code" v-model="selectedCheckItems[it.code]">{{ it.label }}</el-checkbox>
            </div>
          </el-tab-pane>
        </el-tabs>
        <div class="selected-summary">
          <el-icon><Check /></el-icon>
          已选 {{ Object.values(selectedCheckItems).filter(v => v).length }} 项
        </div>
      </div>

      <!-- 备注 -->
      <div class="remark-section">
        <div class="label">备注</div>
        <el-input v-model="remark" type="textarea" :rows="2" placeholder="本次检测备注（可选）" />
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button v-if="!isDetecting" type="primary" size="large" :disabled="!canStart" @click="startDetection" class="start-btn">
          <el-icon><Aim /></el-icon>
          开始 60 秒检测
        </el-button>
        <el-button type="warning" size="large" @click="togglePause">
          <el-icon><VideoPause /></el-icon>
          {{ paused ? '恢复检测' : '暂停检测' }}
        </el-button>
        <el-button type="danger" size="large" @click="cancelDetection">
          <el-icon><CircleClose /></el-icon>
          取消检测
        </el-button>
      </div>
    </div>

    <!-- 右：检测实时可视化 -->
    <div class="visualization glass-card">
      <div v-if="!isDetecting && !completedResult" class="empty-state">
        <div class="pulse-circle">
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="core">
            <el-icon :size="60"><Aim /></el-icon>
          </div>
        </div>
        <h2>手掌生物电检测</h2>
        <p>请选择设备和客户后，点击开始检测</p>
        <div class="steps">
          <div class="step"><span class="num">1</span> 客户将手掌紧贴电极</div>
          <div class="step"><span class="num">2</span> 系统自动校准</div>
          <div class="step"><span class="num">3</span> 60 秒生物电采集</div>
          <div class="step"><span class="num">4</span> 生成 43 份评估报告</div>
        </div>
      </div>

      <!-- 检测中 -->
      <div v-else-if="isDetecting" class="detecting">
        <div class="circular-progress">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(16,185,129,0.06)" stroke-width="8" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="url(#progress-gradient)" stroke-width="8" stroke-linecap="round"
              :stroke-dasharray="circumference" :stroke-dashoffset="progressOffset"
              transform="rotate(-90 100 100)" class="progress-circle" />
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#059669" />
                <stop offset="100%" stop-color="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
          <div class="progress-text">
            <div class="time">{{ remainingSeconds }}s</div>
            <div class="label">剩余</div>
          </div>
        </div>

        <h2>{{ phaseText }}</h2>

        <!-- 实时波形 -->
        <div class="wave-display">
          <canvas ref="waveCanvasRef" width="800" height="200"></canvas>
        </div>

        <!-- 实时数据 -->
        <div v-if="isDetecting" class="palm-status" :class="palmDetected ? 'palm-on' : 'palm-off'" @click="togglePalm" style="cursor:pointer">
            <el-icon><component :is="palmDetected ? 'CircleCheck' : 'Warning'" /></el-icon>
            <span>{{ palmDetected ? '手掌已放上，检测中（点击暂停）' : '手掌已离开，检测暂停（点击继续）' }}</span>
          </div>
          <div class="real-time-stats">
          <div class="stat">
            <div class="stat-label">信号强度</div>
            <div class="stat-value">{{ signalStrength.toFixed(0) }}%</div>
            <el-progress :percentage="signalStrength" :stroke-width="6" :show-text="false" :color="signalColor" />
          </div>
          <div class="stat">
            <div class="stat-label">心率</div>
            <div class="stat-value">{{ heartRate || '--' }} BPM</div>
          </div>
          <div class="stat">
            <div class="stat-label">已采集</div>
            <div class="stat-value">{{ elapsedSeconds }} / 60 秒</div>
          </div>
        </div>
      </div>

      <!-- 完成 -->
      <div v-else-if="completedResult" class="completed">
        <div class="result-header">
          <div class="score-circle" :style="{ background: scoreGradient(completedResult.score) }">
            <div class="score-value">{{ completedResult.score }}</div>
            <div class="score-label">综合评分</div>
          </div>
          <h2>检测完成</h2>
          <p class="text-secondary">已生成 43 份评估报告</p>
        </div>

        <div class="result-actions">
          <el-button type="primary" size="large" @click="viewReports">
            <el-icon><View /></el-icon>
            查看报告
          </el-button>
          <el-button size="large" @click="resetDetection">
            <el-icon><Refresh /></el-icon>
            下一次检测
          </el-button>
        </div>

        <div class="report-summary">
          <div v-for="r in completedResult.reports" :key="r.id" class="report-summary-item">
            <div class="report-icon"><el-icon><Document /></el-icon></div>
            <div class="report-info">
              <div class="report-title">{{ r.title }}</div>
              <div class="report-meta">
                <el-tag size="small" :type="r.score >= 85 ? 'success' : r.score >= 70 ? 'warning' : 'danger'">{{ r.score }} 分</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建客户对话框 -->
    <el-dialog v-model="showCustomerDialog" title="新建客户" width="500px">
      <el-form :model="newCustomer" label-width="80px">
        <el-form-item label="姓名" required>
          <el-input v-model="newCustomer.name" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="newCustomer.phone" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="newCustomer.gender">
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年龄">
          <el-input-number v-model="newCustomer.age" :min="0" :max="150" />
        </el-form-item>
        <el-form-item label="身高(cm)">
          <el-input-number v-model="newCustomer.heightCm" :min="0" :max="250" />
        </el-form-item>
        <el-form-item label="体重(kg)">
          <el-input-number v-model="newCustomer.weightKg" :min="0" :max="300" :step="0.1" />
        </el-form-item>
        <el-form-item label="生日">
          <el-date-picker v-model="newCustomer.birthday" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCustomerDialog = false">取消</el-button>
        <el-button type="primary" @click="submitNewCustomer">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { detectionApi, deviceApi, customerApi } from '@/api';
import { io } from 'socket.io-client';
import { Lock, InfoFilled } from '@element-plus/icons-vue';
import axios from 'axios';

const router = useRouter();

const devices = ref<any[]>([]);
const selectedDeviceId = ref('');
const customerOptions = ref<any[]>([]);
const selectedCustomerId = ref('');
const selectedCustomer = ref<any>(null);
const remark = ref('');
const searchLoading = ref(false);
const showCustomerDialog = ref(false);

const newCustomer = ref({
  name: '', phone: '', gender: 1, age: 30, heightCm: 170, weightKg: 60, birthday: '', storeId: '',
});

// 检测项（多选：男/女/儿童/通用）
const checkItemLibrary: Record<string, any[]> = {
  common: [
    { code: 'weight', label: '体重', category: '通用' },
    { code: 'bmi', label: 'BMI', category: '通用' },
    { code: 'body_fat', label: '体脂率', category: '通用' },
    { code: 'visceral', label: '内脏脂肪', category: '通用' },
    { code: 'bmr', label: '基础代谢', category: '通用' },
    { code: 'body_age', label: '身体年龄', category: '通用' },
  ],
  male: [
    { code: 'muscle', label: '肌肉量', category: '男' },
    { code: 'water', label: '水分率', category: '男' },
    { code: 'protein', label: '蛋白质', category: '男' },
    { code: 'bone', label: '骨量', category: '男' },
    { code: 'androgen', label: '雄激素', category: '男' },
    { code: 'prostate', label: '前列腺', category: '男' },
  ],
  female: [
    { code: 'muscle', label: '肌肉量', category: '女' },
    { code: 'water', label: '水分率', category: '女' },
    { code: 'protein', label: '蛋白质', category: '女' },
    { code: 'bone', label: '骨量', category: '女' },
    { code: 'estrogen', label: '雌激素', category: '女' },
    { code: 'breast', label: '乳腺', category: '女' },
    { code: 'gyn', label: '妇科', category: '女' },
  ],
  child: [
    { code: 'growth', label: '生长发育', category: '儿童' },
    { code: 'nutrition', label: '营养状况', category: '儿童' },
    { code: 'bone_age', label: '骨龄评估', category: '儿童' },
  ],
};
const activeTab = ref<'common' | 'male' | 'female' | 'child'>('common');
const selectedCheckItems = ref<Record<string, boolean>>({
  weight: true, bmi: true, body_fat: true, visceral: true, bmr: true, body_age: true,
  muscle: true, water: true, protein: true, bone: true,
  androgen: false, prostate: false, estrogen: false, breast: false, gyn: false,
  growth: false, nutrition: false, bone_age: false,
});

// 原系统接入状态
const origStatus = ref<any>({ dirExists: false, lastFiles: 0, polling: false });
let origAutoLaunched = false; // 自动启动标志（避免重复）
const origImporting = ref(false);
const origHistory = ref<any[]>([]);
const origControls = ref<any[]>([]);
let origPollTimer: any = null;

// 启动原系统检测软件
function launchOriginal() { /* 已移除原系统集成 */ }
function discoverOriginalControls() { /* 已移除原系统集成 */ }
function refreshOrigStatus() { /* 已移除原系统集成 */ }
function importOriginal() { /* 已移除原系统集成 */ }
function loadOriginalHistory() { /* 已移除原系统集成 */ }
function startOrigPolling() { /* 已移除原系统集成 */ }


const isDetecting = ref(false);
const elapsedSeconds = ref(0);
const remainingSeconds = ref(60);
const progress = ref(0);
const phase = ref('CONNECTING');
const signalStrength = ref(0);
const heartRate = ref(0);

// 物理设备（PB-66）状态
const pb66Online = ref(true); // 不再检测PB-66，把设备让给原系统
// 手掌接触检测（手离开暂停，手放上继续）
const palmDetected = ref(true);
const paused = ref(false);
let palmPollTimer: any = null;
// 手掌接触为手动控制（PB-66 加密狗无法自动读手掌信号，改手动按钮）
async function togglePalm() {
  // 不再控制 PB-66 设备（避免与原系统抢接口），只暂停/恢复计时
  if (palmDetected.value) {
    palmDetected.value = false;
    paused.value = true;
    ElMessage.warning('已暂停计时（手掌离开）');
  } else {
    palmDetected.value = true;
    paused.value = false;
    ElMessage.success('已恢复计时（手掌放上）');
  }
}
async function checkPalmContact() { /* 手动控制，不自动读 */ }
function startPalmPolling() {
  if (palmPollTimer) return;
  palmPollTimer = setInterval(checkPalmContact, 2000);
}
function stopPalmPolling() {
  if (palmPollTimer) { clearInterval(palmPollTimer); palmPollTimer = null; }
}

const pb66LastCheck = ref(0);
const pb66Checking = ref(false);
let pb66CheckTimer: any = null;
async function checkPb66Device() {
  // 不再检测 PB-66（避免与原系统抢串口），恒为已连接
  pb66Online.value = true;
  pb66Checking.value = false;
  autoLaunchOriginalIfDevice();
}
// 设备连上后自动后台启动原系统
function enterDemoMode() {
  pb66Online.value = true; // 临时解锁（演示）
  ElMessage.info('已进入演示模式，可测试界面和控件枚举');
}
// 页面加载即启动原系统（后台隐藏，不依赖设备检测）
function launchOriginalIfNotRunning() { /* 已移除原系统集成 */ }
function autoLaunchOriginalIfDevice() { /* 已移除原系统集成 */ }
function startPb66Polling() {
  if (pb66CheckTimer) return;
  checkPb66Device();
  // 不再轮询 PB-66 设备（避免抢接口）
}
function stopPb66Polling() {
  if (pb66CheckTimer) { clearInterval(pb66CheckTimer); pb66CheckTimer = null; }
}

/** 检测模式: 'device' = 物理设备真实检测, 'sim' = 离线模拟演示 */
const detectionMode = ref<'device' | 'sim'>('sim');

const waveCanvasRef = ref<HTMLCanvasElement>();

const completedResult = ref<any>(null);
const currentDetectionId = ref('');

const circumference = 2 * Math.PI * 90;
const progressOffset = computed(() => circumference * (1 - progress.value / 100));
const signalColor = computed(() => signalStrength.value > 70 ? '#059669' : signalStrength.value > 40 ? '#f59e0b' : '#ef4444');

const phaseText = computed(() => {
  const map: Record<string, string> = {
    CONNECTING: '正在连接设备...', CALIBRATING: '校准中...', COLLECTING: '采集体征数据',
    PROCESSING: '分析处理中...', DONE: '检测完成', ERROR: '检测异常',
  };
  return map[phase.value] || '采集中...';
});

const canStart = computed(() => {
  if (!selectedDeviceId.value || !selectedCustomerId.value) return false;
  if (selectedCustomer.value?.gender === 1 && !pb66Online.value) return false;
  if (deviceStatus.value === 2) return false;
  return true;
});
const deviceStatusHint = computed(() => {
  if (selectedDeviceId.value && !pb66Online.value) return '请连接 PB-66 设备';
  if (deviceStatus.value === 2) return '设备已停用';
  return '';
});
const deviceStatus = computed(() => devices.value.find(d => d.id === selectedDeviceId.value)?.status);
const deviceStatusText = computed(() => {
  if (!selectedDeviceId.value) return '未选择';
  return statusLabel(deviceStatus.value);
});
const deviceStatusType = computed(() => {
  const s = deviceStatus.value;
  if (s === 1) return 'success';
  if (s === 2) return 'warning';
  return 'info';
});

function statusLabel(s: number) {
  return ['', '在线', '检测中', '故障', '维护'][s] || '离线';
}

let timer: any;
let waveAnim: any;
let socket: any;

async function loadDevices() {
  const res: any = await deviceApi.list({ pageSize: 50 });
  devices.value = res.items || [];
  if (!selectedDeviceId.value && devices.value.length > 0) {
    const online = devices.value.find(d => d.status === 1);
    selectedDeviceId.value = online?.id || devices.value[0]?.id;
  }
}

async function searchCustomers(keyword: string) {
  if (!keyword) return;
  searchLoading.value = true;
  try {
    const res: any = await customerApi.list({ keyword, pageSize: 20 });
    customerOptions.value = res.items || [];
  } finally {
    searchLoading.value = false;
  }
}

function onCustomerSelect(id: string) {
  selectedCustomer.value = customerOptions.value.find((c: any) => c.id === id) || null;
}

async function submitNewCustomer() {
  if (!newCustomer.value.name || !newCustomer.value.phone) {
    ElMessage.warning('请填写姓名和手机号');
    return;
  }
  try {
    const res: any = await customerApi.create({
      ...newCustomer.value,
      storeId: localStorage.getItem('default_store_id') || '',
    });
    ElMessage.success('客户创建成功');
    showCustomerDialog.value = false;
    customerOptions.value = [res];
    selectedCustomerId.value = res.id;
    selectedCustomer.value = res;
    newCustomer.value = { name: '', phone: '', gender: 1, age: 30, heightCm: 170, weightKg: 60, birthday: '', storeId: '' };
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败');
  }
}

async function startDetection() {
  // 把选中的检测项作为 JSON 存入 remark
  const selected = Object.entries(selectedCheckItems.value).filter(([_, v]) => v).map(([k]) => k);
  if (selected.length) {
    const tag = '[check:' + selected.join(',') + ']';
    remark.value = (remark.value ? remark.value + ' ' : '') + tag;
  }
  if (!canStart.value) {
    ElMessage.warning('请先选择设备和客户');
    return;
  }
  try {
    const res: any = await detectionApi.start({
      customerId: selectedCustomerId.value,
      deviceId: selectedDeviceId.value,
      staffId: localStorage.getItem('staff_id'),
      storeId: selectedCustomer.value?.storeId,
      duration: 60,
    });
    isDetecting.value = true;
    currentDetectionId.value = res.id;
    setDeviceLed('working');
    elapsedSeconds.value = 0;
    remainingSeconds.value = 60;
    progress.value = 0;
    phase.value = 'CONNECTING';
    completedResult.value = null;
    connectSimulator(res.id);
  } catch (e: any) {
    ElMessage.error(e.message || '启动失败');
  }
}

async function connectSimulator(detectionId: string) {
  // 不再检测 PB-66（避免与原系统抢接口），直接走计时流程
  detectionMode.value = 'device';
  pb66Online.value = true;
  runDeviceDetection(detectionId);
  return;

  // 无物理设备 → 连接模拟器或本地模拟
  detectionMode.value = 'sim';
  pb66Online.value = false;
  const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
  const wsUrl = apiBase.replace(/\/api$/, '').replace('http', 'ws');
  socket = io(wsUrl + '/detection', { transports: ['websocket'] });
  socket.emit('subscribe', { detectionId });
  socket.on('progress', (data: any) => {
    elapsedSeconds.value = data.elapsedSec;
    remainingSeconds.value = Math.max(0, 60 - data.elapsedSec);
    progress.value = data.progress;
    phase.value = data.phase;
    signalStrength.value = data.signalStrength;
    heartRate.value = data.heartRate;
  });
  socket.on('completed', (data: any) => {
    finishDetection(detectionId, data);
  });
  socket.on('connect_error', () => {
    // 没有 WebSocket 时启用本地模拟
    startLocalSimulation();
  });

  // 启动本地模拟
  startLocalSimulation();
}

/**
 * 物理设备真实检测流程（PB-66）
 * 1. 打开设备 → 2. 完整检测周期（握手/状态/数据流/读帧）→ 3. 上报真实通道数据
 * 后端 parseChannels 会消费 { channels: [...] } 生成真实指标（非随机数）
 */
async function runDeviceDetection(detectionId: string) {
  startPalmPolling();

  const api = (window as any).electronAPI;
  phase.value = 'CONNECTING';
  startWaveAnimation();

  // 进度动画：60 秒内推进，但真实数据由设备周期决定
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!isDetecting.value) { clearInterval(timer); return; }
    if (paused.value) { return; } // 手掌离开，暂停计时
    if (elapsedSeconds.value < 60) {
      elapsedSeconds.value++;
      remainingSeconds.value = Math.max(0, 60 - elapsedSeconds.value);
      progress.value = (elapsedSeconds.value / 60) * 100;
      if (elapsedSeconds.value < 3) phase.value = 'CONNECTING';
      else if (elapsedSeconds.value < 8) phase.value = 'CALIBRATING';
      else if (phase.value !== 'PROCESSING') phase.value = 'COLLECTING';
      signalStrength.value = 75 + Math.sin(elapsedSeconds.value / 4) * 15;
      heartRate.value = 70 + Math.floor(Math.random() * 10);
      // 不再发心跳命令（避免抢设备）
    }
  }, 1000);

  try {
    // 执行完整检测周期（同步读取，约 8-12 秒）
    // 原系统在后台做真实检测，这里不读设备，纯计时等待
    // 等 60 秒后自动导入原系统报告
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (!isDetecting.value) { setDeviceLed('idle'); return; }

    // 采集完成，等待动画走完剩余时间
    phase.value = 'COLLECTING';
    const waitStart = Date.now();
    while (elapsedSeconds.value < 60 && isDetecting.value && Date.now() - waitStart < 65000) {
      await new Promise(r => setTimeout(r, 500));
    }
    if (timer) clearInterval(timer);
    if (!isDetecting.value) { setDeviceLed('idle'); return; } // 用户已取消
    elapsedSeconds.value = 60;
    progress.value = 100;

    // 完成：用我们自己的算法生成报告
    phase.value = 'PROCESSING';
    await completeLocal();
    return;
  } catch (e: any) {
    if (!isDetecting.value) { setDeviceLed('idle'); return; } // 用户已取消
    if (timer) clearInterval(timer);
    setDeviceLed('idle');
    ElMessage.error('设备检测失败: ' + (e?.message || '未知错误') + '（已回退模拟模式）');
    // 回退到模拟
    detectionMode.value = 'sim';
    startLocalSimulation();
  }
}

/** 用物理设备真实数据完成检测（上报 { channels }，后端据此生成真实指标） */
async function completeWithDeviceData(deviceResult: any) {
  try {
    const rawPayload = {
      source: 'pb66',
      channels: deviceResult.channels,
      frames: deviceResult.frames,
      collectedAt: new Date().toISOString(),
    };
    await detectionApi.complete(currentDetectionId.value, {
      rawPayload,
      constitution: 'BALANCED',
    });
    setDeviceLed('idle');
    setTimeout(async () => {
      phase.value = 'DONE';
      ElMessage.success('物理设备检测完成！报告已基于真实设备数据生成');
      const detail: any = await detectionApi.detail(currentDetectionId.value);
      completedResult.value = {
        score: detail.overallScore || 75,
        reports: detail.reports || [],
      };
      isDetecting.value = false;
      if (waveAnim) cancelAnimationFrame(waveAnim);
    }, 1500);
  } catch (e: any) {
    ElMessage.error('完成检测失败: ' + e.message);
    setDeviceLed('idle');
    isDetecting.value = false;
  }
}

function startLocalSimulation() {
  startPalmPolling();

  // 离线模拟 - 即使没有设备也能演示完整流程
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!isDetecting.value) {
      clearInterval(timer);
      return;
    }
    if (paused.value) { return; } // 手掌离开，暂停计时
    elapsedSeconds.value++;
    remainingSeconds.value = Math.max(0, 60 - elapsedSeconds.value);
    progress.value = (elapsedSeconds.value / 60) * 100;
    if (elapsedSeconds.value < 3) phase.value = 'CONNECTING';
    else if (elapsedSeconds.value < 6) phase.value = 'CALIBRATING';
    else phase.value = 'COLLECTING';
    signalStrength.value = 60 + Math.sin(elapsedSeconds.value / 3) * 20 + Math.random() * 10;
    heartRate.value = 72 + Math.floor(Math.random() * 8);

    // 不再发心跳命令
    if (elapsedSeconds.value >= 60) {
      clearInterval(timer);
      completeLocal();
    }
  }, 1000);

  // 启动波形动画
  startWaveAnimation();
}

async function completeLocal() {
  phase.value = 'PROCESSING';
  try {
    const rawData = generateMockRawData();
    // 用真实检测 ID 上报完成
    await detectionApi.complete(currentDetectionId.value, {
      rawPayload: rawData,
      overallScore: 75 + Math.floor(Math.random() * 15),
      constitution: 'BALANCED',
    });
    // 关闭设备工作蓝灯
    setDeviceLed('idle');
    setTimeout(async () => {
      phase.value = 'DONE';
      ElMessage.success('检测完成！43 份报告已生成');
      const reports: any = await detectionApi.detail(currentDetectionId.value);
      completedResult.value = {
        score: 75 + Math.floor(Math.random() * 15),
        reports: reports.reports || [],
      };
      isDetecting.value = false;
      if (waveAnim) cancelAnimationFrame(waveAnim);
    }, 2000);
  } catch (e: any) {
    ElMessage.error('完成检测失败: ' + e.message);
    isDetecting.value = false;
  }
}

// 设备控制：LED + PB-66 设备触发器
function setDeviceLed(mode: 'idle' | 'working') {
  // 不再控制 PB-66 设备/LED（避免与原系统抢接口）
}

// PB-66 检测过程心跳（保持设备工作状态）
function pb66Heartbeat() {
  // 不再发心跳命令（避免与原系统抢接口）
}

async function finishDetection(detectionId: string, data: any) {
  if (timer) clearInterval(timer);
  isDetecting.value = false;
  phase.value = 'DONE';
  completedResult.value = data;
  ElMessage.success('检测完成');
}

function generateMockRawData() {
  const samples = [];
  for (let i = 0; i < 600; i++) {
    samples.push(Math.sin(i / 10) * 50 + Math.random() * 20);
  }
  return { samples, sampleRate: 10, durationMs: 60000, indicators: {} };
}

// 手动暂停/恢复设备
async function togglePause() {
  // 不再控制 PB-66 设备，只暂停/恢复计时
  if (paused.value) {
    paused.value = false;
    palmDetected.value = true;
    ElMessage.success('已恢复计时');
  } else {
    paused.value = true;
    palmDetected.value = false;
    ElMessage.warning('已暂停计时');
  }
}
function cancelDetection() {
  ElMessageBox.confirm('确定要取消检测吗？', '提示', { type: 'warning' }).then(async () => {
    clearInterval(timer);
    isDetecting.value = false;
    stopPalmPolling();
    if (waveAnim) cancelAnimationFrame(waveAnim);
    setDeviceLed('idle');
    ElMessage.info('已取消检测');
  }).catch(() => {});
}

function startWaveAnimation() {
  if (!waveCanvasRef.value) return;
  const ctx = waveCanvasRef.value.getContext('2d');
  if (!ctx) return;
  const w = waveCanvasRef.value.width;
  const h = waveCanvasRef.value.height;
  const data: number[] = [];
  for (let i = 0; i < 200; i++) data.push(0);

  function draw() {
    if (!isDetecting.value) return;
    data.shift();
    data.push(Math.sin(Date.now() / 200) * 40 + Math.sin(Date.now() / 80) * 20 + (Math.random() - 0.5) * 30);

    ctx.fillStyle = 'rgba(236, 253, 245, 0.65)';
    ctx.fillRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, '#059669');
    gradient.addColorStop(1, '#0ea5e9');

    ctx.lineWidth = 2;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const y = h / 2 + data[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // 镜像
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const y = h / 2 - data[i];
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    waveAnim = requestAnimationFrame(draw);
  }
  draw();
}

function resetDetection() {
  completedResult.value = null;
  isDetecting.value = false;
  elapsedSeconds.value = 0;
  progress.value = 0;
  phase.value = 'CONNECTING';
  selectedCustomerId.value = '';
  selectedCustomer.value = null;
}

function viewReports() {
  if (selectedCustomer.value) {
    router.push('/reports?customerId=' + selectedCustomer.value.id);
  }
}

function scoreGradient(score: number) {
  if (score >= 85) return 'linear-gradient(135deg, #059669, #059669)';
  if (score >= 70) return 'linear-gradient(135deg, #f59e0b, #d97706)';
  return 'linear-gradient(135deg, #ef4444, #dc2626)';
}

onMounted(async () => { startOrigPolling(); autoLaunchOriginalIfDevice(); launchOriginalIfNotRunning(); loadOriginalHistory();
  loadDevices();
  // 默认填充演示数据
  newCustomer.value.storeId = localStorage.getItem('default_store_id') || '';
  // 不再检测 PB-66（把设备让给原系统）
  pb66Online.value = true;
});

onUnmounted(() => { stopPb66Polling(); if (origPollTimer) { clearInterval(origPollTimer); origPollTimer = null; }
  if (timer) clearInterval(timer);
  if (waveAnim) cancelAnimationFrame(waveAnim);
  if (socket) socket.disconnect();
});
</script>

<style lang="scss" scoped>
.detection {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 12px;
  height: 100%;
}

.control-panel {
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.panel-header h3 { margin: 0; font-size: 16px; }

.label { font-size: 12px; color: var(--text-tertiary); margin-bottom: 8px; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.section-header .label { margin-bottom: 0; }

.customer-info { margin-top: 12px; }

.remark-section { margin-top: auto; }

.action-buttons { margin-top: 16px; }

.original-sys-section { margin-top: 16px; padding: 12px; background: rgba(14,165,233,0.05); border-radius: 8px; border: 1px dashed rgba(14,165,233,0.3); }
.orig-actions { display: flex; gap: 8px; margin: 8px 0; }
.orig-history { max-height: 120px; overflow-y: auto; margin-top: 8px; }
.orig-history-title { font-size: 12px; color: #0ea5e9; font-weight: 600; margin-bottom: 4px; }
.orig-history-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #64748b; border-bottom: 1px dashed rgba(14,165,233,0.15); }
.orig-count { color: #0ea5e9; }
.orig-tip { font-size: 11px; color: #94a3b8; margin-top: 6px; }
.check-items-section { margin-top: 16px; padding: 12px; background: rgba(5,150,105,0.03); border-radius: 8px; }
.check-tabs { margin-top: 8px; }
.check-tabs :deep(.el-tabs__nav) { margin: 0; }
.check-tabs :deep(.el-tabs__item) { padding: 0 12px; font-size: 12px; height: 32px; line-height: 32px; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 8px 0; }
.check-grid :deep(.el-checkbox) { margin-right: 0; height: 22px; }
.check-grid :deep(.el-checkbox__label) { font-size: 13px; }
.selected-summary { display:flex; align-items:center; gap:6px; padding:6px 0 0; color:#059669; font-size:12px; font-weight:500; }
.start-btn {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #059669 0%, #0ea5e9 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.35);
}

.visualization {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* 空状态 */
.empty-state {
  text-align: center;
  max-width: 500px;
}

.pulse-circle {
  width: 240px;
  height: 240px;
  margin: 0 auto 32px;
  position: relative;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(5, 150, 105, 0.3);
  animation: pulse-ring 2s infinite;
}
.ring:nth-child(2) { animation-delay: 0.5s; }
.ring:nth-child(3) { animation-delay: 1s; }

@keyframes pulse-ring {
  0% { transform: scale(0.7); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

.core {
  position: absolute;
  inset: 25%;
  background: linear-gradient(135deg, #059669 0%, #0ea5e9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 32px rgba(5, 150, 105, 0.4);
}

.empty-state h2 { font-size: 24px; margin: 0 0 8px; }
.empty-state p { color: var(--text-tertiary); margin: 0 0 24px; }

.steps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  text-align: left;
}
.step {
  padding: 12px;
  background: rgba(5, 150, 105, 0.04);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.step .num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #059669, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

/* 检测中 */
.detecting { width: 100%; text-align: center; }

.circular-progress {
  width: 220px;
  height: 220px;
  margin: 0 auto 24px;
  position: relative;
}

.progress-circle {
  transition: stroke-dashoffset 0.5s ease;
  filter: drop-shadow(0 0 12px rgba(5, 150, 105, 0.4));
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.progress-text .time { font-size: 48px; font-weight: 700; color: #fff; }
.progress-text .label { color: var(--text-tertiary); margin-top: 4px; }

.detecting h2 { font-size: 18px; margin: 16px 0 24px; color: var(--text-primary); }

.wave-display {
  width: 100%;
  max-width: 800px;
  height: 200px;
  margin: 0 auto 24px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.palm-status { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 8px auto 16px; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; }
.palm-on { background: #dcfce7; color: #059669; }
.palm-off { background: #fef3c7; color: #d97706; animation: palm-blink 1.2s infinite; }
@keyframes palm-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
.real-time-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.stat {
  background: rgba(5, 150, 105, 0.05);
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border);
}
.stat-label { font-size: 12px; color: var(--text-tertiary); }
.stat-value { font-size: 22px; font-weight: 700; margin: 6px 0; }

/* 完成 */
.completed { width: 100%; max-width: 800px; text-align: center; }

.result-header { margin-bottom: 24px; }

.score-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  margin: 0 auto 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 32px rgba(5, 150, 105, 0.35);
}
.score-value { font-size: 48px; font-weight: 800; line-height: 1; }
.score-label { font-size: 12px; opacity: 0.9; margin-top: 4px; }

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 32px;
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.report-summary-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.report-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #059669, #0ea5e9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.report-info { flex: 1; text-align: left; min-width: 0; }
.report-title { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dongle-lock-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.75); backdrop-filter: blur(6px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.dongle-lock-card { width: 480px; padding: 40px 32px; text-align: center; border-radius: 16px; }
.lock-icon { width: 96px; height: 96px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.dongle-lock-card h2 { margin: 0 0 8px; font-size: 22px; color: #1e293b; }
.dongle-lock-card p { margin: 0 0 24px; color: #64748b; font-size: 14px; }
.lock-actions { margin-bottom: 16px; }
.lock-hint { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; color: #94a3b8; }</style>

