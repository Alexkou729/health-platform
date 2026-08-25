# 健康管理系统 · GitHub 推送教程（v1.1 · 含 macOS Actions）

> 📌 **最新变更见 `00-更新日志-最新功能与状态.md`**

---

## 一、推送代码到 GitHub（一次性）

### 1. 准备 Git 仓库
```bash
cd E:\work Codex\健康管理\platform
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
git init
git add -A
git commit -m "chore: v1.1 initial commit"
```

### 2. 在 GitHub 创建仓库
访问 https://github.com/new 创建新仓库（如 `Alexkou729/health-platform`），**不要**勾选 Initialize with README。

### 3. 关联并推送
```bash
git remote add origin https://github.com/Alexkou729/health-platform.git
git branch -M master
git push -u origin master
```

推送时输入 GitHub 用户名 + Personal Access Token（**不要用密码**，去 https://github.com/settings/tokens 生成 `repo` 权限的 token）。

### 4. 后续推送
```bash
git add -A
git commit -m "feat: 描述你的改动"
git push origin master
```

---

## 二、GitHub Actions 自动构建（v1.1 新增 · macOS）

文件 `.github/workflows/build-mac.yml` 已配：

- **触发**：push 到 master 且 `apps/desktop/**` 变更，或手动触发
- **Runner**：`macos-latest`（macOS 14）
- **构建**：`x64 + arm64` 双架构 → `.zip`
- **下载**：GitHub → Actions → 你的 commit → Artifacts → `health-platform-macos-<sha>`

同事下载后：
1. macOS：解压 → 拖入"应用程序" → **右键 → 打开**（首次）
2. Windows：从 `apps/desktop/release/健康管理系统-1.0.0-x64.exe` 取安装包

---

## 三、敏感信息保护（重要）

**绝对不能** 推送：
- ❌ 服务器密码 / IP / 端口
- ❌ API Key（MiniMax / 任何大模型）
- ❌ 真实客户的姓名 / 手机号 / 地址
- ❌ 数据库文件
- ❌ 备份文件

**已配 `.gitignore`**：
- `node_modules/`
- `release/`
- `dist/`
- `.env`（如果存在）
- `*.sqlite*`

**额外建议**：
- 仓库设为 **Private**（不要 Public）
- 启用 GitHub Secret 存储敏感变量（未来扩展）
- 定期检查 `git log` 确认没误推

---

## 四、推送后验证

- [ ] GitHub 仓库能看到代码
- [ ] Actions 跑成功（绿色勾）
- [ ] 下载 macOS artifact 能装能用
- [ ] Windows 安装包可正常安装

---

## 五、常见问题

### Q1：推送时 `Permission denied`
A：用 Personal Access Token，不是密码。https://github.com/settings/tokens

### Q2：Actions 跑失败
A：看日志。最常见是 noble 原生编译失败，workflow 已处理。

### Q3：怎么回滚？
A：回滚到上一个 commit：
```bash
git revert HEAD
git push origin master
```
Actions 自动重跑构建上一个版本。

---

> 📌 完整功能见 `00-更新日志-最新功能与状态.md` · Mac 构建细节见 `mac-build.md`
