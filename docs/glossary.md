# 领域词汇表（Glossary）

本文件是本项目术语的唯一来源。代码里的类型名、UI 文案、测试描述都必须与这里一致；出现同义词时，先改这份文件，再改代码。

## 1. 核心对象

### 素材（Source Image）

用户导入的一张原始图片。素材是**只读**的，系统永不修改它。

- 系统只持有 `File`/`Blob` 引用，按需解码，不在内存里长期保存全分辨率位图。
- 标识：`id`（随机 ID）、`name`、`type`、`size`。
- 状态机：`pending` → `decoding` → `ready` | `error`。

### 批次（Batch）

当前工作台中同时被处理的一组素材。一个批次**共享同一个水印规格**。

- 不变式：`Batch.spec` 是单一对象，不存在逐图参数。
- 批次不是持久化对象：刷新页面后素材不恢复。

### 水印规格（Watermark Spec）

生成水印所需的全部参数，是可序列化的纯数据。

```ts
interface WatermarkSpec {
  text: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  sizeRatio: number;   // 字号 / 图片短边
  color: string;       // #RRGGBB
  opacity: number;     // 0–1
  angle: number;       // 顺时针为正，单位度
  gapRatio: number;    // 间隔 / 字号
}
```

- 不含图片、不含分辨率、不含导出格式。
- 唯一的 Spec 来源是 store；UI 不持有第二份副本。

### 水印单元（Tile）

一段水印文本在一次平铺中的最小重复块。**多行文本属于同一个 Tile**，不是多个 Tile。

- Tile 的包围盒由字号、行数、行高（1.2 × 字号）、最长行宽共同决定。
- 一个 Tile 内的多行文字水平居中、垂直整体居中。

### 平铺网格（Tiling Grid）

Tile 按固定节距在**旋转后的坐标系**中重复形成的二维网格。

- 节距 X = `tileWidth + gap`，节距 Y = `tileHeight + gap`。
- 网格以画布中心为原点，向四周对称展开。
- 行与行对齐，不做交错。

### 渲染（Render）

把 `WatermarkSpec` 应用到某个分辨率上的过程。渲染是纯函数：相同 Spec + 相同尺寸 ⇒ 相同像素。

渲染分两种，只有分辨率不同：

| 名称 | 用途 | 输入位图长边 |
| --- | --- | --- |
| 预览渲染（Preview Render） | 工作台实时预览、缩略图 | ≤ 2048（缩略图 ≤ 160） |
| 导出渲染（Export Render） | 生成最终文件 | 原图分辨率 |

### 导出任务（Export Job）

一次导出动作，包含：

- 一组素材（单张或全批次）
- **冻结的** Spec 快照（导出开始后不再跟随 UI 变化）
- 目标格式与质量
- 交付方式（Delivery Mode）：`direct` | `zip` | `per-file`

状态机：`idle` → `running` → `done` | `cancelled` | `failed`。

### 导出结果（Export Result）

- `succeeded: string[]`（文件名）
- `failed: { name: string; reason: string }[]`
- 失败项可被重新入队（“重试失败项”）。

## 2. 参数定义

| 字段 | 含义 | 单位 / 范围 | 默认值 | 备注 |
| --- | --- | --- | --- | --- |
| `text` | 水印文本 | ≤ 500 字符，支持 `\n` | `仅供内部使用` | 空白文本禁止导出 |
| `fontFamily` | 字体族 | `sans` / `serif` / `mono` | `sans` | 使用系统字体栈，不加载网络字体 |
| `sizeRatio` | 字号占图片短边比例 | 0.01–0.30 | 0.04 | UI 显示为 `%` 或按当前图换算的 px |
| `color` | 填充色 | `#RRGGBB` | `#000000` | 仅填充，无描边、无阴影 |
| `opacity` | 不透明度 | 0–1 | 0.30 | UI 显示为 30% |
| `angle` | 旋转角 | -180–180 度 | -30 | 顺时针为正；-30° 文本自左下向右上 |
| `gapRatio` | 间隔 / 字号 | 0–5 | 1.0 | 间隔 = 相邻 Tile 包围盒的边缘空隙 |

### 派生量（实现必须按此计算）

```ts
const f = spec.sizeRatio * Math.min(width, height); // 字号 px
const gap = spec.gapRatio * f;                      // 边缘空隙 px
const lineHeight = 1.2 * f;
const pitchX = tileWidth + gap;
const pitchY = tileHeight + gap;
```

- `tileWidth` = 多行中最长一行的 `measureText().width`
- `tileHeight` = `行数 × lineHeight`

## 3. 不变量（Invariants）

1. **单一 Spec**：一个批次只有一个水印规格。
2. **分辨率无关**：Spec 只存比例；预览与导出用同一套布局函数，仅画布尺寸不同。
3. **四角覆盖**：任意角度下，画布四角都必须落在平铺范围内。
4. **允许截断**：贴近边缘的 Tile 可以被画布裁切。
5. **居中对称**：网格原点在画布中心，不随机偏移。
6. **不交错**：相邻行不做半格错位。
7. **不保留元数据**：导出文件不携带原图 EXIF/GPS；方向烧录进像素。
8. **图片不上传**：任何包含图片像素的数据都不发往网络。
9. **导出冻结**：导出期间 UI 改参不影响本次任务。
10. **失败隔离**：单张失败不终止整批。
11. **空文本不导出**：`text.trim() === ''` 时导出按钮禁用并提示。

## 4. 易混淆术语（禁止混用）

| 说法 | 正确含义 | 不要理解成 |
| --- | --- | --- |
| 间隔 | 相邻 Tile 包围盒的**边缘空隙**，单位是字号倍数 | 相邻水印中心距 |
| 不透明度 | 完全不透明为 1 | “透明度”（数值方向相反） |
| 角度 | 整个平铺网格的旋转角 | 仅文字倾斜 |
| 预览 | 降采样位图上的渲染结果 | 最终导出文件 |
| 批次 | 共享一套参数的图片集合 | 多套参数分组 |
| 平铺 | 按网格重复铺满 | 单个水印定位/拖拽 |

## 5. 状态与关系

```text
Batch 1 ──── 1 WatermarkSpec
  │
  └── * SourceImage
          │
          ├── thumbnail (Preview Render, 长边 ≤ 160)
          └── preview   (Preview Render, 长边 ≤ 2048, 仅当前选中)

ExportJob
  ├── frozen WatermarkSpec (深拷贝)
  ├── * SourceImage
  └── DeliveryMode (direct | zip | per-file)
        └── ExportResult (succeeded[], failed[])
```

## 6. 输入边界

- 接受 MIME：`image/jpeg`、`image/png`、`image/webp`。
- 单张 ≤ 30 MB；单批 ≤ 50 张。
- EXIF 方向自动摆正；其他元数据全部丢弃。
- 不接受：GIF、HEIC/AVIF、SVG、PDF、视频。
