<template>
  <div class="page">
    <div class="page-header">
      <h2>门店管理</h2>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>增加门店</el-button>
    </div>

    <div class="stores-grid">
      <div v-for="s in items" :key="s.id" class="store-card glass-card">
        <div class="store-icon"><el-icon :size="24"><OfficeBuilding /></el-icon></div>
        <div class="store-head">
          <div class="store-name">{{ s.name }}</div>
          <el-tag size="small" :type="s.status === 'ACTIVE' ? 'success' : 'info'">{{ s.status }}</el-tag>
        </div>
        <div class="store-code">{{ s.code }}</div>
        <div class="store-info">
          <div><el-icon><Location /></el-icon> {{ s.address || '-' }}</div>
          <div><el-icon><User /></el-icon> 联系人：{{ s.contactName || s.manager || '-' }}</div>
          <div><el-icon><Phone /></el-icon> {{ s.contactPhone || s.phone || '-' }}</div>
          <div><el-icon><Document /></el-icon> 执照：{{ s.businessLicense || '未填写' }}</div>
          <div><el-icon><Clock /></el-icon> {{ s.openHours || '-' }}</div>
        </div>
        <div class="store-stats">
          <div class="ss-item"><div class="ss-num">{{ s._count?.customers || 0 }}</div><div class="ss-label">客户</div></div>
          <div class="ss-item"><div class="ss-num">{{ s._count?.staff || 0 }}</div><div class="ss-label">员工</div></div>
          <div class="ss-item"><div class="ss-num">{{ s._count?.devices || 0 }}</div><div class="ss-label">设备</div></div>
          <div class="ss-item"><div class="ss-num">{{ s._count?.orders || 0 }}</div><div class="ss-label">订单</div></div>
        </div>
        <div class="store-actions">
          <el-button text type="primary" size="small" @click="openEdit(s)"><el-icon><Edit /></el-icon>编辑</el-button>
          <el-button v-if="s.status === 'ACTIVE'" text type="danger" size="small" @click="disable(s)"><el-icon><CircleClose /></el-icon>停用</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="showDialog" :title="form.id ? '编辑门店' : '增加门店'" width="680px" top="6vh">
      <el-form :model="form" label-width="100px" label-position="top">
        <div class="form-row">
          <el-form-item label="门店名称" required><el-input v-model="form.name" placeholder="例如：XX养生馆" /></el-form-item>
          <el-form-item label="门店编码"><el-input v-model="form.code" placeholder="唯一编码，留空自动生成" /></el-form-item>
        </div>
        <el-form-item label="门店地址"><el-input v-model="form.address" placeholder="详细地址" /></el-form-item>
        <div class="form-row">
          <el-form-item label="所在省份"><el-input v-model="form.province" placeholder="省" /></el-form-item>
          <el-form-item label="所在城市"><el-input v-model="form.city" placeholder="市" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="营业执照号"><el-input v-model="form.businessLicense" placeholder="统一社会信用代码" /></el-form-item>
          <el-form-item label="营业执照照片"><el-input v-model="form.businessLicenseUrl" placeholder="图片 URL（可先留空）" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="联系人"><el-input v-model="form.contactName" placeholder="法人/负责人" /></el-form-item>
          <el-form-item label="联系电话"><el-input v-model="form.contactPhone" placeholder="手机号" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="门店电话"><el-input v-model="form.phone" placeholder="座机/门店电话" /></el-form-item>
          <el-form-item label="营业时间"><el-input v-model="form.openHours" placeholder="09:00-21:00" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="订阅套餐">
            <el-select v-model="form.subscriptionPlan" style="width:100%">
              <el-option label="免费 FREE" value="FREE" /><el-option label="基础 BASIC" value="BASIC" />
              <el-option label="专业 PRO" value="PRO" /><el-option label="旗舰 FLAGSHIP" value="FLAGSHIP" />
            </el-select>
          </el-form-item>
          <el-form-item label="备注"><el-input v-model="form.remark" placeholder="备注" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ form.id ? '保存修改' : '创建门店' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { OfficeBuilding, Location, User, Phone, Clock, Document, Plus, Edit, CircleClose } from '@element-plus/icons-vue';
import { storeApi } from '@/api';

const items = ref<any[]>([]);
const showDialog = ref(false);
const saving = ref(false);
const form = reactive<any>({ id: '', name: '', code: '', address: '', province: '', city: '', businessLicense: '', businessLicenseUrl: '', contactName: '', contactPhone: '', phone: '', openHours: '', subscriptionPlan: 'FREE', remark: '' });

async function loadList() {
  try { items.value = (await storeApi.list()) as any[]; } catch (e: any) { console.error(e); }
}

function resetForm() {
  Object.assign(form, { id: '', name: '', code: '', address: '', province: '', city: '', businessLicense: '', businessLicenseUrl: '', contactName: '', contactPhone: '', phone: '', openHours: '', subscriptionPlan: 'FREE', remark: '' });
}

function openCreate() { resetForm(); showDialog.value = true; }
function openEdit(s: any) { Object.assign(form, { id: s.id, name: s.name, code: s.code, address: s.address, province: s.province, city: s.city, businessLicense: s.businessLicense, businessLicenseUrl: s.businessLicenseUrl, contactName: s.contactName, contactPhone: s.contactPhone, phone: s.phone, openHours: s.openHours, subscriptionPlan: s.subscriptionPlan, remark: s.remark }); showDialog.value = true; }

async function save() {
  if (!form.name) { ElMessage.warning('请填写门店名称'); return; }
  saving.value = true;
  try {
    const payload: any = { ...form };
    if (!payload.code) delete payload.code;
    if (form.id) { await storeApi.update(form.id, payload); ElMessage.success('门店已更新'); }
    else { await storeApi.create(payload); ElMessage.success('门店已创建'); }
    showDialog.value = false; loadList();
  } catch (e: any) { ElMessage.error(e.message || '操作失败'); }
  finally { saving.value = false; }
}

async function disable(s: any) {
  try {
    await ElMessageBox.confirm('确定停用门店「' + s.name + '」吗？', '提示', { type: 'warning' });
    await storeApi.remove(s.id);
    ElMessage.success('已停用'); loadList();
  } catch (e: any) {}
}

onMounted(loadList);
</script>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.stores-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; overflow-y: auto; }
.store-card { padding: 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.store-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 60px; background: var(--gradient-primary); opacity: 0.15; }
.store-icon { width: 52px; height: 52px; border-radius: 13px; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 12px; position: relative; z-index: 1; }
.store-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.store-name { font-size: 17px; font-weight: 600; position: relative; z-index: 1; }
.store-code { font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px; }
.store-info { display: flex; flex-direction: column; gap: 6px; padding: 12px 0; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; flex: 1; }
.store-info > div { display: flex; align-items: center; gap: 8px; }
.store-info .el-icon { color: var(--primary-light); }
.store-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.ss-item { text-align: center; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; }
.ss-num { font-size: 18px; font-weight: 700; }
.ss-label { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.store-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 10px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
</style>
