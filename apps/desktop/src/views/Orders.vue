<template>
<div class="page">
<div class="page-header">
<h2>订单管理</h2>
<div class="header-actions">
<el-input v-model="filters.keyword" placeholder="搜索订单/客户" style="width:200px" clearable @change="loadList"><template #prefix><el-icon><Search /></el-icon></template></el-input>
<el-select v-model="filters.status" placeholder="状态" clearable style="width:120px" @change="loadList">
<el-option label="待支付" :value="0"/><el-option label="已支付" :value="1"/><el-option label="已退款" :value="2"/><el-option label="已取消" :value="3"/><el-option label="已完成" :value="4"/>
</el-select>
</div></div>
<div class="stats-row">
<div class="stat-card glass-card"><div class="stat-icon" style="background:linear-gradient(135deg,#059669,#0ea5e9)"><el-icon><List/></el-icon></div><div><div class="stat-label">订单总数</div><div class="stat-value">{{stats.total||0}}</div></div></div>
<div class="stat-card glass-card"><div class="stat-icon" style="background:linear-gradient(135deg,#059669,#059669)"><el-icon><Money/></el-icon></div><div><div class="stat-label">总营收</div><div class="stat-value">¥{{stats.totalRevenue||0}}</div></div></div>
<div class="stat-card glass-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><el-icon><Calendar/></el-icon></div><div><div class="stat-label">本月营收</div><div class="stat-value">¥{{stats.monthRevenue||0}}</div></div></div>
<div class="stat-card glass-card"><div class="stat-icon" style="background:linear-gradient(135deg,#ec4899,#be185d)"><el-icon><TrendCharts/></el-icon></div><div><div class="stat-label">今日订单</div><div class="stat-value">{{stats.todayCount||0}}</div></div></div>
</div>
<div class="glass-card" style="flex:1;overflow:hidden;display:flex;flex-direction:column">
<el-table :data="items" style="flex:1" stripe v-loading="loading">
<el-table-column prop="orderNo" label="订单号" width="200"/>
<el-table-column label="客户" width="140"><template #default="{row}"><div>{{row.customer?.name}}</div><div class="text-xs text-tertiary">{{row.customer?.phone}}</div></template></el-table-column>
<el-table-column label="套餐" min-width="200"><template #default="{row}"><div v-for="item in row.items||[]" :key="item.id" class="text-sm">{{item.name}} × {{item.quantity}}</div></template></el-table-column>
<el-table-column label="金额" width="120"><template #default="{row}"><strong>¥{{row.totalAmount}}</strong><div v-if="row.discountAmount>0" class="text-xs text-warning">-¥{{row.discountAmount}}</div></template></el-table-column>
<el-table-column label="实付" width="100"><template #default="{row}"><span class="text-success">¥{{row.paidAmount}}</span></template></el-table-column>
<el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="statusType(row.status)" effect="dark">{{statusLabel(row.status)}}</el-tag></template></el-table-column>
<el-table-column label="支付方式" width="100"><template #default="{row}"><span v-if="row.paymentMethod">{{paymentLabel(row.paymentMethod)}}</span><span v-else>-</span></template></el-table-column>
<el-table-column label="创建时间" width="180"><template #default="{row}">{{formatDate(row.createdAt)}}</template></el-table-column>
<el-table-column label="操作" width="180" fixed="right">
<template #default="{row}">
<el-button v-if="row.status===0" text type="primary" size="small" @click="payOrder(row)">支付</el-button>
<el-button v-if="row.status===0" text type="danger" size="small" @click="cancelOrder(row)">取消</el-button>
<el-button v-if="row.status===1" text type="warning" size="small" @click="refundOrder(row)">退款</el-button>
</template>
</el-table-column>
</el-table>
<el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :total="total" :page-sizes="[20,50,100]" layout="total,sizes,prev,pager,next,jumper" @current-change="loadList" @size-change="loadList" style="margin-top:12px;justify-content:flex-end"/>
</div>
</div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { orderApi } from '@/api';
const items = ref<any[]>([]); const total = ref(0); const loading = ref(false); const stats = ref<any>({});
const filters = reactive({ keyword:'', status:'', page:1, pageSize:20 });
async function loadList() {
  loading.value=true;
  try { const res:any = await orderApi.list({page:filters.page,pageSize:filters.pageSize,keyword:filters.keyword,status:filters.status}); items.value=res.items||[]; total.value=res.total||0; } catch(e:any){ElMessage.error(e.message);} finally{loading.value=false;}
}
async function loadStats(){ try{stats.value=await orderApi.statistics();}catch{} }
async function payOrder(row:any){ await ElMessageBox.confirm('确定订单 '+row.orderNo+' 已支付 ¥'+(row.totalAmount-row.discountAmount)+'?','支付确认',{type:'success'}); await orderApi.pay(row.id,'WECHAT'); ElMessage.success('支付成功'); loadList(); }
async function cancelOrder(row:any){ await ElMessageBox.confirm('确定取消订单 '+row.orderNo+'?','提示',{type:'warning'}); await orderApi.cancel(row.id); ElMessage.success('已取消'); loadList(); }
async function refundOrder(row:any){ await ElMessageBox.confirm('确定退款订单 '+row.orderNo+'?','退款确认',{type:'warning'}); await orderApi.refund(row.id); ElMessage.success('已退款'); loadList(); }
function statusLabel(s:number){return ['待支付','已支付','已退款','已取消','已完成'][s]||'未知';}
function statusType(s:number){return ['warning','success','info','danger','success'][s]||'';}
function paymentLabel(p:string){return ({WECHAT:'微信',CASH:'现金',CARD:'银行卡',ALIPAY:'支付宝'} as any)[p]||p;}
function formatDate(d:string){return d?new Date(d).toLocaleString('zh-CN',{hour12:false}):'-';}
onMounted(()=>{loadList();loadStats();});
</script>
<style lang="scss" scoped>
.page{display:flex;flex-direction:column;height:100%}
.page-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.page-header h2{margin:0;font-size:18px}
.header-actions{display:flex;gap:8px}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat-card{display:flex;align-items:center;gap:16px;padding:16px}
.stat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:white}
.stat-label{font-size:12px;color:var(--text-tertiary)}
.stat-value{font-size:24px;font-weight:700;margin-top:4px}
.text-success{color:#059669}
.text-warning{color:#f59e0b}
</style>
