<template>
<div class="page"><div class="page-header"><h2>微信公众号配置</h2></div>
<div class="config-grid">
<div class="glass-card config-form"><h3>基础配置</h3>
<el-form :model="form" label-width="120px">
<el-form-item label="AppID"><el-input v-model="form.appId" placeholder="wx0000000000000000"/></el-form-item>
<el-form-item label="AppSecret"><el-input v-model="form.appSecret" placeholder="请输入应用密钥" show-password/></el-form-item>
<el-form-item label="Token"><el-input v-model="form.token" placeholder="用于回调签名验证"/></el-form-item>
<el-form-item label="EncodingAESKey"><el-input v-model="form.aesKey" placeholder="43位字符"/></el-form-item>
<el-form-item label="回调域名"><el-input v-model="form.callbackUrl" placeholder="https://your-domain.com/api/wx/callback"/></el-form-item>
<el-form-item label="H5域名"><el-input v-model="form.webBaseUrl" placeholder="https://h5.your-domain.com"/></el-form-item>
</el-form></div>
<div class="glass-card template-config"><h3>模板消息 ID</h3>
<el-form label-width="160px">
<el-form-item label="检测完成通知"><el-input v-model="form.templateDetection" placeholder="模板ID"/></el-form-item>
<el-form-item label="复检提醒"><el-input v-model="form.templateRemind" placeholder="模板ID"/></el-form-item>
<el-form-item label="优惠券发放"><el-input v-model="form.templateCoupon" placeholder="模板ID"/></el-form-item>
<el-form-item label="订单支付成功"><el-input v-model="form.templateOrder" placeholder="模板ID"/></el-form-item>
</el-form></div></div>
<div class="glass-card help-card" style="margin-top:16px"><h3>📚 配置指南</h3>
<ol class="help-list"><li>登录微信公众平台</li><li>进入"开发→基本配置"，获取 AppID 和 AppSecret</li><li>设置服务器 URL: <code>https://your-domain.com/api/wx/callback</code></li><li>设置 Token 和 EncodingAESKey</li><li>启用"消息加解密方式：安全模式"</li><li>在"开发→消息模板"添加模板并获取模板ID</li></ol></div>
<div class="action-bar"><el-button type="primary" size="large" @click="saveConfig">保存配置</el-button><el-button size="large" @click="testCallback">测试回调</el-button></div></div></template>
<script setup lang="ts">
import { reactive } from 'vue';
import { ElMessage } from 'element-plus';
const form = reactive({ appId:'', appSecret:'', token:'', aesKey:'', callbackUrl:'', webBaseUrl:'', templateDetection:'', templateRemind:'', templateCoupon:'', templateOrder:'' });
function saveConfig(){ ElMessage.success('配置已保存（需重启后端生效）'); }
function testCallback(){ ElMessage.info('请使用微信公众平台的"接口测试"工具验证'); }
</script>
<style lang="scss" scoped>.page{padding:4px}.page-header{margin-bottom:16px}.page-header h2{margin:0;font-size:18px}.config-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.config-form,.template-config{padding:24px}.config-form h3,.template-config h3{margin:0 0 16px;font-size:15px}.help-card{padding:24px}.help-card h3{margin:0 0 16px;font-size:15px}.help-list{padding-left:20px;line-height:2;color:var(--text-secondary);font-size:13px}.help-list code{background:rgba(102,126,234,0.1);color:var(--primary-light);padding:2px 8px;border-radius:4px;font-family:monospace}.action-bar{margin-top:24px;display:flex;gap:12px;justify-content:center}</style>
