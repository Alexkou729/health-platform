# GitHub Actions 自动构建说明

> 📌 最新功能/服务变更见 `docs/上线交付/00-更新日志-最新功能与状态.md`

本目录配置了**统一自动构建**：`build-desktop.yml` 一次推送同时产出 **Windows .exe + macOS .zip**，无需本地打包。

---

## 一、工作流

| 文件 | 平台 | 触发 | 产物 |
|---|---|---|---|
| `build-desktop.yml` | **Windows + macOS**（并行） | push 到 master/main + apps/desktop 变更 | `.exe` + `.zip`（x64+arm64） |

两个 job（`build-windows`、`build-macos`）在**不同 runner 上并行**跑，互不阻塞。

---

## 二、使用流程

### 1. 自动触发（推荐）
```bash
git add -A
git commit -m "feat: 改动描述"
git push origin master
```

GitHub Actions 5-8 分钟完成，下载位置：
- 仓库 → **Actions** 标签 → 点 workflow run
- 底部 **Artifacts**：
  - `health-platform-windows-<sha>` → 包含 `.exe`
  - `health-platform-macos-<sha>` → 包含 `.zip`

### 2. 手动触发
GitHub → Actions → "Build Desktop" → **Run workflow** → 选分支 → 运行

---

## 三、产物分发

### Windows (.exe)
- 直接发给同事，双击安装
- **无需** "右键 Open"

### macOS (.zip)
- 解压后拖入"应用程序"
- **首次启动**右键 → "打开" → "打开"（绕过未签名）
- 内部分发可接受；100+ 加盟商时建议申请 Apple Developer ID 签名

---

## 四、构建关键步骤（两个 job 相同）

1. `pnpm install --ignore-scripts`：装依赖，**跳过** noble/koffi 原生编译
2. `npm rebuild --runtime=electron --target=29.4.6 --abi=125`：用 Electron headers 重新编译 noble（关键，否则 native module 不匹配）
3. `vite build` + `tsc -p electron/tsconfig.json`：编译前端 + 主进程
4. `electron-builder`：打平台安装包
5. `upload-artifact`：上传产物

---

## 五、为什么用 GitHub Actions

| 平台 | 本地打包 | GitHub Actions |
|---|---|---|
| Windows | ✅ 可本地 | ✅ windows-latest runner |
| macOS | ❌ **必须 Mac**（noble/koffi 需 darwin 编译） | ✅ macos-latest runner |

GitHub Actions 提供免费 macOS runner（每月 2000 分钟），公司内部用完全够。

---

## 六、版本对齐

| 组件 | 版本 | 来源 |
|---|---|---|
| Node.js | 20 | `apps/desktop/package.json` engines |
| pnpm | 9 | 与项目一致 |
| Electron | 29.4.6 | `apps/desktop/package.json` |
| electron-builder | 24.13.x | devDep |

如果 `apps/desktop/package.json` 里 Electron 升级了，要同步修改 workflow 的 `--target=29.4.6 --abi=125`。

---

## 七、常见问题

### Q1：noble 编译失败
A：已显式 `npm rebuild --runtime=electron --target=29.4.6`。若仍失败，看 Actions 日志（缺 Python/VS Build Tools 一般不会，github-runner 已预装）。

### Q2：产物上传失败
A：当前产物 < 100MB，远低于 2GB/artifact 限制。

### Q3：macOS 避免每次"右键 Open"
A：需 Apple Developer ID（$99/年）+ 私钥 + Apple ID，详见 `docs/mac-build.md` 第 6 节。

### Q4：想每天定时构建
A：在 `on:` 加：
```yaml
on:
  schedule:
    - cron: "0 2 * * *"
```

### Q5：Windows / macOS job 互不影响？
A：是的。macOS 失败 Windows 仍成功，反之亦然。下载你想要的那个 artifact 即可。

---

> 📌 完整功能见 `docs/上线交付/00-更新日志-最新功能与状态.md`
