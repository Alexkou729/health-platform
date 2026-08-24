<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>历史对比</h2>
        <p class="text-secondary text-sm">同一客户历次检测报告的趋势与指标对比</p>
      </div>
      <div class="filters">
        <el-select v-model="customerId" filterable placeholder="选择客户" style="width:240px" @change="load">
          <el-option v-for="c in customers" :key="c.id" :label="c.name + ' · ' + c.phone" :value="c.id" />
        </el-select>
        <el-select v-model="templateCode" clearable placeholder="报告类型（可选）" style="width:180px" @change="load">
          <el-option v-for="t in templates" :key="t.code" :label="t.name" :value="t.code" />
        </el-select>
      </div>
    </div>

    <div v-if="!customerId" class="glass-card empty">
      <el-icon :size="48"><DataAnalysis /></el-icon>
      <p>请先选择一位客户，查看其历史报告对比</p>
    </div>

    <template v-else>
      <div class="glass-card" style="margin-bottom:16px">
        <div class="chart-header"><h3>综合评分趋势</h3></div>
        <div ref="trendRef" style="width:100%;height:280px"></div>
      </div>

      <div class="glass-card">
        <div class="chart-header"><h3>指标对比（按检测时间从早到晚）</h3></div>
        <el-table :data="indicatorRows" stripe max-height="480">
          <el-table-column prop="name" label="指标" width="140" fixed />
          <el-table-column v-for="r in reports" :key="r.id" :label="dateLabel(r.createdAt)" min-width="130">
            <template #default="{ row }">
              <span :class="cellClass(row, r)">{{ indicatorValue(row, r) }}</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!reports.length" class="text-muted" style="padding:24px;text-align:center">暂无历史报告</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import { DataAnalysis } from '@element-plus/icons-vue';
import { customerApi, reportApi } from '@/api';

const customers = ref<any[]>([]);
const customerId = ref('');
const templateCode = ref('');
const reports = ref<any[]>([]);
const trendRef = ref();
let chart: any = null;

const templates = [
  { code: 'comprehensive', name: '综合报告' }, { code: 'cardiovascular', name: '心脑血管' },
  { code: 'immune_system', name: '免疫系统' }, { code: 'trace_elements', name: '微量元素' },
  { code: 'vitamins', name: '维生素' }, { code: 'body_composition', name: '人体成分' },
  { code: 'expert_analysis', name: '专家分析' }, { code: 'basic_constitution', name: '基本体质' },
];

const indicatorRows = computed(() => {
  const map = new Map<string, any>();
  for (const r of reports.value) {
    const inds = Array.isArray(r.indicators) ? r.indicators : [];
    for (const ind of inds) {
      if (!map.has(ind.name)) map.set(ind.name, { name: ind.name, unit: ind.unit || '' });
    }
  }
  return Array.from(map.values());
});

async function loadCustomers() {
  try {
    const res: any = await customerApi.list({ page: 1, pageSize: 200 });
    customers.value = res.items || [];
  } catch (e) {}
}

async function load() {
  if (!customerId.value) { reports.value = []; renderTrend(); return; }
  try {
    const res: any = await reportApi.comparison(customerId.value, templateCode.value);
    reports.value = (Array.isArray(res) ? res : []);
    await nextTick();
    renderTrend();
  } catch (e: any) { ElMessage.error(e.message); reports.value = []; }
}

function renderTrend() {
  if (!trendRef.value) return;
  chart = chart || echarts.init(trendRef.value);
  const data = reports.value.map(r => ({ date: dateLabel(r.createdAt), score: r.score || 0 }));
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 50, right: 30, top: 40, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map(d => d.date), axisLabel: { color: '#64748b', rotate: 20 } },
    yAxis: { type: 'value', min: 0, max: 100, splitLine: { lineStyle: { color: 'rgba(16,185,129,0.1)' } }, axisLabel: { color: '#64748b' } },
    series: [{
      type: 'line', smooth: true, data: data.map(d => d.score),
      symbolSize: 10, itemStyle: { color: '#059669' }, lineStyle: { width: 3, color: '#059669' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(16,185,129,0.35)' }, { offset: 1, color: 'rgba(16,185,129,0)' }]) },
    }],
  });
}

function indicatorValue(row: any, report: any) {
  const inds = Array.isArray(report.indicators) ? report.indicators : [];
  const found = inds.find((i: any) => i.name === row.name);
  return found ? (found.value + ' ' + (found.unit || '')) : '-';
}
function cellClass(row: any, report: any) {
  const inds = Array.isArray(report.indicators) ? report.indicators : [];
  const found = inds.find((i: any) => i.name === row.name);
  if (!found) return 'text-muted';
  const s = Number(found.status);
  return s === 0 ? 'ok' : s >= 3 ? 'bad' : 'warn';
}
function dateLabel(d: string) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }

onMounted(() => { loadCustomers(); });
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; font-size: 18px; }
.filters { display: flex; gap: 8px; }
.chart-header { margin-bottom: 8px; }
.chart-header h3 { margin: 0; font-size: 15px; }
.empty { text-align: center; padding: 60px 20px; color: var(--text-tertiary); }
.empty p { margin: 12px 0 0; }
.ok { color: #059669; }
.warn { color: #f59e0b; }
.bad { color: #ef4444; }
</style>
