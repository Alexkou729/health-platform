<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>加盟管理</h2>
        <p class="text-secondary text-sm">总部总控台 · 服务工单 · 门店订阅 · 计费结算</p>
      </div>
      <el-button @click="load"><el-icon><Refresh /></el-icon>刷新</el-button>
    </div>

    <div class="kpi-grid">
      <div class="kpi glass-card"><div class="kpi-num">{{ dash.summary?.storeCount || 0 }}</div><div class="kpi-lbl">门店总数</div></div>
      <div class="kpi glass-card"><div class="kpi-num warn">{{ dash.summary?.pendingRequests || 0 }}</div><div class="kpi-lbl">待受理工单</div></div>
      <div class="kpi glass-card"><div class="kpi-num">{{ '¥' + (dash.summary?.aiRevenue || 0) }}</div><div class="kpi-lbl">AI 服务收入</div></div>
      <div class="kpi glass-card"><div class="kpi-num">{{ '¥' + (dash.summary?.invoiceRevenue || 0) }}</div><div class="kpi-lbl">账单总额</div></div>
    </div>

    <el-tabs v-model="tab" class="tabs">
      <el-tab-pane label="加盟申请" name="applications">
        <div class="glass-card">
          <el-table :data="applications" stripe>
            <el-table-column prop="storeName" label="申请门店" min-width="150" />
            <el-table-column prop="contactName" label="联系人" width="110" />
            <el-table-column prop="contactPhone" label="联系电话" width="140" />
            <el-table-column label="地区" width="140"><template #default="{ row }">{{ row.province }} {{ row.city }}</template></el-table-column>
            <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }"><el-tag :type="appStatusType(row.status)">{{ appStatusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="createdAt" label="提交时间" width="170"><template #default="{ row }">{{ formatDate(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'PENDING'" text type="primary" size="small" @click="approveApp(row)">通过开通</el-button>
                <el-button v-if="row.status === 'PENDING'" text type="danger" size="small" @click="rejectApp(row)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="服务工单" name="requests">
        <div class="glass-card">
          <el-table :data="requests" stripe>
            <el-table-column prop="requestNo" label="工单号" width="180" />
            <el-table-column prop="store.name" label="门店" width="140" />
            <el-table-column prop="title" label="申请内容" min-width="180" />
            <el-table-column label="类型" width="130">
              <template #default="{ row }"><el-tag effect="plain">{{ typeLabel(row.type) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="金额" width="90"><template #default="{ row }">¥{{ row.totalAmount }}</template></el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'PENDING'" text type="primary" size="small" @click="accept(row)">受理</el-button>
                <el-button v-if="row.status !== 'COMPLETED' && row.status !== 'REJECTED'" text type="success" size="small" @click="complete(row)">完成</el-button>
                <el-button v-if="row.status === 'PENDING' || row.status === 'PROCESSING'" text type="danger" size="small" @click="reject(row)">驳回</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="门店列表" name="stores">
        <div class="glass-card">
          <el-table :data="dash.stores || []" stripe>
            <el-table-column prop="name" label="门店" min-width="160" />
            <el-table-column prop="code" label="编码" width="100" />
            <el-table-column prop="subscriptionPlan" label="订阅" width="90" />
            <el-table-column prop="customers" label="客户" width="80" />
            <el-table-column prop="detections" label="检测" width="80" />
            <el-table-column prop="orders" label="订单" width="80" />
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status }}</el-tag></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="订阅管理" name="subs">
        <div class="glass-card" style="margin-bottom:16px">
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
            <el-select v-model="subForm.storeId" placeholder="选择门店" style="width:220px">
              <el-option v-for="s in dash.stores || []" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
            <el-select v-model="subForm.plan" placeholder="套餐" style="width:140px">
              <el-option label="FREE" value="FREE" /><el-option label="BASIC" value="BASIC" /><el-option label="PRO" value="PRO" /><el-option label="FLAGSHIP" value="FLAGSHIP" />
            </el-select>
            <el-input-number v-model="subForm.aiQuota" :min="0" placeholder="AI次数" />
            <el-input-number v-model="subForm.price" :min="0" :step="100" placeholder="价格" />
            <el-button type="primary" @click="createSub">开通订阅</el-button>
          </div>
        </div>
        <div class="glass-card">
          <el-table :data="subscriptions" stripe>
            <el-table-column prop="store.name" label="门店" width="160" />
            <el-table-column prop="plan" label="套餐" width="100" />
            <el-table-column prop="aiQuota" label="AI配额" width="90" />
            <el-table-column prop="aiUsed" label="已用" width="80" />
            <el-table-column prop="price" label="价格" width="100" />
            <el-table-column label="到期" min-width="160"><template #default="{ row }">{{ formatDate(row.endDate) }}</template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="账单/AI消费" name="billing">
        <div class="glass-card">
          <el-table :data="invoices" stripe>
            <el-table-column prop="invoiceNo" label="账单号" width="190" />
            <el-table-column prop="store.name" label="门店" width="150" />
            <el-table-column prop="type" label="类型" width="130" />
            <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ row.amount }}</template></el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'PAID' ? 'success' : 'warning'">{{ row.status }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120"><template #default="{ row }">
              <el-button v-if="row.status !== 'PAID'" text type="primary" size="small" @click="pay(row)">登记收款</el-button>
            </template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="AI接口配置" name="ai">
        <div class="glass-card" style="max-width:680px">
          <el-alert type="warning" :closable="false" show-icon title="此配置仅总部可见，门店无任何配置权限" style="margin-bottom:16px" />
          <el-form :model="aiForm" label-width="120px">
            <el-form-item label="AI 服务商">
              <el-select v-model="aiForm.provider" style="width:100%" @change="onProviderChange">
                <el-option v-for="p in (aiConfig.providers || [])" :key="p.code" :label="p.label" :value="p.code" />
              </el-select>
            </el-form-item>
            <el-form-item label="接口地址">
              <el-input v-model="aiForm.baseUrl" placeholder="https://api.ant-ling.com/v1" />
            </el-form-item>
            <el-form-item label="模型名称">
              <el-input v-model="aiForm.model" placeholder="Ling-max-2.0" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiForm.apiKey" type="password" show-password :placeholder="aiConfig.apiKeyMasked ? '已配置 ' + aiConfig.apiKeyMasked : '请输入 API Key'" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="aiSaving" @click="saveAiConfig">保存配置</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { franchiseApi } from '@/api';

const tab = ref('requests');
const dash = ref<any>({ summary: {}, stores: [], recentRequests: [] });
const requests = ref<any[]>([]);
const applications = ref<any[]>([]);
const subscriptions = ref<any[]>([]);
const invoices = ref<any[]>([]);
const aiConfig = ref<any>({ configured: false, apiKeyMasked: '' });
const aiForm = reactive({ provider: 'ant-ling', baseUrl: '', model: '', apiKey: '' });
const aiSaving = ref(false);
const subForm = reactive({ storeId: '', plan: 'BASIC', aiQuota: 50, price: 299 });

async function load() {
  try {
    const [d, r, s, i, ac, apps] = await Promise.all([
      franchiseApi.dashboard(),
      franchiseApi.listRequests({ page: 1, pageSize: 100 }),
      franchiseApi.subscriptions(),
      franchiseApi.invoices(),
      franchiseApi.getAiConfig(),
      franchiseApi.listApplications(),
    ]);
    dash.value = d as any;
    requests.value = (r as any).items || [];
    subscriptions.value = (s as any) || [];
    invoices.value = (i as any) || [];
    aiConfig.value = ac as any;
    applications.value = (apps as any) || [];
    aiForm.provider = aiConfig.value.provider || 'ant-ling';
    aiForm.baseUrl = aiConfig.value.baseUrl || '';
    aiForm.model = aiConfig.value.model || '';
    aiForm.apiKey = '';
  } catch (e: any) { ElMessage.error(e.message); }
}

function onProviderChange(code: string) {
  const p = (aiConfig.value.providers || []).find((x: any) => x.code === code);
  if (p) { aiForm.baseUrl = p.baseUrl; aiForm.model = p.model; }
}

async function approveApp(row: any) {
  try {
    const res: any = await franchiseApi.approveApplication(row.id, {});
    const acc = res?.merchantAccount;
    await ElMessageBox.alert(
      '门店已开通：' + res?.store?.name + '，编码 ' + res?.store?.code +
      (acc ? '。商家账号：' + acc.username + ' / 密码：' + acc.password : ''),
      '开通成功', { confirmButtonText: '知道了' }
    );
    load();
  } catch (e: any) { ElMessage.error(e.message); }
}

async function rejectApp(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回加盟申请', { inputValue: '条件不符合' });
    await franchiseApi.rejectApplication(row.id, value || undefined);
    ElMessage.success('已驳回'); load();
  } catch (e: any) {}
}

async function accept(row: any) { try { await franchiseApi.acceptRequest(row.id); ElMessage.success('已受理'); load(); } catch (e: any) { ElMessage.error(e.message); } }
async function reject(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回工单', { inputValue: '总部已驳回' });
    await franchiseApi.rejectRequest(row.id, value || undefined);
    ElMessage.success('已驳回'); load();
  } catch (e: any) {}
}
async function complete(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请填写处理结果摘要', '完成工单', { inputValue: '已完成处理' });
    await franchiseApi.completeRequest(row.id, { summary: value });
    ElMessage.success('已完成并生成账单'); load();
  } catch (e: any) {}
}
async function createSub() {
  if (!subForm.storeId) { ElMessage.warning('请选择门店'); return; }
  try { await franchiseApi.createSubscription(subForm); ElMessage.success('订阅已开通'); load(); } catch (e: any) { ElMessage.error(e.message); }
}
async function pay(row: any) {
  try { await franchiseApi.payInvoice(row.id, 'BANK'); ElMessage.success('已登记收款'); load(); } catch (e: any) { ElMessage.error(e.message); }
}
async function saveAiConfig() {
  aiSaving.value = true;
  try {
    await franchiseApi.setAiConfig(aiForm);
    ElMessage.success('AI 接口配置已保存');
    aiForm.apiKey = '';
    load();
  } catch (e: any) { ElMessage.error(e.message); }
  finally { aiSaving.value = false; }
}

function typeLabel(t: string) { return ({ AI_REPORT: 'AI报告解读', CARE_PLAN: '调理方案', CONSULTATION: '远程会诊', DEVICE_SALE: '设备采购' } as any)[t] || t; }
function statusLabel(s: string) { return ({ PENDING: '待受理', PROCESSING: '处理中', COMPLETED: '已完成', REJECTED: '已驳回' } as any)[s] || s; }
function statusType(s: string) { return ({ PENDING: 'warning', PROCESSING: 'primary', COMPLETED: 'success', REJECTED: 'danger' } as any)[s] || 'info'; }
function appStatusLabel(s: string) { return ({ PENDING: '待审批', APPROVED: '已开通', REJECTED: '已驳回' } as any)[s] || s; }
function appStatusType(s: string) { return ({ PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' } as any)[s] || 'info'; }
function formatDate(d: string) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }

onMounted(load);
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.kpi { padding: 18px; }
.kpi-num { font-size: 26px; font-weight: 700; }
.kpi-num.warn { color: #f59e0b; }
.kpi-lbl { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.tabs { flex: 1; overflow: hidden; }
</style>
