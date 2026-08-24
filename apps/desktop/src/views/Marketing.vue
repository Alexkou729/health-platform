<template>
  <div class="page">
    <div class="page-header">
      <h2>营销中心 · 优惠券</h2>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>创建优惠券</el-button>
    </div>

    <div class="glass-card list-card">
      <el-table :data="coupons" stripe>
        <el-table-column prop="name" label="券名称" min-width="140" />
        <el-table-column label="类型" width="90"><template #default="{ row }">{{ row.type === 'PERCENTAGE' ? '折扣' : '满减' }}</template></el-table-column>
        <el-table-column label="面值" width="100"><template #default="{ row }">{{ row.type === 'PERCENTAGE' ? row.value + '%' : '¥' + row.value }}</template></el-table-column>
        <el-table-column prop="minSpend" label="门槛" width="90"><template #default="{ row }">¥{{ row.minSpend }}</template></el-table-column>
        <el-table-column label="已发/总量" width="110"><template #default="{ row }">{{ row.usedQuantity }} / {{ row.totalQuantity }}</template></el-table-column>
        <el-table-column label="有效期" min-width="170"><template #default="{ row }">{{ fmt(row.validFrom) }} ~ {{ fmt(row.validTo) }}</template></el-table-column>
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }"><el-button text type="primary" size="small" @click="openIssue(row)">发券</el-button></template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="showCreate" title="创建优惠券" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="券名称" required><el-input v-model="form.name" placeholder="例如：新客立减券" /></el-form-item>
        <el-form-item label="类型"><el-radio-group v-model="form.type"><el-radio value="AMOUNT">满减券</el-radio><el-radio value="PERCENTAGE">折扣券</el-radio></el-radio-group></el-form-item>
        <el-form-item :label="form.type === 'AMOUNT' ? '面值(元)' : '折扣(%)'"><el-input-number v-model="form.value" :min="0" :max="form.type === 'AMOUNT' ? 10000 : 90" /></el-form-item>
        <el-form-item label="满减门槛"><el-input-number v-model="form.minSpend" :min="0" :step="10" /></el-form-item>
        <el-form-item label="发放总量"><el-input-number v-model="form.totalQuantity" :min="1" :step="100" /></el-form-item>
        <el-form-item label="有效期(天)"><el-input-number v-model="form.validDays" :min="1" :max="365" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showCreate=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveCoupon">创建</el-button></template>
    </el-dialog>

    <el-dialog v-model="showIssue" title="给客户发券" width="460px">
      <el-form label-width="80px">
        <el-form-item label="选择客户">
          <el-select v-model="issueCustomerId" filterable placeholder="选择客户" style="width:100%">
            <el-option v-for="c in customers" :key="c.id" :label="c.name + ' · ' + c.phone" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="showIssue=false">取消</el-button><el-button type="primary" :loading="saving" @click="doIssue">发放</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { couponApi, customerApi } from '@/api';

const coupons = ref<any[]>([]);
const customers = ref<any[]>([]);
const showCreate = ref(false);
const showIssue = ref(false);
const saving = ref(false);
const issueCustomerId = ref('');
const issueCoupon = ref<any>(null);
const form = reactive({ name: '', type: 'AMOUNT', value: 20, minSpend: 99, totalQuantity: 1000, validDays: 90 });

async function load() {
  try { coupons.value = (await couponApi.list()) as any[]; } catch (e: any) { console.error(e); }
}
async function loadCustomers() { try { customers.value = ((await customerApi.list({ pageSize: 200 })) as any).items || []; } catch (e) {} }
function openCreate() { showCreate.value = true; }
function openIssue(row: any) { issueCoupon.value = row; issueCustomerId.value = ''; showIssue.value = true; }
async function saveCoupon() {
  if (!form.name) { ElMessage.warning('请填写券名称'); return; }
  saving.value = true;
  try {
    const validTo = new Date(Date.now() + form.validDays * 24 * 60 * 60 * 1000);
    await couponApi.create({ name: form.name, type: form.type, value: form.value, minSpend: form.minSpend, totalQuantity: form.totalQuantity, validFrom: new Date(), validTo });
    ElMessage.success('优惠券已创建'); showCreate.value = false; load();
  } catch (e: any) { ElMessage.error(e.message); } finally { saving.value = false; }
}
async function doIssue() {
  if (!issueCustomerId.value) { ElMessage.warning('请选择客户'); return; }
  saving.value = true;
  try { await couponApi.issue(issueCoupon.value.id, issueCustomerId.value); ElMessage.success('已发放'); showIssue.value = false; load(); }
  catch (e: any) { ElMessage.error(e.message); } finally { saving.value = false; }
}
function fmt(d: any) { return d ? new Date(d).toLocaleDateString('zh-CN') : '-'; }
onMounted(() => { load(); loadCustomers(); });
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.list-card { flex: 1; overflow: hidden; }
</style>
