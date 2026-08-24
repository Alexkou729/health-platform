<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>服务申请</h2>
        <p class="text-secondary text-sm">向总部提交 AI 报告解读、调理方案、远程会诊等专业服务请求</p>
      </div>
      <el-button type="primary" @click="showDialog = true"><el-icon><Plus /></el-icon>发起申请</el-button>
    </div>

    <div class="summary-row">
      <div class="stat glass-card"><div class="num">{{ stats.pending }}</div><div class="lbl">待受理</div></div>
      <div class="stat glass-card"><div class="num">{{ stats.processing }}</div><div class="lbl">处理中</div></div>
      <div class="stat glass-card"><div class="num">{{ stats.completed }}</div><div class="lbl">已完成</div></div>
    </div>

    <div class="glass-card list-card">
      <el-table :data="items" :loading="loading" stripe>
        <el-table-column prop="requestNo" label="工单号" width="180" />
        <el-table-column prop="title" label="申请内容" min-width="180" />
        <el-table-column label="类型" width="140">
          <template #default="{ row }"><el-tag effect="plain">{{ typeLabel(row.type) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="金额" width="100">
          <template #default="{ row }">¥{{ row.totalAmount }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="结果" min-width="160">
          <template #default="{ row }">
            <span v-if="row.result" class="text-secondary">{{ resultBrief(row.result) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showDialog" title="发起服务申请" width="560px">
      <el-form :model="form" label-width="96px">
        <el-form-item label="服务类型">
          <el-radio-group v-model="form.type">
            <el-radio value="AI_REPORT">AI报告解读 ¥9.9</el-radio>
            <el-radio value="CARE_PLAN">调理方案 ¥99</el-radio>
            <el-radio value="CONSULTATION">远程会诊 ¥99</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="申请标题"><el-input v-model="form.title" placeholder="例如：张先生的阳虚体质调理方案" /></el-form-item>
        <el-form-item label="情况说明"><el-input v-model="form.description" type="textarea" :rows="3" placeholder="请描述客户情况和您的需求" /></el-form-item>
        <el-form-item label="关联客户">
          <el-select v-model="form.customerId" clearable filterable placeholder="选择客户（可选）" style="width:100%">
            <el-option v-for="c in customers" :key="c.id" :label="c.name + ' · ' + c.phone" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提交申请</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { franchiseApi, customerApi } from '@/api';

const items = ref<any[]>([]);
const customers = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const showDialog = ref(false);

const form = reactive({ type: 'AI_REPORT', title: '', description: '', customerId: '' });

const stats = computed(() => ({
  pending: items.value.filter(i => i.status === 'PENDING').length,
  processing: items.value.filter(i => i.status === 'PROCESSING').length,
  completed: items.value.filter(i => i.status === 'COMPLETED').length,
}));

async function load() {
  loading.value = true;
  try {
    const res: any = await franchiseApi.listRequests({ page: 1, pageSize: 100 });
    items.value = res.items || [];
  } catch (e: any) { ElMessage.error(e.message); }
  finally { loading.value = false; }
}

async function loadCustomers() {
  try {
    const res: any = await customerApi.list({ page: 1, pageSize: 100 });
    customers.value = res.items || [];
  } catch (e) {}
}

async function submit() {
  if (!form.title) { ElMessage.warning('请填写申请标题'); return; }
  saving.value = true;
  try {
    await franchiseApi.createRequest({ ...form, customerId: form.customerId || null });
    ElMessage.success('申请已提交，等待总部受理');
    showDialog.value = false;
    form.title = ''; form.description = ''; form.customerId = '';
    load();
  } catch (e: any) { ElMessage.error(e.message); }
  finally { saving.value = false; }
}

function typeLabel(t: string) { return ({ AI_REPORT: 'AI报告解读', CARE_PLAN: '调理方案', CONSULTATION: '远程会诊', DEVICE_SALE: '设备采购' } as any)[t] || t; }
function statusLabel(s: string) { return ({ PENDING: '待受理', PROCESSING: '处理中', COMPLETED: '已完成', REJECTED: '已驳回' } as any)[s] || s; }
function statusType(s: string) { return ({ PENDING: 'warning', PROCESSING: 'primary', COMPLETED: 'success', REJECTED: 'danger' } as any)[s] || 'info'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }
function resultBrief(r: any) {
  try { const o = typeof r === 'string' ? JSON.parse(r) : r; return o?.summary || o?.conclusion || o?.answer || JSON.stringify(o).slice(0, 60); }
  catch { return String(r).slice(0, 60); }
}

onMounted(() => { load(); loadCustomers(); });
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
.page-header h2 { margin: 0; font-size: 18px; }
.summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.stat { padding: 18px; text-align: center; }
.num { font-size: 28px; font-weight: 700; }
.lbl { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.list-card { flex: 1; overflow: hidden; }
</style>
