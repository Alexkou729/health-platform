<template>
  <div class="page">
    <div class="page-header">
      <h2>上门服务订单</h2>
      <el-button type="primary" @click="openService"><el-icon><Plus /></el-icon>新增服务项目</el-button>
    </div>
    <el-tabs v-model="tab">
      <el-tab-pane label="服务订单" name="orders">
        <div class="glass-card">
          <el-table :data="orders" stripe v-loading="loading">
            <el-table-column prop="orderNo" label="订单号" width="190" />
            <el-table-column prop="customer.name" label="客户" width="110" />
            <el-table-column prop="serviceName" label="服务" width="130" />
            <el-table-column prop="store.name" label="门店" width="120" />
            <el-table-column label="预约时间" width="150"><template #default="{ row }">{{ fmt(row.scheduledAt) }}</template></el-table-column>
            <el-table-column label="金额" width="90"><template #default="{ row }">¥{{ row.totalAmount }}</template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'PENDING'" text type="primary" size="small" @click="assign(row)">排单</el-button>
                <el-button v-if="row.status === 'ASSIGNED'" text type="primary" size="small" @click="accept(row)">接单</el-button>
                <el-button v-if="row.status === 'ACCEPTED'" text type="success" size="small" @click="start(row)">开始服务</el-button>
                <el-button v-if="row.status === 'SERVING'" text type="success" size="small" @click="complete(row)">完成</el-button>
                <el-button v-if="row.payStatus !== 'PAID' && ['COMPLETED','SERVING'].includes(row.status)" text type="warning" size="small" @click="pay(row)">收款</el-button>
                <el-button v-if="['PENDING','ASSIGNED','ACCEPTED'].includes(row.status)" text type="danger" size="small" @click="cancel(row)">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      <el-tab-pane label="服务项目" name="services">
        <div class="glass-card">
          <el-table :data="services" stripe>
            <el-table-column prop="name" label="服务名称" min-width="140" />
            <el-table-column label="分类" width="120"><template #default="{ row }">{{ svcCat(row.category) }}</template></el-table-column>
            <el-table-column label="价格" width="100"><template #default="{ row }">¥{{ row.price }}</template></el-table-column>
            <el-table-column prop="durationMin" label="时长(分)" width="90" />
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'">{{ row.status }}</el-tag></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showService" title="新增服务项目" width="480px">
      <el-form :model="svcForm" label-width="90px">
        <el-form-item label="服务名称" required><el-input v-model="svcForm.name" placeholder="例如：上门推拿理疗" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="svcForm.category" style="width:100%"><el-option label="上门理疗" value="THERAPY" /><el-option label="上门检测" value="DETECTION" /><el-option label="其他" value="OTHER" /></el-select></el-form-item>
        <div style="display:flex;gap:12px">
          <el-form-item label="价格" style="flex:1"><el-input-number v-model="svcForm.price" :min="0" :step="10" /></el-form-item>
          <el-form-item label="时长" style="flex:1"><el-input-number v-model="svcForm.durationMin" :min="10" :step="10" /></el-form-item>
        </div>
        <el-form-item label="描述"><el-input v-model="svcForm.description" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showService=false">取消</el-button><el-button type="primary" @click="saveService">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { homeServiceApi, storeApi } from '@/api';
const tab = ref('orders'); const orders = ref<any[]>([]); const services = ref<any[]>([]); const stores = ref<any[]>([]);
const loading = ref(false); const showService = ref(false);
const svcForm = reactive({ name: '', category: 'THERAPY', price: 199, durationMin: 60, description: '' });
async function load() { loading.value = true; try { const [o, s] = await Promise.all([homeServiceApi.orders({ page: 1, pageSize: 100 }), homeServiceApi.services()]); orders.value = (o as any).items || []; services.value = s as any[]; } finally { loading.value = false; } }
async function loadStores() { try { stores.value = (await storeApi.list()) as any[]; } catch (e: any) {} }
function openService() { showService.value = true; }
async function saveService() { if (!svcForm.name) { ElMessage.warning('请填写服务名称'); return; } try { await homeServiceApi.createService(svcForm); ElMessage.success('已新增'); showService.value = false; load(); } catch (e: any) { ElMessage.error(e.message); } }
async function assign(r: any) {
  try {
    const { value } = await ElMessageBox.prompt('输入门店 ID 或从列表选择', '排单', { inputValue: stores.value[0]?.id || '' });
    await homeServiceApi.assign(r.id, value); ElMessage.success('已排单'); load();
  } catch (e: any) {}
}
async function accept(r: any) { await homeServiceApi.accept(r.id); ElMessage.success('已接单'); load(); }
async function start(r: any) { await homeServiceApi.start(r.id); ElMessage.success('开始服务'); load(); }
async function complete(r: any) { await homeServiceApi.complete(r.id); ElMessage.success('已完成，生成结算'); load(); }
async function pay(r: any) { await homeServiceApi.pay(r.id, 'BANK'); ElMessage.success('已登记收款'); load(); }
async function cancel(r: any) { try { const { value } = await ElMessageBox.prompt('请输入取消原因', '取消订单'); await homeServiceApi.cancel(r.id, value); ElMessage.success('已取消'); load(); } catch (e: any) {} }
function fmt(d: any) { return d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-'; }
function statusLabel(s: string) { return ({ PENDING: '待排单', ASSIGNED: '已派单', ACCEPTED: '已接单', SERVING: '服务中', COMPLETED: '已完成', CANCELLED: '已取消' } as any)[s] || s; }
function statusType(s: string) { return ({ PENDING: 'warning', ASSIGNED: 'primary', ACCEPTED: 'primary', SERVING: 'success', COMPLETED: 'success', CANCELLED: 'danger' } as any)[s] || 'info'; }
function svcCat(c: string) { return ({ THERAPY: '上门理疗', DETECTION: '上门检测', OTHER: '其他' } as any)[c] || c; }
onMounted(() => { load(); loadStores(); });
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
</style>
