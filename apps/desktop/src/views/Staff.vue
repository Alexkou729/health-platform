<template>
<div class="page"><div class="page-header"><h2>员工管理</h2></div>
<div class="glass-card" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
<div style="padding:12px;display:flex;gap:8px">
<el-input v-model="filters.keyword" placeholder="搜索姓名/用户名" style="width:240px" clearable @change="loadList"><template #prefix><el-icon><Search/></el-icon></template></el-input>
<el-select v-model="filters.role" placeholder="角色" clearable style="width:140px" @change="loadList">
<el-option label="超级管理员" value="SUPER_ADMIN"/><el-option label="店长" value="STORE_ADMIN"/><el-option label="医师" value="DOCTOR"/><el-option label="健康顾问" value="CONSULTANT"/><el-option label="前台" value="RECEPTIONIST"/>
</el-select>
<el-button type="primary" @click="showDialog=true"><el-icon><Plus/></el-icon>新增员工</el-button>
</div>
<el-table :data="items" style="flex:1" stripe v-loading="loading">
<el-table-column type="index" label="#" width="60"/>
<el-table-column prop="name" label="姓名" width="100"/>
<el-table-column prop="username" label="用户名" width="120"/>
<el-table-column prop="phone" label="手机号" width="140"/>
<el-table-column label="角色" width="120"><template #default="{row}"><el-tag size="small">{{roleLabel(row.role)}}</el-tag></template></el-table-column>
<el-table-column label="门店" width="120"><template #default="{row}">{{row.store?.name||'-'}}</template></el-table-column>
<el-table-column label="提成比例" width="100"><template #default="{row}">{{((row.commissionRate||0)*100).toFixed(0)}}%</template></el-table-column>
<el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.status==='ACTIVE'?'success':'info'" size="small">{{row.status==='ACTIVE'?'在职':'离职'}}</el-tag></template></el-table-column>
<el-table-column label="操作" width="220" fixed="right">
<template #default="{row}">
<el-button text type="primary" size="small" @click="editStaff(row)">编辑</el-button>
<el-button text type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
<el-button text type="success" size="small" @click="openPerm(row)">权限</el-button>
</template></el-table-column>
</el-table></div>
<el-dialog v-model="showDialog" :title="editing?'编辑员工':'新增员工'" width="500px">
<el-form :model="form" label-width="100px">
<el-form-item label="姓名" required><el-input v-model="form.name"/></el-form-item>
<el-form-item label="用户名" required><el-input v-model="form.username" :disabled="editing"/></el-form-item>
<el-form-item label="密码" v-if="!editing"><el-input v-model="form.password" type="password" show-password/></el-form-item>
<el-form-item label="手机号"><el-input v-model="form.phone"/></el-form-item>
<el-form-item label="角色"><el-select v-model="form.role" style="width:100%">
<el-option label="超级管理员" value="SUPER_ADMIN"/><el-option label="店长" value="STORE_ADMIN"/><el-option label="医师" value="DOCTOR"/><el-option label="健康顾问" value="CONSULTANT"/><el-option label="前台" value="RECEPTIONIST"/>
</el-select></el-form-item>
<el-form-item label="提成比例"><el-slider v-model="form.commissionRate" :min="0" :max="0.5" :step="0.01" :format-value="v=>(v*100).toFixed(0)+'%'"/></el-form-item>
</el-form>
<template #footer><el-button @click="showDialog=false">取消</el-button><el-button type="primary" @click="submitForm">保存</el-button></template>
</el-dialog>
<el-dialog v-model="showPermDialog" :title="'设置权限 - ' + (permStaff?.name || '')" width="560px">
  <el-alert type="info" :closable="false" show-icon title="留空表示按角色默认权限；勾选后该员工仅显示并操作以下功能" style="margin-bottom:16px" />
  <el-checkbox-group v-model="permForm.permissions" style="display:flex;flex-wrap:wrap;gap:8px">
    <el-checkbox v-for="p in permDefs" :key="p.code" :value="p.code" border style="margin:0;padding:8px 14px">{{ p.label }}</el-checkbox>
  </el-checkbox-group>
  <template #footer>
    <el-button @click="showPermDialog=false">取消</el-button>
    <el-button type="primary" @click="savePermissions">保存权限</el-button>
  </template>
</el-dialog>
</div></template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { staffApi, storeApi } from '@/api';
const items = ref<any[]>([]); const loading = ref(false); const showDialog = ref(false); const editing = ref(false);
const filters = reactive({ keyword:'', role:'' });
const form = reactive({ id:'', name:'', username:'', password:'', phone:'', role:'RECEPTIONIST', commissionRate:0.05, storeId:'', status:'ACTIVE' });
const showPermDialog = ref(false); const permStaff = ref<any>(null); const permForm = reactive({ permissions: [] as string[] });
const permDefs = [
  { code:'detection', label:'检测中心' }, { code:'reports', label:'报告中心' }, { code:'comparison', label:'历史对比' },
  { code:'customers', label:'客户管理' }, { code:'orders', label:'订单管理' }, { code:'packages', label:'套餐管理' },
  { code:'devices', label:'设备管理' }, { code:'staff', label:'员工管理' }, { code:'marketing', label:'营销中心' },
  { code:'wechat', label:'微信配置' }, { code:'care-plans', label:'调理方案' }, { code:'appointments', label:'预约管理' },
  { code:'tasks', label:'任务工作台' }, { code:'analytics', label:'运营报表' }, { code:'service-request', label:'服务申请' },
  { code:'franchise', label:'加盟管理' }, { code:'stores', label:'门店管理' }, { code:'settings', label:'系统设置' },
];
async function loadList(){ loading.value=true; try{ const res:any = await staffApi.list({pageSize:50, ...filters}); items.value = res.items||[]; } catch(e:any){ElMessage.error(e.message);} finally{loading.value=false;} }
function editStaff(row:any){ editing.value=true; Object.assign(form, row); showDialog.value=true; }
async function submitForm(){
  if(!form.name||!form.username){ElMessage.warning('请填写完整');return;}
  try { if(editing.value) await staffApi.update(form.id, form); else { const stores:any = await storeApi.list(); if(stores.length>0) form.storeId=stores[0].id; await staffApi.create(form); } ElMessage.success('保存成功'); showDialog.value=false; editing.value=false; loadList(); } catch(e:any){ElMessage.error(e.message);}
}
async function resetPassword(row:any){ await ElMessageBox.confirm('确定重置 "'+row.name+'" 的密码为 123456?','提示',{type:'warning'}); await staffApi.resetPassword(row.id,'123456'); ElMessage.success('密码已重置'); }
function openPerm(row:any){ permStaff.value = row; permForm.permissions = row.permissions || []; showPermDialog.value = true; }
async function savePermissions(){ try { await staffApi.updatePermissions(permStaff.value.id, permForm.permissions); ElMessage.success('权限已保存'); showPermDialog.value=false; loadList(); } catch(e:any){ ElMessage.error(e.message); } }
function roleLabel(r:string){return ({SUPER_ADMIN:'超级管理员',STORE_ADMIN:'店长',DOCTOR:'医师',CONSULTANT:'健康顾问',RECEPTIONIST:'前台'} as any)[r]||r;}
onMounted(loadList);
</script>
<style lang="scss" scoped>.page{display:flex;flex-direction:column;height:100%}.page-header{margin-bottom:16px}.page-header h2{margin:0;font-size:18px}</style>
