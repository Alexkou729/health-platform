<template>
  <div class="dash-page">
    <div class="page-header">
      <div>
        <h2>店面工作台</h2>
        <p class="text-secondary text-sm">今天该做什么？一目了然</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="$router.push('/detection')"><el-icon><Aim /></el-icon> 开始检测</el-button>
        <el-button @click="$router.push('/customers')"><el-icon><User /></el-icon> 客户管理</el-button>
        <el-button :icon="Refresh" @click="load">刷新</el-button>
      </div>
    </div>

    <!-- KPI 看板 -->
    <div class="kpi-grid">
      <div class="kpi-card" :class="{ alert: data.kpi?.dueRechecks }">
        <div class="kpi-icon recheck"><el-icon><Calendar /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ data.kpi?.dueRechecks ?? 0 }}</div>
          <div class="kpi-label">今日复检到期</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon today"><el-icon><Aim /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ data.kpi?.todayTests ?? 0 }}</div>
          <div class="kpi-label">今日检测</div>
        </div>
      </div>
      <div class="kpi-card" :class="{ alert: data.kpi?.abnormalReports }">
        <div class="kpi-icon abnormal"><el-icon><Warning /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ data.kpi?.abnormalReports ?? 0 }}</div>
          <div class="kpi-label">异常报告(7天)</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon upcoming"><el-icon><Clock /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ data.kpi?.upcomingRechecks ?? 0 }}</div>
          <div class="kpi-label">7天内复检</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon customer"><el-icon><User /></el-icon></div>
        <div class="kpi-content">
          <div class="kpi-value">{{ data.kpi?.totalCustomers ?? 0 }}</div>
          <div class="kpi-label">客户总数</div>
        </div>
      </div>
    </div>

    <!-- 主体两列 -->
    <div class="main-grid">
      <!-- 左列：今日检测 -->
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Aim /></el-icon> 今日检测
            <el-tag size="small" type="info">{{ data.todayTests?.length || 0 }}</el-tag>
          </div>
        </template>
        <el-empty v-if="!data.todayTests?.length" description="今天还没有检测" :image-size="60" />
        <div v-else class="list">
          <div v-for="d in data.todayTests" :key="d.id" class="list-item" @click="goCustomer(d.customerId)">
            <div class="item-avatar">{{ (d.customerName||'?')[0] }}</div>
            <div class="item-main">
              <div class="item-name">{{ d.customerName }}</div>
              <div class="item-sub">{{ d.customerPhone }} · {{ formatTime(d.startedAt) }}</div>
            </div>
            <div v-if="d.overallScore" class="item-score" :style="{ color: scoreColor(d.overallScore) }">
              {{ d.overallScore }}<span class="score-suffix">分</span>
            </div>
            <el-icon class="item-arrow"><ArrowRight /></el-icon>
          </div>
        </div>
      </el-card>

      <!-- 右列：复检提醒 -->
      <el-card>
        <template #header>
          <div class="card-header">
            <el-icon><Calendar /></el-icon> 待复检客户（7天内）
            <el-tag size="small" type="warning" v-if="data.recheckList?.length">
              {{ data.recheckList.length }} 人
            </el-tag>
          </div>
        </template>
        <el-empty v-if="!data.recheckList?.length" description="本周无复检任务" :image-size="60" />
        <div v-else class="list">
          <div v-for="d in data.recheckList" :key="d.id" class="list-item recheck-item" @click="goCustomer(d.customerId)">
            <div class="item-avatar" :class="dueClass(d.nextCheckDate)">{{ (d.customerName||'?')[0] }}</div>
            <div class="item-main">
              <div class="item-name">{{ d.customerName }}</div>
              <div class="item-sub">
                上次 {{ formatDate(d.lastDetection) }} · 上次评分 <strong :style="{color:scoreColor(d.overallScore)}">{{ d.overallScore || '-' }}</strong>
              </div>
            </div>
            <div class="item-meta">
              <div :class="['due-tag', dueClass(d.nextCheckDate)]">
                {{ dueLabel(d.nextCheckDate) }}
              </div>
              <div class="item-sub" style="font-size:11px">{{ formatDate(d.nextCheckDate) }}</div>
            </div>
            <el-button size="small" type="primary" @click.stop="goRecheck(d)">复检</el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, User, Aim, Calendar, Clock, Warning, ArrowRight } from '@element-plus/icons-vue';
import axios from 'axios';

const router = useRouter();
const data = ref<any>({ kpi: {}, todayTests: [], recheckList: [] });
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    const apiBase = localStorage.getItem('api_base_url') || 'http://localhost:3000/api';
    const token = localStorage.getItem('access_token') || '';
    const res: any = await axios.get(`${apiBase}/dashboard/workbench`, { headers: { Authorization: `Bearer ${token}` } });
    data.value = res.data || { kpi: {}, todayTests: [], recheckList: [] };
  } catch (e: any) {
    ElMessage.error('加载工作台数据失败：' + (e?.message || e));
  } finally {
    loading.value = false;
  }
}

function scoreColor(s: number) { return s >= 85 ? '#059669' : s >= 70 ? '#f59e0b' : '#ef4444'; }

function formatTime(d: string) { return d ? new Date(d).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '-'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) : '-'; }

function dueClass(date: string) {
  if (!date) return '';
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'soon';
  return 'upcoming';
}

function dueLabel(date: string) {
  if (!date) return '';
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return '已逾期 ' + Math.abs(days) + ' 天';
  if (days === 0) return '今日到期';
  if (days === 1) return '明日到期';
  return days + ' 天后';
}

function goCustomer(id: string) { router.push({ path: '/customers', query: { id } }); }
function goRecheck(d: any) {
  router.push({ path: '/detection', query: { customerId: d.customerId, recheck: '1' } });
  ElMessage.success(`已为 ${d.customerName} 准备复检`);
}

onMounted(load);
</script>

<style lang="scss" scoped>
.dash-page { padding: 0; }
.kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 16px 0; }
.kpi-card {
  background: linear-gradient(135deg, #fff, #f9fafb);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  padding: 16px;
  display: flex; align-items: center; gap: 12px;
  transition: all 0.2s;
}
.kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.kpi-card.alert { background: linear-gradient(135deg, #fef3c7, #fde68a); border-color: #f59e0b; }
.kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #fff; flex-shrink: 0; }
.kpi-icon.recheck { background: linear-gradient(135deg, #f59e0b, #d97706); }
.kpi-icon.today { background: linear-gradient(135deg, #059669, #10b981); }
.kpi-icon.abnormal { background: linear-gradient(135deg, #ef4444, #dc2626); }
.kpi-icon.upcoming { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.kpi-icon.customer { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
.kpi-content { flex: 1; min-width: 0; }
.kpi-value { font-size: 28px; font-weight: 800; line-height: 1; color: #111827; }
.kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.list { display: flex; flex-direction: column; gap: 6px; max-height: 480px; overflow-y: auto; }
.list-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 8px;
  background: rgba(5, 150, 105, 0.03);
  border: 1px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.list-item:hover { background: rgba(5, 150, 105, 0.08); border-color: rgba(5, 150, 105, 0.2); }
.list-item.recheck-item { background: rgba(245, 158, 11, 0.05); }
.list-item.recheck-item:hover { background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
.item-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff; font-weight: 600; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.item-avatar.urgent { background: linear-gradient(135deg, #ef4444, #dc2626); }
.item-avatar.soon { background: linear-gradient(135deg, #f59e0b, #d97706); }
.item-avatar.overdue { background: linear-gradient(135deg, #991b1b, #7f1d1d); animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
.item-main { flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 600; }
.item-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
.item-score { font-size: 22px; font-weight: 800; }
.score-suffix { font-size: 11px; font-weight: 500; color: #6b7280; margin-left: 2px; }
.item-meta { text-align: right; }
.due-tag { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; display: inline-block; }
.due-tag.urgent { background: #fee2e2; color: #dc2626; }
.due-tag.soon { background: #fef3c7; color: #d97706; }
.due-tag.upcoming { background: #dbeafe; color: #2563eb; }
.due-tag.overdue { background: #991b1b; color: #fff; }
.item-arrow { color: #9ca3af; }
</style>
