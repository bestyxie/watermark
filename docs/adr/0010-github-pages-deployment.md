# ADR-0010：GitHub Pages 静态部署

- 状态：Accepted
- 日期：2026-10-29

## 背景

ADR-0001 已确定交付物是纯静态站点、无服务端。仓库托管在 GitHub（`bestyxie/watermark`），需要零成本的静态托管与可重复的发布流程。

## 决策

1. 托管在 GitHub Pages，Source 设为 **GitHub Actions**（仓库设置中一次性开启）。
2. 线上地址为 `https://bestyxie.github.io/watermark/`，因此 Vite 的 `base` 固定为 `/watermark/`；开发、测试、预览、构建统一使用该前缀，避免多环境不一致。
3. 单一工作流 `.github/workflows/deploy.yml`：
   - PR 与 main 推送都先跑**质量门禁**：typecheck、lint、单元测试、Playwright e2e（CI 内安装 Chromium）。
   - main 推送且门禁通过后，用官方 Pages Actions（configure-pages → upload-pages-artifact → deploy-pages）发布 `dist/`。
   - 部署任务使用 `concurrency: pages`，保证同一时刻只有一个部署在写站点。
4. 工具链版本固定：`packageManager: pnpm@11.22.0`，Node 22（满足 Vite 8 的 `^20.19 || >=22.12`）。

## 后果

- 换仓库名、换组织或绑定自定义域名时，必须同步修改 `vite.config.ts` 的 `base`。
- e2e 在 CI 需要下载 Chromium（约 1–2 分钟），换来发布前的完整回归。
- 首次部署前需要在 GitHub 仓库设置中把 Pages 的 Source 改为 GitHub Actions，否则 deploy 任务会报“未启用 Pages”。
- Pages 不支持某些国家的访问与自定义 HTTPS 证书之外的进阶需求；如未来需要，再评估 CDN/其他托管。

## 备选方案

- **gh-pages 分支 + 第三方 Action**：不依赖 Pages Source 设置，但要维护分支历史与构建产物，已否决。
- **Vercel / Netlify**：预览部署体验更好，但引入第三方账号与配额，与“零后端零账号”目标不符。
