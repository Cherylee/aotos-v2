# AOTOS 主题（aotos-v2）

Shopify OS 2.0 主题，店铺 `aotos.myshopify.com`，仓库 [Cherylee/aotos-v2](https://github.com/Cherylee/aotos-v2)。

日常改 section、snippet、模板和样式都在这个仓库里完成，再用 Shopify CLI 同步到主题预览。

## 分支

| 分支 | 用途 |
|------|------|
| `main` | 主分支。线上用的代码放这里，只接收已经在开发分支验证过的改动。 |
| `sit` | 开发分支。新功能和页面改动先提交到这里，本地预览确认后再合进 `main`。 |

当前开发从 `sit` 拉新改动。不要直接在 `main` 上改未验证的功能。合进 `main` 之后再推远程、再 `theme push` 到线上主题。

## 本地开发

```bash
shopify theme dev --store aotos.myshopify.com --port 9292
```

预览地址：`http://127.0.0.1:9292`。模板后缀用 `?view=`，例如购买页 ` /products/flux-x26-pro?view=flux-x26-pro`。

只推改过的文件：

```bash
shopify theme push --only sections/example.liquid assets/example.css templates/product.flux-x26-pro.json
```

## 目录

| 路径 | 内容 |
|------|------|
| `layout/` | 整页骨架，`theme.liquid` |
| `sections/` | 可在后台排序的区块 |
| `snippets/` | 被 section 引用的片段 |
| `templates/` | 页面 / 产品 JSON 模板，文件名后缀就是 `?view=` |
| `assets/` | CSS、JS、图片 |
| `config/` | 主题设置 |
| `.cursor/rules/` | 给编辑器的详细规范，下面是摘要 |

模板 JSON 以 Shopify 的注释开头，后面才是 JSON。某个 section 写了 `"disabled": true` 就不要搬到新模板里，除非明确要求启用。

## 改页面

- 能用现有 section 就复用。缺一个开关时再加设置，并只在当前模板里打开。
- 只改某一个页面的样式时，加可选设置，别改到共用这个 section 的其他页面。
- JSON 里写了空字符串会盖掉 schema 默认值；没写的字段才走默认值。
- 多文件改动要标明文件名，并附上面对应的 `theme push --only` 命令。

## Liquid

- 2 空格缩进，输出完整可运行代码。
- 兼容 Section / Block / Schema / 元字段，保留 `{{ content_for_header }}`。
- Schema 字段写全，不用废弃语法。
- 变体、AJAX 购物车、集合分页按主题现有写法接。

## 响应式

基准在 `assets/base.css`。`--rem` 在 PC 按 1440 算，`max-width: 768px` 时自动改成按 750 算。新模块不要再写死 `px`，也不要在模块里重设 `--rem`。

只写两套尺寸：

| 范围 | 写法 |
|------|------|
| PC | 不写断点 |
| 手机 | 只写 `max-width: 768px` 这一套，数字用手机自己的，不要抄 PC |

新模块默认：

- PC：内容宽 1100，上下 padding 80。
- 手机：内容宽 100%，左右 padding 40，上下 padding 88。
- 手机容器用 `padding` 留边，`box-sizing: border-box`。不要 `width: 100%` 再加左右 margin。
- 手机断点不要拆成 749 和 750–768，也不要用 `orientation: portrait` 当主断点。
- 手机上的 `input` / `textarea` / `select` 字号写成 `max(16px, calc(N * var(--rem)))`，避免 iOS 一点输入框就放大整页。
- Hover 放在 `@media (hover: hover)` 里。

区块标题用 class `aotos-section-title` 和 `var(--aotos-section-title-size)`（PC 32 / 手机 38，字重 700，颜色 `#000000`，下边距 48）。全屏视频、评价插件这类没有区块标题的模块不用套。

正文成对使用：主文案 14 / 行高 18 / 字重 600 / `#000000`，辅助文案 12 / 行高 16 / 字重 400 / `#999999`。手机正文默认 20 / 行高 32。不要再用 `#333`、`#666`、`#b3b3b3`。品牌橙不受这个限制。

按钮用 class `button`，或用 `--aotos-button-height`、`--buttons-radius`、`--aotos-button-font-size`、`--aotos-button-font-weight`、`--aotos-theme-color`（`#ff6501`）。不要再写死高度、圆角、字号、字重。

上下边距要能在后台调成 0。`range` 的 `min` 写 `0`，Liquid 输出时加 `allow_false: true`，否则 `0` 会被当成空值退回 80 / 88。

旧代码先不动，除非明确要求改成这套。

## 图片和速度

新写或大改的 section、snippet、JS、CSS 要过 PageSpeed：FCP、SI、LCP、TBT、CLS。

- `image_url` 必须带 `width`。卡片、封面、poster 不要直接用 900 / 1600 / 2200 原图。
- `<img>` 写和实际展示宽度匹配的 `srcset` 和 `sizes`。`width` / `height` 用请求宽度，不用原图像素。
- 全宽才写 `100vw`。两列约 `47vw`，四列约 `360px`，小卡片按展示像素写。
- 首屏最大的图：`loading="eager"`、`fetchpriority="high"`。其余 `loading="lazy"`。
- 首屏内容写在 HTML 里。不要等 JS 插完再显示，也不要把 `body` 藏到字体或脚本就绪之后。
- 图片和视频容器要有宽高或 `aspect-ratio`。
- 不要推迟 GTM、GA、Clarity。Klaviyo 保持原来的加载时机。

## 动画

淡入、上滑、hover 变色和缩放用 CSS。`prefers-reduced-motion: reduce` 时关掉动画。

首页不加载 GSAP。复杂路径、ScrollTrigger、字符拆分、Boost Mode 才用 GSAP，并且只通过 `snippets/aotos-gsap-loader.liquid` 加载。不要为了淡入给元素加 `.ga-*`。不要给首屏大图先 `opacity: 0` 再做动画。
