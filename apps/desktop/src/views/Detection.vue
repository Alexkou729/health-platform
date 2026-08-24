<template>
  <div class="detection">
    <!-- 左：检测控制面板 -->
    <div class="control-panel glass-card">
      <div class="panel-header">
        <h3>检测控制台</h3>
        <el-tag :type="deviceStatusType" effect="dark">{{ deviceStatusText }}</el-tag>
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
        <el-button v-else type="danger" size="large" @click="cancelDetection">
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
  name: '', phone: '', gender: 1, age: 30, heightCm: 170, weightKg: 60, birthday: '',
});

const isDetecting = ref(false);
const elapsedSeconds = ref(0);
const remainingSeconds = ref(60);
const progress = ref(0);
const phase = ref('CONNECTING');
const signalStrength = ref(0);
const heartRate = ref(0);

const waveCanvasRef = ref<HTMLCanvasElement>();

const completedResult = ref<any>(null);

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

const canStart = computed(() => selectedDeviceId.value && selectedCustomerId.value);
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
    newCustomer.value = { name: '', phone: '', gender: 1, age: 30, heightCm: 170, weightKg: 60, birthday: '' };
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败');
  }
}

async function startDetection() {
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

function connectSimulator(detectionId: string) {
  // 连接设备模拟器（如果运行中）
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

function startLocalSimulation() {
  // 离线模拟 - 即使没有设备也能演示完整流程
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!isDetecting.value) {
      clearInterval(timer);
      return;
    }
    elapsedSeconds.value++;
    remainingSeconds.value = Math.max(0, 60 - elapsedSeconds.value);
    progress.value = (elapsedSeconds.value / 60) * 100;
    if (elapsedSeconds.value < 3) phase.value = 'CONNECTING';
    else if (elapsedSeconds.value < 6) phase.value = 'CALIBRATING';
    else phase.value = 'COLLECTING';
    signalStrength.value = 60 + Math.sin(elapsedSeconds.value / 3) * 20 + Math.random() * 10;
    heartRate.value = 72 + Math.floor(Math.random() * 8);

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
    // 上报完成数据
    const rawData = generateMockRawData();
    await detectionApi.complete('local', {
      rawPayload: rawData,
      overallScore: 75 + Math.floor(Math.random() * 15),
      constitution: 'BALANCED',
    });
    // 加载报告
    setTimeout(async () => {
      phase.value = 'DONE';
      ElMessage.success('检测完成！43 份报告已生成');
      // 查询最近报告
      const reports: any = await detectionApi.detail(localStorage.getItem('last_detection_id') || '');
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

function cancelDetection() {
  ElMessageBox.confirm('确定要取消检测吗？', '提示', { type: 'warning' }).then(async () => {
    clearInterval(timer);
    isDetecting.value = false;
    if (waveAnim) cancelAnimationFrame(waveAnim);
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

onMounted(() => {
  loadDevices();
  // 默认填充演示数据
  newCustomer.value.storeId = localStorage.getItem('default_store_id') || '';
});

onUnmounted(() => {
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
</style>
