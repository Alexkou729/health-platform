<template>
<div class="page"><div class="page-header"><h2>调理方案</h2><el-button type="primary" @click="showCreate=true"><el-icon><Plus/></el-icon>新建方案</el-button></div>
<el-tabs v-model="activeTab">
<el-tab-pane label="全部" name="all"></el-tab-pane>
<el-tab-pane label="草稿" name="DRAFT"></el-tab-pane>
<el-tab-pane label="进行中" name="ACTIVE"></el-tab-pane>
<el-tab-pane label="已完成" name="COMPLETED"></el-tab-pane>
</el-tabs>
<div class="plans-grid">
<div v-for="p in filteredItems" :key="p.id" class="plan-card glass-card" @click="viewPlan(p)">
<div class="card-header">
<div class="title-area"><div class="plan-title">{{ p.title }}</div><div class="customer-name">{{ p.customer?.name }} · {{ p.customer?.phone }}</div></div>
<el-tag :type="statusType(p.status)" effect="dark">{{ statusLabel(p.status) }}</el-tag>
</div>
<div class="constitution" v-if="p.constitution"><span class="ck">体质:</span><span class="cv">{{ getConstitution(p.constitution) }}</span></div>
<div class="plan-summary" v-if="p.summary">{{ p.summary }}</div>
<div class="items">
<div v-for="i in (p.items||[]).slice(0,3)" :key="i.id" class="item-row"><span>{{ i.name }}</span><span class="item-price">¥{{ i.price }}</span></div>
<div v-if="(p.items||[]).length > 3" class="more">还有 {{ p.items.length - 3 }} 项...</div>
</div>
<div class="card-footer">
<span class="price-label">总价</span>
<span class="price-value">¥{{ p.totalPrice || 0 }}</span>
<span class="date">{{ formatDate(p.createdAt) }}</span>
</div>
</div>
</div>
<div v-if="filteredItems.length === 0" class="empty glass-card">
<el-icon :size="64" color="#64748b"><Document/></el-icon>
<p>暂无方案</p>
</div>
<el-dialog v-model="showCreate" title="创建调理方案" width="700px">
<el-form :model="newPlan" label-width="100px">
<el-form-item label="客户"><el-select v-model="newPlan.customerId" filterable style="width:100%"><el-option v-for="c in customers" :key="c.id" :label="c.name + ' (' + c.phone + ')'" :value="c.id"/></el-select></el-form-item>
<el-form-item label="方案标题"><el-input v-model="newPlan.title" placeholder="例: 张三的阳虚体质调理方案" /></el-form-item>
<el-form-item label="中医辨证"><el-input v-model="newPlan.diagnosis" type="textarea" :rows="2" placeholder="中医辨证分析..." /></el-form-item>
<el-form-item label="调理项目"><el-button @click="addItem" type="primary" plain size="small"><el-icon><Plus/></el-icon>添加项目</el-button>
<div v-for="(item, idx) in newPlan.items" :key="idx" class="item-edit">
<el-input v-model="item.name" placeholder="项目名" style="width:30%" />
<el-input-number v-model="item.price" :min="0" :step="10" placeholder="价格" controls-position="right" />
<el-button @click="newPlan.items.splice(idx,1)" type="danger" text size="small">删除</el-button>
</div></el-form-item>
</el-form>
<template #footer><el-button @click="showCreate=false">取消</el-button><el-button type="primary" @click="createPlan">创建</el-button></template>
</el-dialog>
<el-drawer v-model="detailDrawer" :title="currentPlan?.title" size="60%">
<div v-if="currentPlan" class="plan-detail">
<div class="detail-section"><h3>基本信息</h3><el-descriptions :column="2" border>
<el-descriptions-item label="客户">{{ currentPlan.customer?.name }}</el-descriptions-item>
<el-descriptions-item label="体质">{{ getConstitution(currentPlan.constitution) }}</el-descriptions-item>
<el-descriptions-item label="状态">{{ statusLabel(currentPlan.status) }}</el-descriptions-item>
<el-descriptions-item label="总价">¥{{ currentPlan.totalPrice }}</el-descriptions-item>
<el-descriptions-item label="开始">{{ formatDate(currentPlan.startDate) }}</el-descriptions-item>
<el-descriptions-item label="结束">{{ formatDate(currentPlan.endDate) }}</el-descriptions-item>
</el-descriptions></div>
<div v-if="currentPlan.diagnosis" class="detail-section"><h3>中医辨证</h3><p>{{ currentPlan.diagnosis }}</p></div>
<div v-if="currentPlan.summary" class="detail-section"><h3>方案摘要</h3><p>{{ currentPlan.summary }}</p></div>
<div v-if="currentPlan.advice" class="detail-section"><h3>医嘱建议</h3><pre class="advice">{{ formatAdvice(currentPlan.advice) }}</pre></div>
<div class="detail-section"><h3>调理项目 ({{ currentPlan.items?.length || 0 }} 项)</h3>
<table class="recipe-table"><thead><tr><th>项目</th><th>频次</th><th>时长</th><th>价格</th><th>数量</th></tr></thead>
<tbody><tr v-for="i in currentPlan.items||[]" :key="i.id"><td>{{ i.name }}</td><td>{{ i.frequency }}</td><td>{{ i.duration }}分钟</td><td>¥{{ i.price }}</td><td>{{ i.quantity }}</td></tr></tbody></table></div>
</div>
</el-drawer>
</div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { planApi, customerApi } from '@/api';

const items = ref<any[]>([]);
const customers = ref<any[]>([]);
const activeTab = ref('all');
const showCreate = ref(false);
const detailDrawer = ref(false);
const currentPlan = ref<any>(null);
const newPlan = ref({ customerId: '', title: '', diagnosis: '', items: [{ name: '', price: 100 }] });

const filteredItems = computed(() => activeTab.value === 'all' ? items.value : items.value.filter(p => p.status === activeTab.value));

function statusLabel(s) { return ({ DRAFT: '草稿', ACTIVE: '进行中', PAUSED: '已暂停', COMPLETED: '已完成', CANCELLED: '已取消' }[s] || s); }
function statusType(s) { return ({ DRAFT: 'info', ACTIVE: 'success', PAUSED: 'warning', COMPLETED: 'primary', CANCELLED: 'danger' }[s] || ''); }
function getConstitution(c) { return ({ BALANCED: '平和', QI_DEFICIENCY: '气虚', YANG_DEFICIENCY: '阳虚', YIN_DEFICIENCY: '阴虚', PHLEGM_DAMPNESS: '痰湿', DAMPNESS_HEAT: '湿热', BLOOD_STASIS: '血瘀', QI_STAGNATION: '气郁', SPECIAL: '特禀' }[c] || '未分类'); }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
function formatAdvice(a) { if (!a) return ''; if (typeof a === 'string') try { return Object.values(JSON.parse(a)).filter(Boolean).join('\n'); } catch { return a; } return Object.values(a).filter(Boolean).join('\n'); }

async function loadList() { try { const res = await planApi.list({ pageSize: 50 }); items.value = res.items || []; } catch (e) {} }
async function loadCustomers() { try { const res = await customerApi.list({ pageSize: 200 }); customers.value = res.items || []; } catch (e) {} }
function addItem() { newPlan.value.items.push({ name: '', price: 100, frequency: '1次/周', duration: 30, quantity: 1 }); }
async function createPlan() {
  if (!newPlan.value.customerId || !newPlan.value.title) { ElMessage.warning('请填写客户和方案标题'); return; }
  const validItems = newPlan.value.items.filter(i => i.name);
  if (validItems.length === 0) { ElMessage.warning('请填写项目名称'); return; }
  try {
    const totalPrice = validItems.reduce((s, i) => s + (i.price || 0), 0);
    const customer = customers.value.find(c => c.id === newPlan.value.customerId);
    await planApi.create({
      customerId: newPlan.value.customerId,
      storeId: customer?.storeId || '',
      staffId: localStorage.getItem('staff_id'),
      title: newPlan.value.title,
      diagnosis: newPlan.value.diagnosis,
      constitution: Array.isArray(customer?.tags) ? customer.tags[0] : 'BALANCED',
      summary: newPlan.value.diagnosis,
      items: validItems,
      totalPrice,
    });
    ElMessage.success('方案创建成功');
    showCreate.value = false;
    newPlan.value = { customerId: '', title: '', diagnosis: '', items: [{ name: '', price: 100 }] };
    loadList();
  } catch (e: any) { ElMessage.error(e.message); }
}

function viewPlan(p) { currentPlan.value = p; detailDrawer.value = true; }

onMounted(() => { loadList(); loadCustomers(); });
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.page-header h2{margin:0;font-size:18px}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px;overflow-y:auto;flex:1}
.plan-card{padding:16px;cursor:pointer;transition:all 0.3s}
.plan-card:hover{transform:translateY(-2px);border-color:var(--border-hover)}
.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
.title-area{flex:1}
.plan-title{font-size:16px;font-weight:600;margin-bottom:4px}
.customer-name{font-size:12px;color:var(--text-tertiary)}
.constitution{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:rgba(102,126,234,0.15);border-radius:6px;margin-bottom:8px}
.ck{color:#64748b;font-size:11px}
.cv{color:#34d399;font-size:12px;font-weight:500}
.plan-summary{font-size:12px;color:var(--text-tertiary);margin-bottom:8px;line-height:1.5}
.items{margin:8px 0;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px}
.item-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
.item-price{color:#fbbf24;font-weight:600}
.more{font-size:11px;color:var(--text-muted);margin-top:4px;text-align:center}
.card-footer{display:flex;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--border-light);margin-top:8px}
.price-label{font-size:11px;color:var(--text-tertiary)}
.price-value{font-size:18px;font-weight:700;color:#059669;flex:1}
.date{font-size:11px;color:var(--text-muted)}
.empty{padding:60px 20px;text-align:center;color:var(--text-tertiary)}
.item-edit{display:flex;gap:8px;align-items:center;margin:6px 0}
.detail-section{margin-bottom:20px}
.detail-section h3{font-size:15px;margin-bottom:12px;color:var(--text-primary)}
.detail-section p,.detail-section pre{color:var(--text-secondary);font-size:14px;line-height:1.7}
.advice{white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:12px;border-radius:8px;font-family:inherit}
.recipe-table{width:100%;border-collapse:collapse;font-size:13px}
.recipe-table th,.recipe-table td{padding:10px;text-align:left;border-bottom:1px solid var(--border-light)}
.recipe-table th{background:rgba(102,126,234,0.1);color:var(--text-secondary)}
</style>
