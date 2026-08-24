# GitHub 推送教程（把项目推到 GitHub 自动打包）

> 目标：把「健康管理系统」代码推到 GitHub，自动触发 Windows + macOS 桌面端打包
> 全程约 15 分钟，照着做即可

## 第 1 步：准备三件事

### 1.1 安装 Git（电脑没有才装）
1. 打开 `https://git-scm.com/download/win` 下载并安装。
2. 安装时一路点「下一步」保持默认即可。

### 1.2 注册 GitHub 账号
1. 打开 `https://github.com` 点「Sign up」注册。
2. 用户名就是你的 GitHub 账号名（例如 `Alexkou729`）。

### 1.3 生成 Personal Access Token（关键！）
GitHub 已禁止用密码推送，必须用 Token 当密码。

1. 登录 GitHub 后，打开 `https://github.com/settings/tokens`
2. 点「Generate new token」→「Generate new token (classic)」
3. Note 随便填，例如 `push`
4. 过期时间选「No expiration」
5. 勾选 `repo`（整个仓库权限）
6. 拉到最下面点「Generate token」
7. **立即复制**生成的 `ghp_xxxx` 字符串（只显示一次，务必保存好）

## 第 2 步：在 GitHub 创建空仓库

1. 打开 `https://github.com/new`
2. Repository name 填：`health-platform`
3. 选 Private（私有）或 Public（公开）均可
4. **不要勾选**「Add a README file」
5. **不要勾选**「Add .gitignore」
6. 点「Create repository」

## 第 3 步：推送代码（二选一）

### 方式 A：一键脚本（推荐）
1. 双击运行 `E:\work Codex\健康管理\platform\push-to-github.bat`
2. 按提示确认后，会弹出登录（或命令行提示）：
   - Username 填：`Alexkou729`
   - Password 填：**粘贴你复制的 Token**（`ghp_` 开头）
3. 等它跑完显示「推送成功」即可。

### 方式 B：手动命令（PowerShell）
```powershell
cd "E:\work Codex\健康管理\platform"
git remote add origin https://github.com/Alexkou729/health-platform.git
git push -u origin master
```
登录提示同上：用户名 + Token。

> 如果提示 `remote origin already exists`，先执行：
> `git remote set-url origin https://github.com/Alexkou729/health-platform.git`

## 第 4 步：验证推送成功

1. 打开 `https://github.com/Alexkou729/health-platform`
2. 能看到项目文件（apps、docs、package.json 等）就说明推送成功。

## 第 5 步：查看自动打包（CI）

1. 打开 `https://github.com/Alexkou729/health-platform/actions`
2. 会看到名为 `Build Desktop (Windows + macOS)` 的工作流正在运行。
3. 等它跑完（约 5-15 分钟），进入该次运行，最下方「Artifacts」下载：
   - `windows-desktop`：Windows 安装包
   - `macos-desktop`：macOS dmg/zip

## 常见问题

| 问题 | 原因 | 解决 |
| --- | --- | --- |
| `remote origin already exists` | 已添加过远程 | 用 `set-url` 改地址 |
| `fatal: Authentication failed` | 密码填的是登录密码 | 必须填 Token |
| `403` / `permission denied` | Token 没勾 repo | 重新生成勾选 repo |
| 连不上 github.com | 国内网络封锁 | 挂 VPN 再推送 |
| 仓库名不对 | 建仓库时名字不一致 | 改成脚本里 REPO_NAME 一致 |
