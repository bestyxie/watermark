# ADR-0009：技术栈与工程基线

- 状态：Accepted
- 日期：2026-10-28

## 背景

这是一个全新的空仓库，需要选定框架、构建工具、状态管理、ZIP 方案和测试方式。产品是纯前端工具型 SPA，无 SEO、无服务端渲染需求。

## 决策

| 项 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | React + TypeScript（strict） | 生态成熟，Canvas/Worker 集成资料多 |
| 构建 | Vite | 启动快、静态产物简单、配置少 |
| 状态 | Zustand | 体积小、selector 精准订阅，适合高频参数更新 |
| 样式 | CSS Modules + CSS 变量 | 无额外构建链，易于做三断点响应式 |
| UI 组件 | 不引入组件库 | 控件数量有限，自绘更可控、体积更小 |
| ZIP | `fflate` | 体积小、纯 JS、支持浏览器 |
| 单元测试 | Vitest | 与 Vite 同源，测几何/钳制/序列化 |
| 端到端 | Playwright | 覆盖导入、调参、预览、导出主流程 |
| 代码质量 | ESLint + Prettier | 统一风格，CI 可执行 |
| 部署 | 静态托管（Vercel/Netlify/GH Pages） | 无服务端，产物即站点 |

### 目录建议

```text
src/
  app/            # 入口、布局、路由（单页，无需 router）
  features/
    batch/        # 导入、列表、缩略图
    spec/         # 参数面板、默认值、校验、持久化
    preview/      # 画布、缩放平移
    export/       # 任务调度、Worker、ZIP
  core/
    watermark/    # 纯函数：布局、Tile 生成、渲染
    image/        # 解码、方向、缩放、编码
    store/        # Zustand slices
  shared/         # 类型、常量、工具
```

### 关键约束

- `core/watermark` 不依赖 React/DOM，可在 Worker 与测试中复用。
- 渲染函数接收 `CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D`。
- 所有用户可见文案集中管理，当前仅简体中文。
- 不在运行时加载网络字体或 CDN 资源。

## 理由

- React + Vite 是这类工具的最短路径，且便于把渲染核心抽成纯函数。
- Zustand 比 Context 更适合“高频滑块 + 多组件订阅”。
- 自绘控件避免 UI 库带来的体积和样式覆盖成本。

## 后果

- 需要自己实现滑块、取色器组合、抽屉、进度条等基础控件。
- 无路由，所有状态在单页内；未来若要分享链接需额外设计。
- 静态托管需配置 `base`（GitHub Pages 子路径）与 SPA 回退（单页无路由，回退可选）。
- 单元测试重点放在几何与规格，不做像素级快照（跨平台不稳定）。
