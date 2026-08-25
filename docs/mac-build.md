# macOS 桌面端构建指南（v1.1 · GitHub Actions 自动构建）

> 📌 **最新变更详见 `00-更新日志-最新功能与状态.md`**
> 结论：Windows 无法交叉编译 macOS Electron 应用（原生模块 noble/koffi 需 macOS 架构编译）。我们用 **GitHub Actions 自动构建**解决。

---

## 1. 为什么不在 Windows 上直接构建 macOS？

`electron-builder` 在 Windows 上会直接报错：
```
⨯ Build for macOS is supported only on macOS, please see https://electron.build/multi-platform-build
```

原因：Electron 应用依赖 native modules（`noble` USB-BLE、`koffi` FFI），这些模块在 Windows 上编译出来的是 `.node` for win32-x64，无法在 macOS 上运行。**必须用 macOS 编译 macOS native modules。**

---

## 2. 方案对比

| 方案 | 优点 | 缺点 |
|---|---|---|
| ❌ 在 Mac 上一台台手动 build | 直接 | 慢、不可持续 |
| ❌ macOS 虚拟机 | 免 Mac 硬件 | 需 macOS 镜像、卡 |
| ❌ MacStadium 等云 Mac | 真实 Mac | 按月付费 |
| ✅ **GitHub Actions (macos-latest runner)** | 推送即构建，免费 2000 min/月 | 需推代码到 GitHub |

我们采用 **GitHub Actions**（已配 `.github/workflows/build-mac.yml`）。

---

## 3. GitHub Actions 自动构建

### 3.1 已配 workflow

文件：`.github/workflows/build-mac.yml`

- **触发**：push 到 `master` / `main` 且 `apps/desktop/**` 有变更，或手动 `workflow_dispatch`
- **Runner**：`macos-latest`（macOS 14 Sonoma，Apple Silicon + x64）
- **构建**：`npx electron-builder --mac zip --x64 --arm64`（同时产出 Intel + Apple Silicon 版本）
- **产物**：`.zip`（含 `.app` 包）+ 上传为 GitHub Actions artifact

### 3.2 触发构建

**方式 A · 自动触发**（推荐）
```bash
cd E:\work Codex\健康管理\platform
git add -A
git commit -m "feat: v1.1 release"
git push origin master
```

GitHub Actions 自动跑构建，2-3 分钟后在 Actions 页面下载 artifact。

**方式 B · 手动触发**
GitHub → Actions → "Build macOS Desktop" → "Run workflow"

### 3.3 下载产物

GitHub → 你的 PR/commit → "Checks" 标签 → "Build macOS Desktop" → "Artifacts":
- `health-platform-macos-<commit-sha>` 包含：
  - `健康管理系统-1.0.0-x64.zip`（Intel Mac）
  - `健康管理系统-1.0.0-arm64.zip`（Apple Silicon M1/M2/M3）
  - 解压后是 `.app` 包

### 3.4 给同事分发

1. 把 .zip 上传到公司网盘/企业微信
2. 同事下载后**双击解压** → 拖入"应用程序"文件夹
3. **首次启动**：右键 `健康管理系统.app` → "打开" → "打开"（绕过未签名验证）
4. 后续可正常双击启动

> ⚠️ 未签名应用每次升级版本号变化都需重新走"右键 → 打开"流程。
> 如需长期无感升级，需额外配置 Apple Developer ID 签名（$99/年）+  notarization。

---

## 4. 如需在 Mac 上手动构建（备选）

如果有 Mac 电脑可访问：

```bash
# 1. 克隆代码
git clone https://github.com/your-org/health-platform.git
cd health-platform/apps/desktop

# 2. 安装依赖
pnpm install  # 或 npm install --legacy-peer-deps

# 3. 重新编译原生模块（macOS 架构）
npm rebuild --runtime=electron --target=29.4.6 \
  --dist-url=https://electronjs.org/headers --abi=125

# 4. 构建前端 + 主进程
npx vite build
npx tsc -p electron/tsconfig.json

# 5. 打包
npx electron-builder --mac zip --x64 --arm64

# 产物在 release/
ls release/*.zip
```

---

## 5. macOS 构建配置（package.json 关键片段）

```json
"mac": {
  "target": ["zip"],
  "category": "public.app-category.healthcare-fitness",
  "icon": "build/icon-512.png",
  "artifactName": "${productName}-${version}-${arch}.${ext}",
  "hardenedRuntime": false,
  "gatekeeperAssess": false
}
```

| 字段 | 值 | 说明 |
|---|---|---|
| target | `["zip"]` | **不选 dmg**（Windows 编译 + 跨平台都不行） |
| hardenedRuntime | `false` | 未签名必须关，否则运行即崩 |
| gatekeeperAssess | `false` | 不做公证（内部分发够用） |

---

## 6. 常见问题

### Q1：GitHub Actions 跑 noble 编译失败
A：workflow 已设 `npm rebuild --runtime=electron --target=29.4.6 --dist-url=https://electronjs.org/headers --abi=125`，与 desktop `package.json` electron 版本对齐。

### Q2：下载后 macOS 提示"无法打开，因为来自身份不明的开发者"
A：正常（未签名）。右键 → 打开 → 打开。

### Q3：能否做 Apple Silicon 原生？
A：已用 `--arm64` 参数，构建的是 arm64 原生 .app（不通过 Rosetta 转译，性能最佳）。

### Q4：企业分发如何避免每次"右键打开"？
A：需要：
1. Apple Developer ID（$99/年）
2. 用 `xcrun notarytool` 公证
3. 改用 `--mac dmg` + 签名
预计额外 1-2 天开发，可在 100+ 加盟商时再做。

---

## 7. 验证清单

- [ ] 推送代码到 GitHub master
- [ ] GitHub Actions 自动跑（2-3 分钟）
- [ ] 下载 artifact，解压得到 `.app`
- [ ] 拖入"应用程序"，**右键 → 打开**启动
- [ ] 登录页填 `http://47.99.147.106:3015/api`
- [ ] 验证 7 大分组菜单、AI 结构化解读、PDF 导出都能用

---

> 📌 完整功能见 `00-更新日志-最新功能与状态.md`
