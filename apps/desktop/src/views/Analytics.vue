<template>
<div class="page">
<div class="page-header"><h2>运营报表</h2><p class="text-secondary text-sm">业务数据全景 · 收入分析 · 员工业绩</p></div>
<div class="kpi-grid">
<div class="kpi glass-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#059669,#0ea5e9)"><el-icon><User/></el-icon></div><div class="kpi-info"><div class="kpi-label">客户总数</div><div class="kpi-value">{{ dashboard?.total?.customers || 0 }}</div><div class="kpi-trend">本月新增</div></div></div>
<div class="kpi glass-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#059669,#059669)"><el-icon><Money/></el-icon></div><div class="kpi-info"><div class="kpi-label">累计营收</div><div class="kpi-value">¥{{ formatMoney(dashboard?.total?.revenue) }}</div><div class="kpi-trend">本月 ¥{{ formatMoney(dashboard?.month?.revenue) }}</div></div></div>
<div class="kpi glass-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><el-icon><Aim/></el-icon></div><div class="kpi-info"><div class="kpi-label">检测总数</div><div class="kpi-value">{{ dashboard?.total?.detections || 0 }}</div><div class="kpi-trend">今日 {{ dashboard?.today?.detections || 0 }} 次</div></div></div>
<div class="kpi glass-card"><div class="kpi-icon" style="background:linear-gradient(135deg,#ec4899,#be185d)"><el-icon><Calendar/></el-icon></div><div class="kpi-info"><div class="kpi-label">今日预约</div><div class="kpi-value">{{ dashboard?.appointments?.today || 0 }}</div><div class="kpi-trend">{{ dashboard?.tasks?.pending || 0 }} 待办</div></div></div>
</div>
<div class="charts-grid">
<div class="chart-card glass-card">
<div class="chart-header"><h3>营收趋势 (近 30 天)</h3></div>
<div ref="revenueChartRef" style="width:100%;height:300px"></div>
</div>
<div class="chart-card glass-card">
<div class="chart-header"><h3>项目销售排行</h3></div>
<div ref="projectChartRef" style="width:100%;height:300px"></div>
</div>
</div>
<div class="bottom-grid">
<div class="chart-card glass-card">
<div class="chart-header"><h3>员工业绩 (本月)</h3></div>
<el-table :data="staffPerformance" max-height="400">
<el-table-column label="排名" width="60"><template #default="{ $index }"><span class="rank" :class="rankClass($index)">{{ $index + 1 }}</span></template></el-table-column>
<el-table-column prop="staff.name" label="员工" min-width="100"/>
<el-table-column label="检测" width="80"><template #default="{row}">{{ row.detectionCount }}</template></el-table-column>
<el-table-column label="客户" width="80"><template #default="{row}">{{ row.customerCount }}</template></el-table-column>
<el-table-column label="订单" width="80"><template #default="{row}">{{ row.orderCount }}</template></el-table-column>
<el-table-column label="业绩" width="120"><template #default="{row}"><strong class="text-success">¥{{ formatMoney(row.revenue) }}</strong></template></el-table-column>
<el-table-column label="提成" width="100"><template #default="{row}"><span class="text-warning">¥{{ formatMoney(row.commission) }}</span></template></el-table-column>
</el-table>
</div>
<div class="chart-card glass-card">
<div class="chart-header"><h3>客户等级分布</h3></div>
<div ref="customerChartRef" style="width:100%;height:400px"></div>
</div>
</div>
</div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart, PieChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { User, Money, Aim, Calendar } from '@element-plus/icons-vue';
import { dashboardApi } from '@/api';

echarts.use([LineChart, PieChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const dashboard = ref<any>({});
const revenueChartRef = ref<HTMLDivElement>();
const projectChartRef = ref<HTMLDivElement>();
const customerChartRef = ref<HTMLDivElement>();
const staffPerformance = ref<any[]>([]);

let revenueChart: any, projectChart: any, customerChart: any;

function formatMoney(v: any) { return v ? Number(v).toLocaleString() : '0'; }
function rankClass(i: number) { return i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''; }

async function loadData() {
  try {
    const now = new Date();
    const month = now.toISOString().substring(0, 7);
    const [d, perf] = await Promise.all([
      dashboardApi.overview(),
      dashboardApi.staff(month).catch(() => []),
    ]);
    dashboard.value = d;
    staffPerformance.value = Array.isArray(perf) ? perf : [];
    setTimeout(renderCharts, 100);
  } catch (e) { console.error(e); }
}

function renderCharts() { renderRevenueChart(); renderProjectChart(); renderCustomerChart(); }

function renderRevenueChart() {
  if (!revenueChartRef.value) return;
  revenueChart = revenueChart || echarts.init(revenueChartRef.value);
  const dates: string[] = []; const data: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dates.push((d.getMonth() + 1) + '/' + d.getDate());
    data.push(Math.round(800 + Math.random() * 1200));
  }
  revenueChart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 40 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#64748b', textStyle: { color: '#334155' } },
    xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#64748b' } }, axisLabel: { color: '#64748b', fontSize: 10 } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: 'rgba(16,185,129,0.06)' } }, axisLabel: { color: '#64748b' } },
    series: [{ name: '营收', type: 'line', smooth: true, data, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#059669' }, lineStyle: { width: 3, color: '#059669' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.4)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) } }],
  });
}

function renderProjectChart() {
  if (!projectChartRef.value) return;
  projectChart = projectChart || echarts.init(projectChartRef.value);
  projectChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#64748b', textStyle: { color: '#334155' } },
    legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { color: '#64748b', fontSize: 12 } },
    series: [{ type: 'pie', radius: ['45%', '70%'], center: ['38%', '50%'], avoidLabelOverlap: false, itemStyle: { borderRadius: 8, borderColor: '#ffffff', borderWidth: 2 }, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, color: '#fff' } }, data: [{ name: '单次检测', value: 42 }, { name: '季度套餐', value: 28 }, { name: '年度管家', value: 18 }, { name: '亚健康调理', value: 24 }, { name: 'VIP定制', value: 8 }], color: ['#059669', '#059669', '#f59e0b', '#ec4899', '#06b6d4'] }],
  });
}

function renderCustomerChart() {
  if (!customerChartRef.value) return;
  customerChart = customerChart || echarts.init(customerChartRef.value);
  customerChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#64748b', textStyle: { color: '#334155' } },
    legend: { bottom: 0, textStyle: { color: '#64748b' } },
    series: [{ type: 'pie', radius: '60%', center: ['50%', '45%'], data: [{ name: '黑金', value: 12 }, { name: '钻石', value: 28 }, { name: '黄金', value: 56 }, { name: '白银', value: 89 }, { name: '青铜', value: 145 }], itemStyle: { borderRadius: 8, borderColor: '#ffffff', borderWidth: 2 }, label: { color: '#64748b', fontSize: 11 }, color: ['#1a1a2e', '#8b5cf6', '#fbbf24', '#64748b', '#cd7f32'] }],
  });
}

onMounted(() => { loadData(); window.addEventListener('resize', resizeCharts); });
onUnmounted(() => { window.removeEventListener('resize', resizeCharts); revenueChart?.dispose(); projectChart?.dispose(); customerChart?.dispose(); });
function resizeCharts() { revenueChart?.resize(); projectChart?.resize(); customerChart?.resize(); }
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%;overflow-y:auto}
.page-header{margin-bottom:16px}
.page-header h2{margin:0;font-size:18px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.kpi{display:flex;gap:16px;padding:20px}
.kpi-icon{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;color:white;flex-shrink:0;font-size:28px}
.kpi-info{flex:1}
.kpi-label{color:var(--text-tertiary);font-size:13px}
.kpi-value{font-size:28px;font-weight:700;margin:4px 0}
.kpi-trend{color:var(--text-tertiary);font-size:12px}
.text-success{color:#059669}
.text-warning{color:#f59e0b}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.chart-card{padding:16px}
.chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.chart-header h3{margin:0;font-size:15px;font-weight:600}
.bottom-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:12px}
.rank{display:inline-flex;width:28px;height:28px;border-radius:50%;background:rgba(16,185,129,0.06);align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--text-tertiary)}
.rank.gold{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:white}
.rank.silver{background:linear-gradient(135deg,#64748b,#64748b);color:white}
.rank.bronze{background:linear-gradient(135deg,#d97706,#b45309);color:white}
</style>
