<template>
<div class="page">
<div class="page-header"><h2>套餐管理</h2><el-button type="primary" @click="showDialog=true"><el-icon><Plus/></el-icon>新增套餐</el-button></div>
<div class="packages-grid">
<div v-for="p in items" :key="p.id" class="package-card glass-card" @click="editPackage(p)">
<div class="card-tag" :class="`tag-${p.type}`">{{typeLabel(p.type)}}</div>
<div class="card-name">{{p.name}}</div>
<div class="card-price"><span class="currency">¥</span><span class="amount">{{p.price}}</span><span v-if="p.originalPrice>p.price" class="original">¥{{p.originalPrice}}</span></div>
<div class="card-desc">{{p.description}}</div>
<div class="card-features">
<div class="feature"><el-icon><Aim/></el-icon>{{p.totalTimes}} 次检测</div>
<div class="feature"><el-icon><Clock/></el-icon>{{p.validityDays}} 天有效</div>
</div>
<div class="card-footer"><el-tag size="small" :type="p.status==='ACTIVE'?'success':'info'">{{p.status==='ACTIVE'?'在售':'下架'}}</el-tag><span class="text-xs text-tertiary">已售 {{p.salesCount||0}}</span></div>
</div>
</div>
<el-dialog v-model="showDialog" :title="editing?'编辑套餐':'新增套餐'" width="600px">
<el-form :model="form" label-width="100px">
<el-form-item label="套餐名称" required><el-input v-model="form.name"/></el-form-item>
<el-form-item label="套餐类型"><el-select v-model="form.type" style="width:100%"><el-option label="单次检测" value="SINGLE"/><el-option label="多次套餐" value="TIMES"/><el-option label="调理套餐" value="TREATMENT"/><el-option label="年卡" value="ANNUAL"/></el-select></el-form-item>
<el-row :gutter="20"><el-col :span="12"><el-form-item label="售价"><el-input-number v-model="form.price" :min="0" :step="0.01" style="width:100%"/></el-form-item></el-col><el-col :span="12"><el-form-item label="原价"><el-input-number v-model="form.originalPrice" :min="0" :step="0.01" style="width:100%"/></el-form-item></el-col></el-row>
<el-row :gutter="20"><el-col :span="12"><el-form-item label="次数"><el-input-number v-model="form.totalTimes" :min="1" style="width:100%"/></el-form-item></el-col><el-col :span="12"><el-form-item label="有效天数"><el-input-number v-model="form.validityDays" :min="1" style="width:100%"/></el-form-item></el-col></el-row>
<el-form-item label="套餐描述"><el-input v-model="form.description" type="textarea" :rows="2"/></el-form-item>
</el-form>
<template #footer><el-button @click="showDialog=false">取消</el-button><el-button type="primary" @click="submitForm">保存</el-button></template>
</el-dialog>
</div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { packageApi, storeApi } from '@/api';
const items = ref<any[]>([]); const showDialog = ref(false); const editing = ref(false);
const form = reactive({ id:'', name:'', code:'', type:'TIMES', price:99, originalPrice:199, totalTimes:1, validityDays:365, description:'', storeId:'', status:'ACTIVE' });
async function loadList(){
  try { const stores:any = await storeApi.list(); if(stores.length>0) form.storeId=stores[0].id; const res:any = await packageApi.list({pageSize:50}); items.value = res.items||[]; } catch(e:any){ElMessage.error(e.message);}
}
function editPackage(p:any){ editing.value=true; Object.assign(form, p); showDialog.value=true; }
async function submitForm(){
  if(!form.name){ElMessage.warning('请填写套餐名称');return;}
  try { if(!form.code) form.code = 'PKG-'+Date.now(); if(editing.value) await packageApi.update(form.id, form); else await packageApi.create(form); ElMessage.success('保存成功'); showDialog.value=false; editing.value=false; loadList(); } catch(e:any){ElMessage.error(e.message);}
}
function typeLabel(t:string){return ({SINGLE:'单次',TIMES:'套餐',TREATMENT:'调理',ANNUAL:'年卡'} as any)[t]||t;}
onMounted(loadList);
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%}
.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.page-header h2{margin:0;font-size:18px}
.packages-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;overflow-y:auto}
.package-card{padding:20px;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden}
.package-card:hover{transform:translateY(-4px);border-color:var(--border-hover);box-shadow:var(--shadow-lg)}
.card-tag{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;margin-bottom:12px}
.tag-SINGLE{background:rgba(102,126,234,0.15);color:#34d399}
.tag-TIMES{background:rgba(16,185,129,0.15);color:#34d399}
.tag-TREATMENT{background:rgba(245,158,11,0.15);color:#fbbf24}
.tag-ANNUAL{background:rgba(236,72,153,0.15);color:#f472b6}
.card-name{font-size:18px;font-weight:600;margin-bottom:12px}
.card-price{display:flex;align-items:baseline;gap:8px;margin-bottom:12px}
.currency{font-size:14px;color:var(--text-tertiary)}
.amount{font-size:32px;font-weight:800;background:var(--gradient-primary);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.original{font-size:13px;color:var(--text-muted);text-decoration:line-through}
.card-desc{font-size:12px;color:var(--text-tertiary);margin-bottom:12px;min-height:32px}
.card-features{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:12px;background:rgba(255,255,255,0.02);border-radius:8px}
.feature{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)}
.feature .el-icon{color:var(--primary-light)}
.card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--border-light)}
</style>
