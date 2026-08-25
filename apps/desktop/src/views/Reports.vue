<template>
  <div class="reports-page">
    <!-- 一级：客户列表 -->
    <div v-if="view === 'customers'" class="view-layer">
      <div class="page-header">
        <div>
          <h2>报告中心</h2>
          <p class="text-secondary text-sm">选择客户，查看其检测报告</p>
        </div>
        <div class="header-actions">
          <el-input v-model="filters.keyword" placeholder="检索客户姓名 / 手机号" style="width: 260px" clearable @change="loadCustomers" @keyup.enter="loadCustomers">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="loadCustomers"><el-icon><Refresh /></el-icon> 刷新</el-button>
          <el-button type="success" @click="openImport"><el-icon><Upload /></el-icon> 导入报告</el-button>
        </div>
      </div>

      <div v-if="hasSearched && customers.length" class="customer-grid">
        <div v-for="c in customers" :key="c.id" class="customer-card glass-card" @click="selectCustomer(c)">
          <div class="customer-avatar">{{ (c.name || '?')[0] }}</div>
          <div class="customer-main">
            <div class="customer-name">{{ c.name }}</div>
            <div class="customer-phone">{{ c.phone || '未填写手机号' }}</div>
          </div>
          <div class="customer-meta">
            <div class="meta-count">{{ c.reportCount }} 份报告</div>
            <div class="meta-time">{{ formatDate(c.lastReportAt) }}</div>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>
      <div v-else-if="hasSearched && !customers.length" class="empty-state-card glass-card">
        <el-icon class="empty-icon"><Search /></el-icon>
        <p class="empty-title">未找到匹配的客户报告</p>
        <p class="empty-hint">请检查姓名或手机号是否正确</p>
      </div>
      <div v-else class="empty-state-card glass-card privacy-prompt">
        <el-icon class="empty-icon"><Lock /></el-icon>
        <p class="empty-title">客户隐私保护</p>
        <p class="empty-hint">为保护客户隐私，请在上方输入<strong> 客户姓名 </strong>或<strong> 手机号 </strong>检索后查看报告</p>
      </div>
    </div>

    <!-- 二级：某客户的报告时间列表 -->
    <div v-else-if="view === 'reports'" class="view-layer">
      <div class="page-header">
        <div class="sub-header">
          <el-button @click="backToCustomers"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
          <h2>{{ selectedCustomer?.name }} 的检测报告</h2>
          <span class="text-secondary text-sm">{{ selectedCustomer?.phone }}</span>
        </div>
        <div class="header-actions">
          <el-button @click="loadCustomerReports"><el-icon><Refresh /></el-icon></el-button>
        </div>
      </div>

      <div v-if="detectionGroups.length" class="report-time-list">
        <div v-for="g in detectionGroups" :key="g.key" class="time-item glass-card" @click="viewReport(g)">
          <div class="time-badge">
            <el-icon><Calendar /></el-icon>
            <div>
              <div class="time-main">{{ formatDate(g.createdAt) }}</div>
              <div class="time-sub">本次检测共 {{ g.reportCount }} 份报告</div>
            </div>
          </div>
          <div class="time-score" v-if="g.avgScore !== null" :style="{ color: scoreColor(g.avgScore) }">{{ g.avgScore }} 分</div>
          <div class="time-score text-tertiary" v-else>-</div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>
      <el-empty v-else description="该客户暂无检测报告" />
    </div>

    <!-- 二级半：某次检测的全部报告列表 -->
    <div v-else-if="view === 'detectionReports'" class="view-layer">
      <div class="page-header">
        <div class="sub-header">
          <el-button @click="backToDetectionReports"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
          <h2>{{ selectedCustomer?.name }} · {{ formatDate(detectionGroupInfo?.createdAt) }} 的检测报告</h2>
          <span class="text-secondary text-sm">共 {{ detectionReports.length }} 类</span>
        </div>
      </div>
      <div v-if="detectionReports.length" class="report-category-grid">
        <div v-for="r in detectionReports" :key="r.id" class="category-card glass-card" @click="openReport(r)">
          <div class="category-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="category-main">
            <div class="category-title">{{ r.title }}</div>
            <div class="category-sub">{{ r.indicators ? indicatorCount(r) : 0 }} 项指标</div>
          </div>
          <div class="category-score" :style="{ color: scoreColor(r.score) }">{{ r.score }}<span class="score-suffix">分</span></div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>
      <el-empty v-else description="该次检测暂无报告" />
    </div>

    <!-- 三级：报告详情 -->
    <div v-else class="view-layer detail-layer">
      <div class="page-header">
        <div class="sub-header">
          <el-button @click="backToReports"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
          <h2>{{ currentReport?.title || '报告详情' }}</h2>
        </div>
        <div class="header-actions" v-if="currentReport">
          <el-button type="success" size="small" @click="downloadPdf(currentReport)"><el-icon><Download /></el-icon> PDF</el-button>
          <el-button type="warning" size="small" @click="sendReport(currentReport)"><el-icon><Promotion /></el-icon> 发送</el-button>
          <el-button v-if="canDelete" type="danger" size="small" @click="removeReport"><el-icon><Delete /></el-icon> 删除</el-button>
        </div>
      </div>

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
            <div class="info-item"><div class="label">身高</div><div class="value">{{ currentReport.customer?.heightCm || '-' }} cm</div></div>
            <div class="info-item"><div class="label">体重</div><div class="value">{{ currentReport.customer?.weightKg || '-' }} kg</div></div>
            <div class="info-item"><div class="label">检测时间</div><div class="value text-sm">{{ formatDate(currentReport.createdAt) }}</div></div>
          </div>
        </div>

        <el-tabs>
          <el-tab-pane label="检测明细">
            <div class="indicator-table-wrap">
              <table class="indicator-table">
                <thead>
                  <tr>
                    <th>检测项目</th>
                    <th>正常范围</th>
                    <th>实际测量值</th>
                    <th>检测结果</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(ind, i) in indicatorRows" :key="i" :class="'row-' + ind.status">
                    <td class="ind-name">{{ ind.name }}</td>
                    <td class="ind-range">{{ ind.referenceRange || (ind.lowLimit + '-' + ind.highLimit) }}</td>
                    <td class="ind-value" :style="{ color: statusColor(ind.status) }">{{ ind.value }}</td>
                    <td>
                      <span class="severity-badge" :class="'sev-' + ind.status">{{ severityLabel(ind.status) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </el-tab-pane>
          <el-tab-pane label="评估结论">
            <div class="conclusion-text">{{ currentReport.conclusion }}</div>
          </el-tab-pane>
          <el-tab-pane label="评估依据">
            <div v-if="evidenceInfo" class="evidence-panel">
              <div class="evidence-basis">
                <div class="cond-label">科学依据</div>
                <p class="evidence-text">{{ evidenceInfo.scientificBasis }}</p>
              </div>
              <div class="evidence-ref">
                <div class="cond-label">参考文献</div>
                <p class="evidence-text">
                  {{ evidenceInfo.reference }}
                  <a v-if="evidenceInfo.referenceUrl" :href="evidenceInfo.referenceUrl" target="_blank" rel="noopener" class="evidence-link">[溯源]</a>
                </p>
              </div>
              <div v-if="evidenceInfo.riskFactors?.length" class="evidence-block">
                <div class="cond-label">循证风险因素</div>
                <div class="risk-tags">
                  <span v-for="(r,i) in evidenceInfo.riskFactors" :key="i" class="risk-tag">{{ r }}</span>
                </div>
              </div>
              <div v-if="evidenceInfo.genderNote" class="evidence-block">
                <div class="cond-label">性别重点</div>
                <p class="evidence-text">{{ evidenceInfo.genderNote }}</p>
              </div>
            </div>
            <div v-else class="text-muted">该报告暂无评估依据</div>
          </el-tab-pane>
          <el-tab-pane label="中医体质">
            <div class="tcm-panel">
              <div class="tcm-type">
                <span class="tcm-tag">您的体质</span>
                <h2>{{ tcmInfo.type || '平和质' }}</h2>
              </div>
              <p class="tcm-desc">{{ tcmInfo.description }}</p>
              <div v-if="tcmInfo.traits?.length" class="tcm-traits">
                <span v-for="(t,i) in tcmInfo.traits" :key="i" class="trait-tag">{{ t }}</span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="药食同源">
            <div class="diet-panel">
              <div class="diet-col">
                <h3 class="ok">宜吃（药食同源）</h3>
                <ul><li v-for="r in dietInfo.recommend || []" :key="r">{{ r }}</li></ul>
              </div>
              <div class="diet-col">
                <h3 class="no">慎吃 / 忌口</h3>
                <ul><li v-for="a in dietInfo.avoid || []" :key="a">{{ a }}</li></ul>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="调理方案">
            <div class="cond-panel">
              <div v-if="condInfo.tcmFormula" class="cond-formula">
                <div class="cond-label">中医辨证方</div>
                <div class="cond-value">{{ condInfo.tcmFormula }}</div>
              </div>
              <div v-if="condInfo.exercise?.length" class="cond-block">
                <div class="cond-label">运动建议</div>
                <ul><li v-for="e in condInfo.exercise" :key="e">{{ e }}</li></ul>
              </div>
              <div v-if="condInfo.lifestyle?.length" class="cond-block">
                <div class="cond-label">起居调养</div>
                <ul><li v-for="l in condInfo.lifestyle" :key="l">{{ l }}</li></ul>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="AI 解读">
            <div v-if="aiStructured" class="ai-structured">
              <div class="ai-block">
                <div class="ai-block-title">整体评估</div>
                <p class="ai-text">{{ aiStructured.overallAssessment }}</p>
              </div>
              <div class="ai-block" v-if="aiStructured.constitutionAnalysis">
                <div class="ai-block-title">体质解读</div>
                <p class="ai-text">{{ aiStructured.constitutionAnalysis }}</p>
              </div>
              <div class="ai-block" v-if="aiStructured.keyFindings?.length">
                <div class="ai-block-title">关键发现</div>
                <ul class="ai-list"><li v-for="(k,i) in aiStructured.keyFindings" :key="i">{{ k }}</li></ul>
              </div>
              <div class="ai-block" v-if="aiStructured.risks?.length">
                <div class="ai-block-title">风险关注</div>
                <div class="ai-risk" v-for="(r,i) in aiStructured.risks" :key="i">
                  <div class="ai-risk-head">
                    <span class="ai-risk-name">{{ r.indicator }}</span>
                    <el-tag size="small" :type="riskTagType(r.level)">{{ r.level || '中' }}</el-tag>
                  </div>
                  <p class="ai-text">{{ r.advice }}</p>
                </div>
              </div>
              <div class="ai-grid">
                <div class="ai-block" v-if="aiStructured.diet?.length">
                  <div class="ai-block-title">饮食调理</div>
                  <ul class="ai-list">
                    <li v-for="(d,i) in aiStructured.diet" :key="i"><span :class="d.type==='忌' ? 'ai-tag-no' : 'ai-tag-ok'">{{ d.type }}</span> {{ d.item }}<span class="ai-reason">（{{ d.reason }}）</span></li>
                  </ul>
                </div>
                <div class="ai-block" v-if="aiStructured.exercise?.length">
                  <div class="ai-block-title">运动建议</div>
                  <ul class="ai-list">
                    <li v-for="(e,i) in aiStructured.exercise" :key="i">{{ e.type }}：{{ e.intensity }}，{{ e.frequency }}，{{ e.duration }}</li>
                  </ul>
                </div>
              </div>
              <div class="ai-block" v-if="aiStructured.lifestyle?.length">
                <div class="ai-block-title">生活作息</div>
                <ul class="ai-list"><li v-for="(l,i) in aiStructured.lifestyle" :key="i">{{ l }}</li></ul>
              </div>
              <div class="ai-grid">
                <div class="ai-block" v-if="aiStructured.meridians?.length">
                  <div class="ai-block-title">经络穴位</div>
                  <div class="ai-merge" v-for="(m,i) in aiStructured.meridians" :key="i"><b>{{ m.name }}</b>：{{ m.method }}</div>
                </div>
                <div class="ai-block" v-if="aiStructured.therapies?.length">
                  <div class="ai-block-title">推荐理疗</div>
                  <ul class="ai-list"><li v-for="(t,i) in aiStructured.therapies" :key="i">{{ t.name }}（{{ t.frequency }}）</li></ul>
                </div>
              </div>
              <div class="ai-block ai-followup" v-if="aiStructured.followUp">
                <div class="ai-block-title">复检建议</div>
                <p class="ai-text">{{ aiStructured.followUp.days }} 天后复检，重点观察：{{ (aiStructured.followUp.watchIndicators || []).join('、') }}</p>
              </div>
              <el-button v-if="isHeadOffice" size="small" style="margin-top:12px" :loading="aiInterpreting" @click="interpretReport">重新生成</el-button>
            </div>
            <div v-else-if="aiRawFailed" class="ai-failed">
              <div class="ai-block-title">⚠️ 上一次 AI 解析未能正常结构化（可能是输出被截断）</div>
              <p class="text-muted" style="margin: 8px 0 12px 0">点击下方按钮重新生成即可正常展示结构化解读。</p>
              <el-button v-if="isHeadOffice" type="primary" size="small" :loading="aiInterpreting" @click="interpretReport">重新生成 AI 结构化解读</el-button>
            </div>
            <div v-else-if="aiText" class="conclusion-text" style="white-space:pre-wrap">{{ aiText }}</div>
            <div v-else class="empty-ai">
              <p class="text-muted">暂无 AI 解读</p>
              <el-button v-if="isHeadOffice" type="primary" size="small" :loading="aiInterpreting" @click="interpretReport">生成 AI 结构化解读</el-button>
              <p v-else class="text-muted text-xs">门店可到「服务申请」提交 AI 报告解读</p>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="'指标详情 (' + (currentReport.indicators?.length || 0) + ')'">
            <el-table :data="currentReport.indicators || []" max-height="500">
              <el-table-column prop="name" label="指标" min-width="120" />
              <el-table-column prop="value" label="实测值" width="100">
                <template #default="{ row }"><span :class="statusClass(row.status)">{{ row.value }} {{ row.unit }}</span></template>
              </el-table-column>
              <el-table-column prop="referenceRange" label="标准范围" width="120" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }"><el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="健康建议">
            <ul class="suggestions"><li v-for="(s, i) in generalInfo" :key="i">{{ s }}</li></ul>
            <div v-if="homeCareInfo.length" class="home-care-archive">
              <div class="ai-block-title">📋 归档：综合居家调理建议</div>
              <div class="archive-intro">根据本次综合检测各项指标，归档以下居家调理建议（仅文字建议，无数值与风险评估）：</div>
              <div class="archive-text">{{ homeCareInfo.join(' ／ ') }}</div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="重点关注" v-if="currentReport.warnings?.length > 0">
            <ul class="warnings"><li v-for="(w, i) in currentReport.warnings" :key="i">⚠ {{ w }}</li></ul>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 导入对话框 -->
    <el-dialog v-model="showImport" title="导入原版检测报告（真实数据）" width="560px">
      <el-alert type="info" :closable="false" show-icon title="选择原版软件 ReportC 文件夹里的 HTML 报告（可多选），系统自动解析真实指标导入" style="margin-bottom:12px" />
      <el-form label-width="90px">
        <el-form-item label="选择客户" required>
          <el-select v-model="importCustomerId" filterable placeholder="选择客户" style="width:100%">
            <el-option v-for="c in importCustomers" :key="c.id" :label="c.name + ' · ' + c.phone" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择报告">
          <input type="file" multiple accept=".html,.htm" @change="onImportFiles" style="display:none" ref="fileInput" />
          <el-button @click="$refs.fileInput.click()">选择 HTML 报告文件（可多选）</el-button>
          <div v-if="importFiles.length" style="margin-top:8px;font-size:12px;color:#475569">已选 {{ importFiles.length }} 个文件</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImport=false">取消</el-button>
        <el-button type="primary" :loading="importing" @click="doImport">解析并导入</el-button>
      </template>
    </el-dialog>

    <!-- 分享对话框 -->
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { reportApi, detectionApi, customerApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { Lock, Calendar } from '@element-plus/icons-vue';

const route = useRoute();
const authStore = useAuthStore();

// 三级视图状态
const view = ref<'customers' | 'reports' | 'detectionReports' | 'detail'>('customers');
const customers = ref<any[]>([]);
const selectedCustomer = ref<any>(null);
const customerReports = ref<any[]>([]);
const detectionReports = ref<any[]>([]);
const detectionGroupInfo = ref<any>(null);
const currentReport = ref<any>(null);
const showShare = ref(false);
const shareUrl = ref('');
const aiInterpreting = ref(false);

const isHeadOffice = computed(() => authStore.user?.role === 'SUPER_ADMIN');
const canDelete = computed(() => { const role = authStore.user?.role; return role === 'SUPER_ADMIN' || role === 'STORE_ADMIN'; });
const aiText = computed(() => currentReport.value?.aiInterpretations?.[0]?.content || '');
const aiRawFailed = computed(() => {
  try {
    const ai = currentReport.value?.aiInterpretations?.[0];
    if (!ai?.content) return false;
    const cc = typeof ai.content === 'string' ? JSON.parse(ai.content) : ai.content;
    return !!(cc && typeof cc === 'object' && 'raw' in cc);
  } catch { return false; }
});

const aiStructured = computed(() => {
  try {
    const ai = currentReport.value?.aiInterpretations?.[0];
    if (!ai) return null;
    if (ai.advice) {
      const a = typeof ai.advice === 'string' ? JSON.parse(ai.advice) : ai.advice;
      if (a?.structured && a.structured.overallAssessment) return a.structured;
    }
    if (ai.content) {
      try { const cc = typeof ai.content === 'string' ? JSON.parse(ai.content) : ai.content; if (cc && cc.overallAssessment) return cc; } catch {}
    }
    return null;
  } catch { return null; }
});
function riskTagType(level: string) {
  if (level === '高' || level === '危险') return 'danger';
  if (level === '中') return 'warning';
  return 'info';
}
const indicatorRows = computed(() => {
  try {
    const raw = currentReport.value?.indicators;
    if (!raw) return [];
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return [];
    // 综合报告中“居家调理”为归档建议文字，不在检测明细体现检测结果/实际测量值
    return arr.filter((i: any) => i?.name !== '居家调理');
  } catch { return []; }
});
function severityLabel(status: number) {
  const map: Record<number, string> = { 0: '正常(-)', 1: '轻度异常(+)', 2: '轻度异常(+)', 3: '中度异常(++)', 4: '重度异常(+++)' };
  return map[status] || '未知';
}
function statusColor(status: number) {
  const map: Record<number, string> = { 0: '#059669', 1: '#d97706', 2: '#d97706', 3: '#ea580c', 4: '#dc2626' };
  return map[status] || '#64748b';
}
const tcmInfo = computed(() => { try { const s = currentReport.value?.suggestions; if (!s) return {}; const obj = typeof s === 'string' ? JSON.parse(s) : s; return obj.tcm || {}; } catch { return {}; } });
const dietInfo = computed(() => { try { const s = currentReport.value?.suggestions; if (!s) return {}; const obj = typeof s === 'string' ? JSON.parse(s) : s; return obj.diet || {}; } catch { return {}; } });
const condInfo = computed(() => { try { const s = currentReport.value?.suggestions; if (!s) return {}; const obj = typeof s === 'string' ? JSON.parse(s) : s; return obj.conditioning || {}; } catch { return {}; } });
const generalInfo = computed(() => { try { const s = currentReport.value?.suggestions; if (!s) return []; const obj = typeof s === 'string' ? JSON.parse(s) : s; return Array.isArray(obj.general) ? obj.general : []; } catch { return []; } });
const evidenceInfo = computed(() => { try { const s = currentReport.value?.suggestions; if (!s) return null; const obj = typeof s === 'string' ? JSON.parse(s) : s; return obj.evidence || null; } catch { return null; } });

const filters = ref({ keyword: '' });
const hasSearched = ref(false);
const detectionGroups = ref<any[]>([]);

// 一级：加载客户列表（按客户分组报告）
async function loadCustomers() {
  try {
    const params: any = { page: 1, pageSize: 500 };
    if (filters.value.keyword) params.keyword = filters.value.keyword;
    const res: any = await reportApi.list(params);
    const items: any[] = res.items || [];
    const map = new Map<string, any>();
    for (const r of items) {
      const c = r.customer;
      if (!c) continue;
      const key = c.id;
      if (!map.has(key)) {
        map.set(key, { id: c.id, name: c.name, phone: c.phone, reportCount: 0, lastReportAt: null });
      }
      const entry = map.get(key);
      entry.reportCount++;
      const t = new Date(r.createdAt).getTime();
      if (!entry.lastReportAt || t > new Date(entry.lastReportAt).getTime()) entry.lastReportAt = r.createdAt;
    }
    customers.value = Array.from(map.values()).sort((a, b) => new Date(b.lastReportAt).getTime() - new Date(a.lastReportAt).getTime());
    hasSearched.value = true;
  } catch (e: any) {
    ElMessage.error(e.message);
  }
}

// 二级：选中客户，加载其报告
function selectCustomer(c: any) {
  selectedCustomer.value = c;
  view.value = 'reports';
  loadCustomerReports();
}

async function loadCustomerReports() {
  if (!selectedCustomer.value) return;
  try {
    const params: any = { page: 1, pageSize: 500, customerId: selectedCustomer.value.id };
    const res: any = await reportApi.list(params);
    const items: any[] = res.items || [];
    // 按 detectionId（每次检测）分组：日期列表显示每次检测，不显示 47 条单报告
    const groupMap = new Map<string, any>();
    for (const r of items) {
      const key = r.detectionId || r.id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          detectionId: r.detectionId,
          createdAt: r.createdAt,
          reportCount: 0,
          totalScore: 0,
          scoredCount: 0,
          firstReportId: r.id,
          firstTitle: r.title,
        });
      }
      const g = groupMap.get(key);
      g.reportCount++;
      if (typeof r.score === 'number') { g.totalScore += r.score; g.scoredCount++; }
    }
    const groups = Array.from(groupMap.values()).map(g => ({
      ...g,
      avgScore: g.scoredCount ? Math.round(g.totalScore / g.scoredCount) : null,
    }));
    groups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    detectionGroups.value = groups;
  } catch (e: any) {
    ElMessage.error(e.message);
  }
}

// 打开单个报告详情
async function openReport(r: any) {
  try {
    const detail: any = await reportApi.detail(r.id);
    currentReport.value = detail;
  } catch { currentReport.value = r; }
  view.value = 'detail';
}
function backToDetectionReports() {
  view.value = 'reports';
  detectionReports.value = [];
}
function backToCustomers() {
  view.value = 'customers';
  selectedCustomer.value = null;
  customerReports.value = [];
}

function backToReports() {
  // 返回上一级：某次检测的全部报告列表（detectionReports），而非直接跳回客户报告列表
  view.value = 'detectionReports';
  currentReport.value = null;
}

// 三级：按日期进入报告（取该次检测的首份报告作详情展示，并带上所属检测的所有报告）
async function viewReport(group: any) {
  // 点日期 -> 展示该次检测的全部报告列表（47类）
  try {
    const params: any = { page: 1, pageSize: 200, customerId: selectedCustomer.value.id };
    const res: any = await reportApi.list(params);
    const sameDetection = (res.items || []).filter((x: any) => x.detectionId === group.detectionId);
    // 综合/专家/手工分析放最后，真实测量类别放前面
    sameDetection.sort((a: any, b: any) => {
      const meta = ['comprehensive', 'expert_analysis', 'manual_analysis'];
      const am = meta.indexOf(a.templateCode); const bm = meta.indexOf(b.templateCode);
      if (am !== -1 || bm !== -1) return (am === -1 ? 1 : 0) - (bm === -1 ? 1 : 0);
      return (a.title || '').localeCompare(b.title || '', 'zh-CN');
    });
    detectionReports.value = sameDetection;
    detectionGroupInfo.value = group;
    view.value = 'detectionReports';
  } catch (e: any) {
    ElMessage.error('加载报告列表失败');
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

async function removeReport() {
  if (!currentReport.value) return;
  try {
    await ElMessageBox.confirm('确定删除这份报告吗？删除后不可恢复。', '删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消', distinguishCancelAndClose: true });
    const deletedId = currentReport.value.id;
    await reportApi.remove(deletedId);
    ElMessage.success('报告已删除');
    detectionReports.value = detectionReports.value.filter((r: any) => r.id !== deletedId);
    currentReport.value = null;
    backToReports();
    await loadCustomerReports();
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '删除失败');
  }
}

async function interpretReport() {
  if (!currentReport.value) return;
  aiInterpreting.value = true;
  try {
    const res: any = await reportApi.interpretStructured(currentReport.value.id);
    const structured = res?.structured || res?.data?.structured || null;
    if (structured && structured.overallAssessment) {
      currentReport.value.aiInterpretations = [{ content: JSON.stringify(structured), advice: JSON.stringify({ structured }) }];
      ElMessage.success('AI 结构化解读已生成');
    } else {
      const text = res?.interpretation || '';
      if (text) { currentReport.value.aiInterpretations = [{ content: text }]; ElMessage.success('AI 解读已生成'); }
      else ElMessage.warning('AI 未返回有效内容');
    }
  } catch (e: any) { ElMessage.error(e.message); }
  finally { aiInterpreting.value = false; }
}

function indicatorCount(r: any) {
  try {
    const raw = r.indicators;
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.length : 0;
  } catch { return 0; }
}
function scoreColor(s: number) { return s >= 85 ? '#059669' : s >= 70 ? '#f59e0b' : '#ef4444'; }
function scoreGradient(s: number) { return s >= 85 ? 'linear-gradient(135deg, #059669, #059669)' : s >= 70 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ef4444, #dc2626)'; }
function statusClass(s: number) { return s === 0 ? 'text-success' : s >= 3 ? 'text-danger' : 'text-warning'; }
function statusTagType(s: number) { return s === 0 ? 'success' : s >= 3 ? 'danger' : 'warning'; }
function statusLabel(s: number) { return ['正常', '偏高', '偏低', '过高', '过低', '危险', '未知'][s] || '未知'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

// 导入功能
const showImport = ref(false);
const importCustomerId = ref('');
const importCustomers = ref<any[]>([]);
const importFiles = ref<File[]>([]);
const importing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const IMPORT_TEMPLATE_MAP: Record<string, string> = {
  '心脑血管': 'cardiovascular', '胃肠': 'gi_function', '肝功能': 'liver', '胆功能': 'gallbladder',
  '胰腺功能': 'pancreas', '肾脏功能': 'kidney', '肺功能': 'lung_function', '脑神经': 'brain_nerve',
  '骨病': 'bone_disease', '骨密度': 'bone_density', '风湿骨病': 'rheumatism', '骨生长': 'bone_growth',
  '血糖': 'blood_sugar', '微量元素': 'trace_elements', '维生素': 'vitamins', '氨基酸': 'amino_acid',
  '辅酶': 'coenzyme', '内分泌': 'endocrine', '免疫系统': 'immune_system', '人体毒素': 'body_toxin',
  '重金属': 'heavy_metal', '基本体质': 'basic_constitution', '过敏': 'allergy', '皮肤': 'skin',
  '眼部': 'eye', '前列腺': 'prostate', '男性性功能': 'male_sexual', '经络': 'meridian',
  '肥胖症': 'obesity', '胶原蛋白': 'collagen', '脉搏': 'cervical_vascular', '人体成份': 'body_composition',
  '大肠': 'large_intestine', '甲状腺': 'thyroid', '血脂': 'blood_lipid', '精子': 'sperm_semen',
  '综合免疫力': 'comprehensive_immunity', '脂肪酸': 'fatty_acid', '意识形态': 'consciousness_posture',
  '基本脂肪酸': 'efa', '呼吸功能': 'respiratory', '荷尔蒙': 'hormone', '体液': 'body_fluid',
  '肠道菌群': 'gut_flora', '专家分析': 'expert_analysis', '手工分析': 'manual_analysis', '综合报告': 'comprehensive',
};

function templateCodeOf(filename: string): string {
  for (const key in IMPORT_TEMPLATE_MAP) {
    if (filename.includes(key)) return IMPORT_TEMPLATE_MAP[key];
  }
  return 'comprehensive';
}

function parseReportHtml(html: string): { title: string; indicators: any[] } {
  const indicators: any[] = [];
  const trs = html.match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];
  for (const tr of trs) {
    const tds = tr.match(/<TD[^>]*>([\s\S]*?)<\/TD>/gi) || [];
    if (tds.length < 3) continue;
    const text = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const name = text(tds[0]);
    const range = text(tds[1]);
    const valueStr = text(tds[2]);
    const level = tds.length > 3 ? text(tds[3]) : '';
    const rm = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
    if (!name || !rm || !valueStr) continue;
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;
    indicators.push({ name, lowLimit: parseFloat(rm[1]), highLimit: parseFloat(rm[2]), value, unit: '', level });
  }
  const titleM = html.match(/<title>([^<]*)<\/title>/i);
  const title = titleM ? titleM[1].replace('检测报告', '').trim() : '';
  return { title, indicators };
}

async function openImport() {
  showImport.value = true;
  importFiles.value = [];
  try { importCustomers.value = ((await customerApi.list({ pageSize: 200 })) as any).items || []; } catch {}
}

function onImportFiles(e: Event) {
  importFiles.value = Array.from((e.target as HTMLInputElement).files || []);
}

async function doImport() {
  if (!importCustomerId.value) { ElMessage.warning('请选择客户'); return; }
  if (!importFiles.value.length) { ElMessage.warning('请选择报告文件'); return; }
  importing.value = true;
  try {
    const reports: any[] = [];
    for (const f of importFiles.value) {
      const html = await f.text();
      const { title, indicators } = parseReportHtml(html);
      if (!indicators.length) continue;
      reports.push({ templateCode: templateCodeOf(f.name), title: title || f.name.replace('.html', ''), indicators });
    }
    if (!reports.length) { ElMessage.warning('未解析到指标数据，请确认选择的是原版 HTML 报告'); return; }
    const res: any = await detectionApi.import({ customerId: importCustomerId.value, reports });
    ElMessage.success('导入成功，生成 ' + res.reportCount + ' 份真实报告');
    showImport.value = false;
    loadCustomers();
  } catch (e: any) {
    ElMessage.error('导入失败：' + (e.message || e));
  } finally {
    importing.value = false;
  }
}

onMounted(() => {
  // 保护客户隐私：不自动加载，必须先检索
});
</script>

<style lang="scss" scoped>
.reports-page { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.view-layer { display: flex; flex-direction: column; height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.sub-header { display: flex; align-items: center; gap: 12px; }

/* 一级：客户卡片 */
.customer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  flex: 1;
  overflow-y: auto;
  align-content: start;
}
.customer-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
}
.customer-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: var(--shadow); }
.customer-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #059669, #10b981);
  color: #fff; font-size: 18px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.customer-main { flex: 1; min-width: 0; }
.customer-name { font-size: 15px; font-weight: 600; }
.customer-phone { font-size: 12px; color: var(--text-tertiary); margin-top: 3px; }
.customer-meta { text-align: right; flex-shrink: 0; }
.meta-count { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.meta-time { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; }
.arrow { color: var(--text-tertiary); flex-shrink: 0; }

/* 二级：报告时间列表 */
.report-category-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; align-content: start; }
.category-card { display: flex; align-items: center; gap: 12px; padding: 14px; cursor: pointer; transition: all 0.2s; }
.category-card:hover { transform: translateY(-2px); border-color: rgba(5,150,105,0.4); box-shadow: 0 4px 12px rgba(5,150,105,0.1); }
.category-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #059669, #0ea5e9); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.category-main { flex: 1; min-width: 0; }
.category-title { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.category-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.category-score { font-size: 20px; font-weight: 800; flex-shrink: 0; }
.score-suffix { font-size: 11px; color: #94a3b8; font-weight: 400; margin-left: 1px; }
.report-time-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.time-item {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; cursor: pointer; transition: all 0.3s;
}
.time-item:hover { border-color: var(--border-hover); background: rgba(5, 150, 105, 0.04); }
.time-badge { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.time-badge > .el-icon { color: #059669; font-size: 18px; }
.time-main { font-size: 14px; font-weight: 600; }
.time-sub { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
.time-score { font-size: 20px; font-weight: 800; flex-shrink: 0; }

/* 三级：详情 */
.detail-layer { overflow-y: auto; }
.detail-header {
  display: flex; gap: 24px; align-items: center;
  padding: 24px; background: var(--gradient-card); border-radius: 12px; margin-bottom: 16px;
}
.score-circle {
  width: 120px; height: 120px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
}
.score-value { font-size: 40px; font-weight: 800; }
.score-label { font-size: 11px; opacity: 0.9; margin-top: 2px; }
.info-grid { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-item { background: rgba(5, 150, 105, 0.05); padding: 8px 12px; border-radius: 8px; }
.info-item .label { font-size: 11px; color: var(--text-tertiary); }
.info-item .value { font-size: 14px; font-weight: 500; margin-top: 2px; }

.tcm-panel { padding: 8px 0; }
.tcm-type { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.tcm-tag { background: #dcfce7; color: #059669; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.tcm-type h2 { margin: 0; font-size: 24px; color: #059669; font-weight: 700; }
.tcm-desc { color: #475569; line-height: 1.8; margin: 0 0 16px 0; }
.tcm-traits { display: flex; flex-wrap: wrap; gap: 8px; }
.trait-tag { background: #f0fdf4; color: #166534; padding: 6px 12px; border-radius: 20px; font-size: 13px; border: 1px solid #bbf7d0; }
.diet-panel { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.diet-col { background: rgba(5, 150, 105, 0.04); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); }
.diet-col h3 { margin: 0 0 12px 0; font-size: 16px; }
.diet-col h3.ok { color: #059669; }
.diet-col h3.no { color: #ef4444; }
.diet-col ul { margin: 0; padding-left: 20px; line-height: 2; color: #334155; }
.cond-panel { padding: 8px 0; }
.cond-formula, .cond-block { background: rgba(5, 150, 105, 0.04); padding: 14px 16px; border-radius: 10px; margin-bottom: 12px; border-left: 3px solid #059669; }
.cond-label { font-size: 12px; color: #059669; font-weight: 600; margin-bottom: 6px; }
.cond-value { font-size: 14px; color: #1e293b; font-weight: 500; }
.cond-block ul { margin: 0; padding-left: 20px; line-height: 1.9; color: #334155; }
.indicator-table-wrap { max-height: 520px; overflow-y: auto; border-radius: 8px; border: 1px solid #e5e7eb; }
.indicator-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.indicator-table thead th { background: #f1f5f9; color: #334155; font-weight: 600; padding: 10px 12px; text-align: center; border-bottom: 2px solid #e2e8f0; position: sticky; top: 0; }
.indicator-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; text-align: center; }
.indicator-table tbody tr:hover { background: #f8fafc; }
.ind-name { text-align: left !important; color: #1e293b; font-weight: 500; }
.ind-range { color: #64748b; font-size: 12px; }
.ind-value { font-weight: 700; font-size: 14px; }
.severity-badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.sev-0 { background: #dcfce7; color: #059669; }
.sev-1 { background: #fef3c7; color: #d97706; }
.sev-2 { background: #fef3c7; color: #d97706; }
.sev-3 { background: #ffedd5; color: #ea580c; }
.sev-4 { background: #fee2e2; color: #dc2626; }
.row-3 td { background: #fff7ed; }
.row-4 td { background: #fef2f2; }
.conclusion-text {
  font-size: 14px; line-height: 1.8; color: var(--text-secondary);
  padding: 16px; background: rgba(255, 255, 255, 0.03); border-radius: 8px;
}
.empty-ai { text-align: center; padding: 40px 16px; }
.empty-ai p { margin: 0 0 12px; }

.evidence-panel { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.evidence-basis, .evidence-ref, .evidence-block { background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.18); border-radius: 10px; padding: 12px 14px; }
.evidence-text { margin: 6px 0 0 0; color: #334155; line-height: 1.8; font-size: 13px; }
.evidence-link { color: #059669; font-weight: 600; text-decoration: none; margin-left: 6px; }
.evidence-link:hover { text-decoration: underline; }
.risk-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.risk-tag { background: #fff; border: 1px solid #e2e8f0; color: #475569; padding: 3px 10px; border-radius: 999px; font-size: 12px; }

.ai-structured { display: flex; flex-direction: column; gap: 12px; padding: 4px 0; }
.ai-block { background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.16); border-radius: 10px; padding: 12px 14px; }
.ai-block-title { font-weight: 700; color: #059669; font-size: 14px; margin-bottom: 6px; }
.ai-text { margin: 4px 0 0 0; color: #334155; line-height: 1.75; font-size: 13px; }
.ai-list { margin: 0; padding-left: 18px; line-height: 1.9; color: #334155; font-size: 13px; }
.ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ai-risk { border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 8px; }
.ai-risk:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.ai-risk-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ai-risk-name { font-weight: 600; color: #1f2937; }
.ai-tag-ok { color: #059669; font-weight: 600; margin-right: 2px; }
.ai-tag-no { color: #ef4444; font-weight: 600; margin-right: 2px; }
.ai-reason { color: #94a3b8; }
.ai-merge { line-height: 1.7; color: #334155; font-size: 13px; }
.ai-followup { border-left: 3px solid #059669; }

.home-care-archive { margin-top: 16px; padding-top: 14px; border-top: 2px solid #059669; background: rgba(16, 185, 129, 0.04); border-radius: 10px; padding: 14px 16px; }
.home-care-archive .ai-block-title { font-size: 15px; }
.archive-intro { color: #64748b; font-size: 12px; margin: 6px 0 10px 0; }
.archive-text { color: #1f2937; line-height: 1.9; font-size: 13px; background: rgba(255, 255, 255, 0.5); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #059669; }

.ai-failed { background: rgba(245, 158, 11, 0.06); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 10px; padding: 14px 16px; }
.ai-failed .ai-block-title { color: #b45309; font-size: 14px; font-weight: 700; margin-bottom: 0; }

.suggestions, .warnings { padding: 0; list-style: none; }
.suggestions li, .warnings li {
  padding: 12px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.03);
  border-radius: 8px; font-size: 13px; line-height: 1.6;
}
.warnings li { color: #fca5a5; border-left: 3px solid #ef4444; }

.text-success { color: #059669; }
.text-warning { color: #f59e0b; }
.text-danger { color: #ef4444; }
.text-tertiary { color: var(--text-tertiary); }
.empty-state-card {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 24px; text-align: center;
  border: 2px dashed var(--border-color, rgba(5,150,105,0.2));
}
.empty-state-card .empty-icon { font-size: 48px; color: var(--text-tertiary); margin-bottom: 16px; }
.empty-state-card .empty-title { font-size: 18px; font-weight: 600; margin: 0 0 8px; color: var(--text-secondary); }
.empty-state-card .empty-hint { font-size: 14px; color: var(--text-tertiary); margin: 0; }
.empty-state-card.privacy-prompt .empty-icon { color: #059669; }
.empty-state-card.privacy-prompt .empty-title { color: #059669; }
</style>


