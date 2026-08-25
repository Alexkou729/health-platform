# 健康管理系统 · 生产环境监控与 SLA 手册（v1.1）

> 📌 **最新功能/服务变更见 `00-更新日志-最新功能与状态.md`**
> 适用：总部技术支持、SRE、值班人员

---

## 一、SLA 承诺

| 服务 | 可用性 | 响应延迟 | 备注 |
|---|---|---|---|
| 后端 API | ≥99.5%（工作时段 99.9%） | p95 ≤800ms | 含 AI 结构化解读 |
| AI 结构化解读 | ≥99% | 单次 15-40s | MiniMax-M3 推理 |
| PDF 导出 | ≥99% | p95 ≤5s | 依赖 Chromium |
| 桌面端登录 | 100% | ≤3s | 含配置获取 |
| 数据备份 | 100% | 每日 4:00 完成 | 保留 7 天 |

---

## 二、监控指标

### 2.1 业务关键指标
| 指标 | 阈值 | 报警 |
|---|---|---|
| 每小时新增报告数 | 异常 ±50% | 邮件/企业微信 |
| AI 解读成功率 | <95% | 即时报警 |
| 报告删除次数 | 单店 >5/天 | 异常行为提醒 |
| AI 接口费用 | 月预算超 80% | 预算告警 |

### 2.2 系统指标
- **CPU** >80% 持续 5min → 报警
- **内存** >85% → 报警
- **磁盘** >85% → 报警（备份占空间）
- **API 错误率** >2% → 报警
- **PM2 重启次数** >5/小时 → 报警（崩溃循环）
- **AI 接口 5xx** >3 次/分钟 → 报警

---

## 三、关键服务运行检查

### 1. 后端健康
```bash
pm2 list | grep health-backend  # 应 online
pm2 logs health-backend --lines 50  # 查最近错误
curl -s http://127.0.0.1:3015/health
```

### 2. Chromium 状态（v1.1 关键）
```bash
/opt/chromium/chrome-linux64/chrome --version
# 期望：Google Chrome for Testing 120.0.6099.109
ps aux | grep chrome | head -3  # 查是否有僵尸进程
```

PDF 端点验证：
```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:3015/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | node -e ...)
RID=$(curl -s "http://127.0.0.1:3015/api/reports?page=1&pageSize=1" -H "Authorization: Bearer $TOKEN" | ...)
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
  "http://127.0.0.1:3015/api/reports/$RID/pdf" -H "Authorization: Bearer $TOKEN"
# 期望：200 application/pdf
```

### 3. AI 接口（v1.1 重点）
```bash
# 测连接
curl -s -X POST http://127.0.0.1:3015/api/ai/chat \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"messages":[{"role":"user","content":"回复：连接成功"}]}'
# 期望：reply 含中文回复

# 测结构化（耗 15-40s）
curl -s -X POST "http://127.0.0.1:3015/api/ai/interpret/$RID/structured" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{}'
# 期望：structured 含 overallAssessment 等 10 字段
```

---

## 四、故障应急 SOP（v1.1）

### F1：AI 解读失败
**症状**：结构化解读返回 `{raw:"..."}` 或 500
**根因**：maxTokens 截断 / MiniMax 端点错 / 网络
**处理**：
1. `pm2 logs health-backend | grep -iE "minimax|invalid"` 看具体错
2. 若是端点错 → 系统设置 → AI 接口配置 → 改 `api.minimaxi.com/v1`
3. 若是 token 失效 → 重新粘贴
4. 让用户点"重新生成 AI 结构化解读"

### F2：PDF 503
**症状**：下载报告 503
**根因**：Chromium 未启动 / CHROMIUM_PATH 错
**处理**：
1. `/opt/chromium/chrome-linux64/chrome --version`
2. 检查 `.env` 中 `CHROMIUM_PATH`
3. `pm2 restart health-backend --update-env`

### F3：桌面端 `R.interpretStructured is not a function`
**症状**：用户点击 AI 解读报错
**根因**：用户没装 v1.1 新安装包
**处理**：让用户从群文件下载 v1.1 安装包重装

### F4：门店越权访问
**症状**：门店账号看到非本店数据
**根因**：scope 拦截器失效（极少见）
**处理**：
1. 立即冻结该账号
2. `pm2 logs | grep "403\|404"` 查访问记录
3. 联系开发排查 scope interceptor

### F5：数据备份失败
**症状**：备份目录无新文件
**处理**：
1. `ls -la /opt/health-platform/backups/`
2. 手动跑 `/opt/backup.sh`
3. 检查磁盘空间 `df -h`

---

## 五、版本升级（v1.0 → v1.1 注意事项）

| 升级点 | 风险 | 应对 |
|---|---|---|
| 桌面端替换为 v1.1 | 用户不更新 | 群通知 / 强制提示 |
| 后端 ai.service maxTokens 2200→5000 | AI 调用变慢 | 已在文档说明 15-40s |
| 后端 parseJSON 升级 | 旧 AI 解读记录仍按旧规则显示 | 自动兼容 |
| 后端 report.engine 居家调理过滤 | 老报告的检测明细会少居家调理行 | 已有"归档"块兜底 |
| 后端 report.service 删除权限收紧 | 医生/前台删除按钮消失 | 培训通知 |
| 桌面端 keep-alive | 老用户的菜单状态可能不同 | 首次刷新后正常 |
| 桌面端 7 大分组 | UI 视觉变化 | 培训手册已发 |

---

## 六、值班检查清单（每日 9:00 / 17:00）

- [ ] 后端 PM2 online
- [ ] 健康端点 200
- [ ] 浏览器后台（AI 接口配置）显示 connected
- [ ] PDF 抽样测试 1 次（任选一份）
- [ ] 备份目录有新文件（检查 timestamp）
- [ ] 磁盘使用 <80%
- [ ] 当日错误日志无新 ERROR
- [ ] 营业日报：今日检测 / AI 解读 / 收入

---

> 📌 最新功能与变更见 `00-更新日志-最新功能与状态.md`
