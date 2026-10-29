# 图片水印工具

纯浏览器本地的图片批量水印工具：图片不上传，全部在本机处理。

- 单张 / 批量导入（点击、拖拽、粘贴）
- 平铺文字水印：文本、字体、字号、颜色、不透明度、角度、间隔
- 实时预览，支持 1:1 与拖拽平移；移动端参数收进底部抽屉
- 导出保持原格式，支持打包 ZIP / 逐张下载、进度与取消、失败重试

领域词汇、需求规格与架构决策见 `docs/`。

## 开发

```bash
pnpm install
pnpm dev        # http://localhost:5173/watermark/
pnpm test       # 单元测试
pnpm e2e        # Playwright 端到端（首次先 pnpm e2e:install）
pnpm build      # 产出 dist/
```

## 部署

推送到 `main` 会触发 GitHub Actions：先跑质量门禁（typecheck / lint / 单测 / e2e），通过后把 `dist/` 发布到 GitHub Pages。

- 线上地址：<https://bestyxie.github.io/watermark/>
- 需要在仓库设置中把 Pages 的 Source 设为 **GitHub Actions**（一次性）
- 站点部署在 `/watermark/` 子路径，`vite.config.ts` 的 `base` 与之绑定；换仓库名或绑定自定义域名时需同步修改
