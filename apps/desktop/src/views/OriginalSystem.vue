<template>
  <div class="os-page">
    <div class="page-header">
      <div>
        <h2>原系统检测（智能健康检测系统 V13）</h2>
        <p class="text-secondary text-sm">原封不动运行原系统检测能力，报告自动融合进我们的客户管理</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="large" @click="launchOriginal">
          <el-icon><Monitor /></el-icon> 启动原系统检测
        </el-button>
      </div>
    </div>

    <!-- 三卡片：启动 / 状态 / 导入 -->
    <div class="os-grid">
      <!-- 左：原系统启动 -->
      <el-card class="os-card">
        <template #header>
          <div class="card-header"><el-icon><Monitor /></el-icon> 原系统运行</div>
        </template>
        <div class="launch-area">
          <div class="launch-icon"><el-icon :size="48"><Cpu /></el-icon></div>
          <h3>Quantum Analyzer V13</h3>
          <p class="desc">点击启动，原系统在独立窗口运行，完成后报告自动同步</p>
          <el-button type="primary" size="large" style="width:100%" @click="launchOriginal" :loading="launching">
            <el-icon><Monitor /></el-icon> 启动检测程序
          </el-button>
          <div v-if="launchResult" class="launch-result">
            <el-tag v-if="launchResult.ok" type="success">已启动 PID {{ launchResult.pid }}</el-tag>
            <el-tag v-else type="danger">{{ launchResult.error }}</el-tag>
          </div>
        </div>
      </el-card>

      <!-- 中：接入状态 -->
      <el-card class="os-card">
        <template #header>
          <div class="card-header"><el-icon><Connection /></el-icon> 数据接入状态</div>
        </template>
        <div class="status-area">
          <div class="status-row">
            <span>监测目录</span>
            <strong :class="origStatus.dirExists ? 'ok' : 'no'">
              {{ origStatus.dirExists ? '已连接' : '未检测到' }}
            </strong>
          </div>
          <div class="status-row">
            <span>报告文件数</span>
            <strong>{{ origStatus.lastFiles ?? 0 }}</strong>
          </div>
          <div class="status-row">
            <span>自动同步</span>
            <strong :class="origStatus.polling ? 'ok' : ''">
              {{ origStatus.polling ? '运行中（8秒轮询）' : '已停止' }}
            </strong>
          </div>
          <div class="status-row">
            <span>上次扫描</span>
            <strong>{{ origStatus.lastScanTime ? formatTime(origStatus.lastScanTime) : '-' }}</strong>
          </div>
        </div>
      </el-card>

      <!-- 右：导入操作 -->
      <el-card class="os-card">
        <template #header>
          <div class="card-header"><el-icon><Download /></el-icon> 报告导入</div>
        </template>
        <div class="import-area">
          <el-button type="primary" :loading="origImporting" @click="importOriginal" style="width:100%">
            <el-icon><Download /></el-icon> 一键导入全部历史报告
          </el-button>
          <div class="import-result" v-if="importResult">
            <div class="result-line">扫描：{{ importResult.scanned }} 份</div>
            <div class="result-line ok">导入：{{ importResult.imported }} 份</div>
            <div class="result-line">跳过：{{ importResult.skipped }} 份</div>
            <div class="result-line danger" v-if="importResult.errors?.length">失败：{{ importResult.errors.length }} 份</div>
          </div>
          <div class="import-tip">原系统每测完一次，这里自动出现新报告，8 秒内同步到客户管理</div>
        </div>
      </el-card>
    </div>

    <!-- 导入历史 -->
    <el-card class="history-card">
      <template #header>
        <div class="card-header"><el-icon><Clock /></el-icon> 最近导入记录</div>
      </template>
      <el-table :data="origHistory" empty-text="暂无导入记录">
        <el-table-column label="时间" :formatter="(r:any) => formatTime(r.time)" width="180" />
        <el-table-column label="扫描" :formatter="(r:any) => r.result.scanned" width="80" />
        <el-table-column label="导入" :formatter="(r:any) => r.result.imported" width="80" />
        <el-table-column label="跳过" :formatter="(r:any) => r.result.skipped" width="80" />
        <el-table-column label="失败" :formatter="(r:any) => r.result.errors?.length || 0" width="80" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Monitor, Cpu, Connection, Download, Clock } from '@element-plus/icons-vue';
import axios from 'axios';

const launching = ref(false);
const launchResult = ref<any>(null);
const origStatus = ref<any>({ dirExists: false, lastFiles: 0, polling: false });
const origImporting = ref(false);
const importResult = ref<any>(null);
const origHistory = ref<any[]>([]);
let pollTimer: any = null;

async function launchOriginal() {
  launching.value = true;
  try {
    const api = (window as any).electronAPI;
    if (!api?.originalSystemLaunch) { ElMessage.warning('当前为浏览器模式，无法启动原系统'); return; }
    launchResult.value = await api.originalSystemLaunch();
    if (launchResult.value.ok) ElMessage.success('原系统已启动');
    else ElMessage.error('启动失败：' + launchResult.value.error);
  } catch (e: any) { ElMessage.error('启动失败：' + e?.message); }
  finally { launching.value = false; }
}

async function refreshStatus() {
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    const res = await axios.get(apiBase + '/original-system/status', { headers: { Authorization: 'Bearer ' + token } });
    origStatus.value = res.data || {};
  } catch { origStatus.value = { dirExists: false }; }
}

async function importOriginal() {
  if (origImporting.value) return;
  origImporting.value = true;
  importResult.value = null;
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    // 先本地扫描解析（Electron），再推送给云端入库
    const api = (window as any).electronAPI;
    const scan = api?.originalSystemScanLocal ? await api.originalSystemScanLocal() : { dirExists: false, reports: [] };
    if (!scan.dirExists) { ElMessage.warning('未检测到原系统 ReportC 目录'); return; }
    if (!scan.reports?.length) { ElMessage.info('没有可导入的报告'); return; }
    const res = await axios.post(apiBase + '/original-system/import', { reports: scan.reports }, { headers: { Authorization: 'Bearer ' + token } });
    importResult.value = res.data || {};
    ElMessage.success('导入完成：新增 ' + (importResult.value.imported || 0) + ' 份');
    await refreshStatus();
    await loadHistory();
  } catch (e: any) { ElMessage.error('导入失败：' + (e?.message || e)); }
  finally { origImporting.value = false; }
}

async function loadHistory() {
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    const res = await axios.get(apiBase + '/original-system/history', { headers: { Authorization: 'Bearer ' + token } });
    origHistory.value = res.data || [];
  } catch { origHistory.value = []; }
}

function formatTime(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

onMounted(() => {
  refreshStatus();
  loadHistory();
  pollTimer = setInterval(refreshStatus, 10000);
});
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer); });
</script>

<style lang="scss" scoped>
.os-page { padding: 0; }
.os-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 16px 0; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.launch-area { text-align: center; padding: 16px 0; }
.launch-icon { width: 96px; height: 96px; border-radius: 16px; background: linear-gradient(135deg, #059669, #0ea5e9); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.launch-area h3 { margin: 0 0 8px; font-size: 18px; }
.launch-area .desc { color: #64748b; font-size: 13px; margin: 0 0 20px; line-height: 1.6; }
.launch-result { margin-top: 12px; }
.status-area { padding: 8px 0; }
.status-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; }
.status-row strong { color: #1e293b; }
.status-row strong.ok { color: #059669; }
.status-row strong.no { color: #ef4444; }
.import-area { padding: 8px 0; }
.import-result { margin-top: 16px; padding: 12px; background: #f8fafc; border-radius: 8px; }
.result-line { font-size: 13px; padding: 3px 0; color: #64748b; }
.result-line.ok { color: #059669; font-weight: 600; }
.result-line.danger { color: #ef4444; }
.import-tip { margin-top: 12px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
.history-card { margin-top: 16px; }
</style>
