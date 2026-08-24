<template>
  <div class="reports-page">
    <div class="page-header">
      <div>
        <h2>报告中心</h2>
        <p class="text-secondary text-sm">查看所有客户的检测报告</p>
      </div>
      <div class="header-actions">
        <el-input v-model="filters.keyword" placeholder="搜索客户姓名 / 手机号" style="width: 240px" clearable @change="loadList">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filters.templateCode" placeholder="报告类型" clearable style="width: 160px" @change="loadList">
          <el-option v-for="t in templates" :key="t.code" :label="t.name" :value="t.code" />
        </el-select>
        <el-button @click="loadList"><el-icon><Refresh /></el-icon></el-button>
      </div>
    </div>

    <div class="reports-grid">
      <div v-for="r in items" :key="r.id" class="report-card glass-card" @click="viewReport(r)">
        <div class="card-header">
          <div class="report-icon" :style="{ background: scoreGradient(r.score) }">
            <el-icon :size="20"><Document /></el-icon>
          </div>
          <div class="report-meta">
            <div class="report-title">{{ r.title }}</div>
            <div class="report-customer">{{ r.customer?.name }} · {{ r.customer?.phone }}</div>
          </div>
          <div class="report-score" :style="{ color: scoreColor(r.score) }">{{ r.score }}</div>
        </div>
        <div class="card-body">
          <div class="conclusion">{{ r.conclusion }}</div>
        </div>
        <div class="card-footer">
          <span class="text-xs text-tertiary">{{ formatDate(r.createdAt) }}</span>
          <div class="actions">
            <el-button text type="primary" size="small" @click.stop="viewReport(r)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button text type="success" size="small" @click.stop="downloadPdf(r)">
              <el-icon><Download /></el-icon>
              PDF
            </el-button>
            <el-button text type="warning" size="small" @click.stop="sendReport(r)">
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-pagination
      v-model:current-page="filters.page"
      v-model:page-size="filters.pageSize"
      :total="total"
      :page-sizes="[12, 24, 48]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="loadList"
      @size-change="loadList"
      style="margin-top: 16px; justify-content: flex-end"
    />

    <!-- 报告详情抽屉 -->
    <el-drawer v-model="showDrawer" :title="currentReport?.title || '报告详情'" size="70%" direction="rtl">
      <div v-if="currentReport" class="report-detail">
        <div class="detail-header">
          <div class="score-circle" :style="{ background: scoreGradient(currentReport.score) }">
            <div class="score-value">{{ currentReport.score }}</div>
            <div class="score-label">综合评分</div>
          </div>
          <div class="info-grid">
            <div class="info-item"><div class="label">姓名</div><div class="value">{{ currentReport.customer?.name }}</div></div>
            <div class="info-item"><div class="label">性别</div><div class="value">{{ currentReport.customer?.gender === 1 ? '男' : '女' }}</div></div>
            <div class="info-item"><div class="label">年龄</div><div class="value">{{ currentReport.customer?.age || '-' }} 岁</div></div>
            <div class="info-item"><div class="label">检测时间</div><div class="value text-sm">{{ formatDate(currentReport.createdAt) }}</div></div>
          </div>
        </div>

        <el-tabs>
          <el-tab-pane label="评估结论">
            <div class="conclusion-text">{{ currentReport.conclusion }}</div>
          </el-tab-pane>
          <el-tab-pane label="AI 解读">
            <div v-if="aiText" class="conclusion-text" style="white-space:pre-wrap">{{ aiText }}</div>
            <div v-else class="empty-ai">
              <p class="text-muted">暂无 AI 解读</p>
              <el-button v-if="isHeadOffice" type="primary" size="small" :loading="aiInterpreting" @click="interpretReport">
                生成 AI 解读
              </el-button>
              <p v-else class="text-muted text-xs">门店可到「服务申请」提交 AI 报告解读</p>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="'指标详情 (' + (currentReport.indicators?.length || 0) + ')'">
            <el-table :data="currentReport.indicators || []" max-height="500">
              <el-table-column prop="name" label="指标" min-width="120" />
              <el-table-column prop="value" label="实测值" width="100">
                <template #default="{ row }">
                  <span :class="statusClass(row.status)">{{ row.value }} {{ row.unit }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="referenceRange" label="标准范围" width="120" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="健康建议">
            <ul class="suggestions">
              <li v-for="(s, i) in currentReport.suggestions || []" :key="i">{{ s }}</li>
            </ul>
          </el-tab-pane>
          <el-tab-pane label="重点关注" v-if="currentReport.warnings?.length > 0">
            <ul class="warnings">
              <li v-for="(w, i) in currentReport.warnings" :key="i">⚠ {{ w }}</li>
            </ul>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>

    <el-dialog v-model="showShare" title="发送报告给客户" width="480px">
      <p class="text-secondary" style="margin:0 0 12px">复制下面链接发给客户，客户无需登录即可查看报告：</p>
      <el-input v-model="shareUrl" readonly>
        <template #append><el-button @click="copyShare">复制</el-button></template>
      </el-input>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { reportApi } from '@/api';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const items = ref<any[]>([]);
const total = ref(0);
const templates = ref<any[]>([]);
const showDrawer = ref(false);
const currentReport = ref<any>(null);
const showShare = ref(false);
const shareUrl = ref('');
const aiInterpreting = ref(false);

const isHeadOffice = computed(() => authStore.user?.role === 'SUPER_ADMIN');
const aiText = computed(() => currentReport.value?.aiInterpretations?.[0]?.content || '');

const filters = ref({
  keyword: '',
  templateCode: '',
  page: 1,
  pageSize: 12,
});

const TEMPLATE_LIST = [
  { code: 'comprehensive', name: '综合报告' }, { code: 'cardiovascular', name: '心脑血管' },
  { code: 'immune_system', name: '免疫系统' }, { code: 'trace_elements', name: '微量元素' },
  { code: 'vitamins', name: '维生素' }, { code: 'body_composition', name: '人体成分' },
  { code: 'expert_analysis', name: '专家分析' }, { code: 'basic_constitution', name: '基本体质' },
];

async function loadList() {
  try {
    const params: any = { page: filters.value.page, pageSize: filters.value.pageSize };
    if (filters.value.keyword) params.keyword = filters.value.keyword;
    if (filters.value.templateCode) params.templateCode = filters.value.templateCode;
    if (route.query.customerId) params.customerId = route.query.customerId;
    const res: any = await reportApi.list(params);
    items.value = res.items || [];
    total.value = res.total || 0;
  } catch (e: any) {
    ElMessage.error(e.message);
  }
}

async function viewReport(r: any) {
  try {
    const detail: any = await reportApi.detail(r.id);
    currentReport.value = detail;
    showDrawer.value = true;
  } catch (e: any) {
    // 降级使用列表数据
    currentReport.value = r;
    showDrawer.value = true;
  }
}

function downloadPdf(r: any) {
  if (window.electronAPI) {
    window.electronAPI.showSaveDialog({
      defaultPath: r.customer?.name + '-' + r.title + '.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    }).then((res: any) => {
      if (res.filePath) {
        window.electronAPI.openExternal(reportApi.pdfUrl(r.id));
        ElMessage.success('已生成 PDF');
      }
    });
  } else {
    window.open(reportApi.pdfUrl(r.id));
  }
}

async function sendReport(r: any) {
  try {
    const res: any = await reportApi.send(r.id);
    shareUrl.value = res?.shareUrl || '';
    showShare.value = true;
  } catch (e: any) { ElMessage.error(e.message); }
}

function copyShare() {
  if (!shareUrl.value) return;
  navigator.clipboard?.writeText(shareUrl.value).then(() => ElMessage.success('已复制分享链接'));
}

async function interpretReport() {
  if (!currentReport.value) return;
  aiInterpreting.value = true;
  try {
    const res: any = await reportApi.interpret(currentReport.value.id);
    const text = res?.interpretation || '';
    currentReport.value.aiInterpretations = [{ content: text }];
    ElMessage.success('AI 解读已生成');
  } catch (e: any) { ElMessage.error(e.message); }
  finally { aiInterpreting.value = false; }
}

function scoreColor(s: number) { return s >= 85 ? '#059669' : s >= 70 ? '#f59e0b' : '#ef4444'; }
function scoreGradient(s: number) { return s >= 85 ? 'linear-gradient(135deg, #059669, #059669)' : s >= 70 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)'; }
function statusClass(s: number) { return s === 0 ? 'text-success' : s >= 3 ? 'text-danger' : 'text-warning'; }
function statusTagType(s: number) { return s === 0 ? 'success' : s >= 3 ? 'danger' : 'warning'; }
function statusLabel(s: number) { return ['正常', '偏高', '偏低', '过高', '过低', '危险', '未知'][s] || '未知'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

onMounted(() => {
  templates.value = TEMPLATE_LIST;
  loadList();
});
</script>

<style lang="scss" scoped>
.reports-page { display: flex; flex-direction: column; height: 100%; }

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

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

.report-card {
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}
.report-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: var(--shadow); }

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.report-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.report-meta { flex: 1; min-width: 0; }
.report-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.report-customer { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }

.report-score { font-size: 28px; font-weight: 800; line-height: 1; }

.card-body { min-height: 60px; }
.conclusion { font-size: 12px; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-light);
}
.actions { display: flex; gap: 4px; }

/* 详情 */
.detail-header {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 24px;
  background: var(--gradient-card);
  border-radius: 12px;
  margin-bottom: 16px;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.score-value { font-size: 40px; font-weight: 800; }
.score-label { font-size: 11px; opacity: 0.9; margin-top: 2px; }

.info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.info-item { background: rgba(5, 150, 105, 0.05); padding: 8px 12px; border-radius: 8px; }
.info-item .label { font-size: 11px; color: var(--text-tertiary); }
.info-item .value { font-size: 14px; font-weight: 500; margin-top: 2px; }

.conclusion-text {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}
.empty-ai { text-align: center; padding: 40px 16px; }
.empty-ai p { margin: 0 0 12px; }

.suggestions, .warnings {
  padding: 0;
  list-style: none;
}
.suggestions li, .warnings li {
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}
.warnings li { color: #fca5a5; border-left: 3px solid #ef4444; }

.text-success { color: #059669; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }
</style>
