<template>
  <div class="dashboard">
    <!-- 欢迎条 -->
    <div class="welcome-bar fade-in">
      <div>
        <h1 class="title-text">你好，{{ authStore.user?.name }} 👋</h1>
        <p class="text-secondary">{{ greeting }} · {{ today }}</p>
      </div>
      <el-button type="primary" size="large" @click="$router.push('/detection')">
        <el-icon><Aim /></el-icon>
        开始检测
      </el-button>
    </div>

    <!-- 核心指标 -->
    <div class="metrics-grid fade-in">
      <div v-for="m in metrics" :key="m.key" class="metric-card glass-card">
        <div class="metric-icon" :style="{ background: m.bg }">
          <el-icon :size="24"><component :is="m.icon" /></el-icon>
        </div>
        <div class="metric-content">
          <div class="metric-label">{{ m.label }}</div>
          <div class="metric-value">{{ m.value }}</div>
          <div class="metric-trend" :class="m.trend > 0 ? 'up' : m.trend < 0 ? 'down' : 'flat'">
            <el-icon><CaretTop v-if="m.trend > 0" /><CaretBottom v-else-if="m.trend < 0" /><Minus v-else /></el-icon>
            <span>{{ Math.abs(m.trend) }}% 较昨日</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="charts-grid">
      <div class="chart-card glass-card">
        <div class="chart-header">
          <h3>近 7 天趋势</h3>
          <el-radio-group v-model="trendType" size="small">
            <el-radio-button value="detections">检测</el-radio-button>
            <el-radio-button value="orders">订单</el-radio-button>
            <el-radio-button value="revenue">营收</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="trendChartRef" style="width: 100%; height: 280px"></div>
      </div>

      <div class="chart-card glass-card">
        <div class="chart-header">
          <h3>体质分布</h3>
          <el-button text size="small">详情</el-button>
        </div>
        <div ref="constitutionChartRef" style="width: 100%; height: 280px"></div>
      </div>
    </div>

    <!-- 快捷入口 + 热门报告 -->
    <div class="bottom-grid">
      <div class="quick-actions glass-card">
        <h3>快捷入口</h3>
        <div class="actions-grid">
          <div v-for="a in quickActions" :key="a.path" class="action-item" @click="$router.push(a.path)">
            <div class="action-icon" :style="{ background: a.color }">
              <el-icon :size="20"><component :is="a.icon" /></el-icon>
            </div>
            <span>{{ a.title }}</span>
          </div>
        </div>
      </div>

      <div class="hot-reports glass-card">
        <div class="chart-header">
          <h3>热门报告 Top 10</h3>
        </div>
        <div class="report-list">
          <div v-for="(r, i) in hotReports" :key="r.templateCode" class="report-item">
            <span class="rank" :class="getRankClass(i)">{{ i + 1 }}</span>
            <span class="report-name">{{ reportNames[r.templateCode] || r.templateCode }}</span>
            <span class="report-count">{{ r._count }} 次</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useAuthStore } from '@/stores/auth';
import { dashboardApi } from '@/api';

echarts.use([LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const authStore = useAuthStore();
const trendType = ref('detections');
const trendChartRef = ref<HTMLDivElement>();
const constitutionChartRef = ref<HTMLDivElement>();

const overview = ref<any>({});
const trend = ref<any[]>([]);
const constitution = ref<any[]>([]);
const hotReports = ref<any[]>([]);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
});

const today = computed(() => new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));

const metrics = computed(() => [
  { key: 'customers', label: '客户总数', value: overview.value?.total?.customers || 0, icon: 'User', bg: 'linear-gradient(135deg, #059669, #0ea5e9)', trend: 12 },
  { key: 'detections', label: '检测总数', value: overview.value?.total?.detections || 0, icon: 'Aim', bg: 'linear-gradient(135deg, #059669, #059669)', trend: 8 },
  { key: 'orders', label: '今日订单', value: overview.value?.today?.orders || 0, icon: 'List', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', trend: -3 },
  { key: 'revenue', label: '本月营收', value: '¥' + (overview.value?.month?.revenue || 0), icon: 'Money', bg: 'linear-gradient(135deg, #ec4899, #be185d)', trend: 15 },
]);

const quickActions = [
  { title: '新建检测', path: '/detection', icon: 'Aim', color: 'linear-gradient(135deg, #059669, #0ea5e9)' },
  { title: '客户建档', path: '/customers', icon: 'UserFilled', color: 'linear-gradient(135deg, #059669, #059669)' },
  { title: '订单管理', path: '/orders', icon: 'List', color: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { title: '套餐配置', path: '/packages', icon: 'Goods', color: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { title: '设备管理', path: '/devices', icon: 'Cpu', color: 'linear-gradient(135deg, #ec4899, #be185d)' },
  { title: '营销中心', path: '/marketing', icon: 'TrendCharts', color: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
];

const reportNames: Record<string, string> = {
  comprehensive: '综合报告', cardiovascular: '心脑血管', immune_system: '免疫系统',
  gi_function: '胃肠功能', trace_elements: '微量元素', vitamins: '维生素',
  body_composition: '人体成分', bone_density: '骨骼密度', expert_analysis: '专家分析',
  basic_constitution: '基本体质', endocrine: '内分泌', prostate: '前列腺',
  menstrual: '月经周期', eye: '眼部', lung_function: '肺功能',
};

function getRankClass(i: number) {
  if (i === 0) return 'gold';
  if (i === 1) return 'silver';
  if (i === 2) return 'bronze';
  return '';
}

let trendChart: any;
let constitutionChart: any;

async function loadData() {
  try {
    const [ov, tr, con, hot] = await Promise.all([
      dashboardApi.overview(),
      dashboardApi.trend(7),
      dashboardApi.constitution(),
      dashboardApi.hotReports(10),
    ]);
    overview.value = ov;
    trend.value = tr;
    constitution.value = con;
    hotReports.value = hot;
    await nextTick();
    renderCharts();
  } catch (e) {
    console.error('加载看板失败', e);
  }
}

function renderCharts() {
  if (trendChartRef.value) {
    trendChart = trendChart || echarts.init(trendChartRef.value);
    const data = trend.value;
    trendChart.setOption({
      backgroundColor: 'transparent',
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#64748b', textStyle: { color: '#334155' } },
      xAxis: { type: 'category', data: data.map(d => d.date.substring(5)), axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#64748b' } },
      yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(16,185,129,0.06)' } }, axisLabel: { color: '#64748b' } },
      series: [{
        name: trendType.value,
        type: 'line',
        smooth: true,
        data: data.map(d => d[trendType.value]),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#059669' },
        lineStyle: { width: 3, color: '#059669' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16,185,129,0.35)' },
            { offset: 1, color: 'rgba(16,185,129,0)' },
          ]),
        },
      }],
    });
  }

  if (constitutionChartRef.value) {
    constitutionChart = constitutionChart || echarts.init(constitutionChartRef.value);
    const data = constitution.value.length > 0 ? constitution.value : [
      { name: '平和', value: 28 }, { name: '气虚', value: 18 }, { name: '阳虚', value: 15 },
      { name: '阴虚', value: 12 }, { name: '痰湿', value: 10 }, { name: '湿热', value: 8 },
      { name: '血瘀', value: 5 }, { name: '气郁', value: 4 },
    ];
    constitutionChart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#64748b', textStyle: { color: '#334155' } },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#64748b', fontSize: 12 } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 8, borderColor: '#ffffff', borderWidth: 2 },
        label: { show: false }, emphasis: { label: { show: true, fontSize: 16, fontWeight: 600, color: '#fff' } },
        data: data.map(d => ({ name: constitutionLabel(d.name), value: d.value })),
        color: ['#059669', '#34d399', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#84cc16'],
      }],
    });
  }
}

function constitutionLabel(code: string): string {
  const map: Record<string, string> = {
    BALANCED: '平和', QI_DEFICIENCY: '气虚', YANG_DEFICIENCY: '阳虚', YIN_DEFICIENCY: '阴虚',
    PHLEGM_DAMPNESS: '痰湿', DAMPNESS_HEAT: '湿热', BLOOD_STASIS: '血瘀', QI_STAGNATION: '气郁', SPECIAL: '特禀',
  };
  return map[code] || code;
}

watch(trendType, renderCharts);

onMounted(() => {
  loadData();
  window.addEventListener('resize', resizeCharts);
});

function resizeCharts() {
  trendChart?.resize();
  constitutionChart?.resize();
}
</script>

<style lang="scss" scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.welcome-bar {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.12), rgba(118, 75, 162, 0.05));
  border: 1px solid rgba(5, 150, 105, 0.2);
  padding: 20px 28px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title-text { font-size: 22px; font-weight: 600; margin: 0 0 4px; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
}
.metric-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }

.metric-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.metric-label { color: var(--text-tertiary); font-size: 12px; }
.metric-value { font-size: 26px; font-weight: 700; margin: 4px 0; }
.metric-trend {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 2px;
}
.metric-trend.up { color: #059669; }
.metric-trend.down { color: #ef4444; }
.metric-trend.flat { color: var(--text-muted); }

.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
}

.chart-card { padding: 16px 20px; }
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.chart-header h3 { margin: 0; font-size: 15px; font-weight: 600; }

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-actions { padding: 20px; }
.quick-actions h3 { margin: 0 0 16px; font-size: 15px; }

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(5, 150, 105, 0.04);
  border: 1px solid var(--border-light);
}
.action-item:hover { background: rgba(5, 150, 105, 0.08); transform: translateY(-2px); border-color: var(--border-hover); }

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.report-list { max-height: 280px; overflow-y: auto; }
.report-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
}
.report-item:last-child { border: none; }

.rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-card-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.rank.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; }
.rank.silver { background: linear-gradient(135deg, #64748b, #64748b); color: white; }
.rank.bronze { background: linear-gradient(135deg, #d97706, #b45309); color: white; }

.report-name { flex: 1; color: var(--text-secondary); }
.report-count { color: var(--text-tertiary); font-size: 12px; }
</style>
