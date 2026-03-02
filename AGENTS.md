# AGENTS.md

## 1. 项目目标与技术栈

- 产品目标：基于节点画布进行图片上传、AI 生成/编辑、工具处理（裁剪/标注/分镜）。
- 前端：React + TypeScript + Zustand + @xyflow/react + TailwindCSS。
- 后端：Tauri 2 + Rust（命令式接口）。
- 关键原则：解耦、可扩展、可回归验证、自动持久化、交互性能优先。

## 2. 代码库浏览顺序

建议按以下顺序理解项目：

1. 入口与全局状态
- `src/App.tsx`
- `src/stores/projectStore.ts`
- `src/stores/canvasStore.ts`

2. 画布主流程
- `src/features/canvas/Canvas.tsx`
- `src/features/canvas/domain/canvasNodes.ts`
- `src/features/canvas/domain/nodeRegistry.ts`

3. 节点与覆盖层
- `src/features/canvas/nodes/*.tsx`
- `src/features/canvas/ui/SelectedNodeOverlay.tsx`
- `src/features/canvas/ui/NodePromptInput.tsx`
- `src/features/canvas/ui/NodeActionToolbar.tsx`
- `src/features/canvas/ui/NodeToolDialog.tsx`

4. 工具体系（重点）
- `src/features/canvas/tools/types.ts`
- `src/features/canvas/tools/builtInTools.ts`
- `src/features/canvas/ui/tool-editors/*`
- `src/features/canvas/application/toolProcessor.ts`

5. 模型与供应商适配
- `src/features/canvas/models/types.ts`
- `src/features/canvas/models/registry.ts`
- `src/features/canvas/models/image/*`
- `src/features/canvas/models/providers/*`

6. Tauri 命令与持久化
- `src/commands/*.ts`
- `src-tauri/src/commands/*.rs`
- `src-tauri/src/lib.rs`

## 3. 开发工作流

1. 明确变更范围
- 先界定是 UI 变更、节点行为变更、工具逻辑变更、模型适配变更，还是持久化/性能变更。

2. 沿着数据流改动
- UI 输入 -> Store -> 应用服务 -> 基础设施（命令/API）-> 持久化。
- 禁止跨层“偷改”状态；尽量只在对应层处理对应职责。

3. 小步提交与即时验证
- 每次改动后做轻量检查（见第 6 节），通过后再继续。

4. 最后做一次完整构建
- 在功能收尾或大改合并前运行完整构建。

## 4. 架构与解耦标准

### 4.1 依赖与边界

- 模块间优先依赖接口/类型，不直接依赖具体实现细节。
- 跨模块通信优先使用事件总线或明确的 service/port。
- 展示层（UI）不直接耦合基础设施层（Tauri/API 调用）；通过应用层中转。

### 4.2 单一职责

- 一个文件只做一个业务概念；无法用三句话说清职责就应拆分。
- 工具 UI、工具数据结构、工具执行逻辑应分离（已采用：editor / annotation codec / processor）。

### 4.3 文件规模控制

- 舒适区：类 <= 400 行，脚本 <= 300 行。
- 警戒线：800 行，必须评估拆分。
- 强制拆分：1000 行（纯数据定义除外）。

### 4.4 层间通信

- 使用 DTO/纯数据对象，避免双向引用。
- Store 不应直接承担重业务逻辑；业务逻辑放应用层。

## 5. UI/交互规范

- 复用统一 UI 组件：`src/components/ui/primitives.tsx`。
- 风格统一使用设计变量和 token（`index.css`），避免散落硬编码样式。
- 输入框、工具条、弹窗保持与节点对齐，交互动画保持一致。
- 对话框支持“打开/关闭”过渡，避免突兀闪烁。
- 明暗主题要可读，避免高饱和蓝色抢占焦点（导航图已优化为灰黑系）。

## 6. 命令与验证

### 6.1 常用开发命令

```bash
# 前端开发
npm run dev

# Tauri 联调
npm run tauri dev
```

### 6.2 快速检查（优先执行）

```bash
# TS 类型检查
npx tsc --noEmit

# Rust 快速检查
cd src-tauri && cargo check
```

### 6.3 收尾检查

```bash
# 前端完整构建
npm run build
```

说明：
- 日常迭代不要求每次都完整打包，先走 `tsc --noEmit` + 关键路径手测。
- 影响打包、依赖、入口、持久化、Tauri 命令时，再执行完整构建。

## 7. 性能实践

- 禁止在拖拽每一帧执行重持久化或重计算。
- 节点拖拽中不要写盘；拖拽结束再保存（项目已按该策略优化）。
- 大图片场景避免重复 `dataURL` 转换；只在必要节点执行。
- 优先使用 `useMemo/useCallback` 控制重渲染；避免把大对象直接塞进依赖导致抖动。
- 画布交互优先“流畅”而非“实时全量持久化”，可使用短延迟合并保存。

## 8. 模型与工具扩展规范

### 8.1 新模型接入

- 一模型一文件，放到 `src/features/canvas/models/image/<provider>/`。
- 在模型定义中声明：
  - `displayName`
  - `providerId`
  - 支持分辨率/比例
  - 默认参数
  - 请求映射函数 `resolveRequest`

### 8.2 新工具接入

1. 在 `tools/types.ts` 声明能力（如 editor kind）。
2. 在 `tools/builtInTools.ts` 注册插件。
3. 在 `ui/tool-editors/` 新增对应编辑器。
4. 在 `application/toolProcessor.ts` 接入执行逻辑。
5. 保证产物仍走“处理后生成新节点”链路，不覆盖原节点。

## 9. 持久化规范

- 项目数据通过 `projectStore` 自动持久化，不要求手动保存。
- 重启默认进入项目页；进入项目时恢复上次 viewport。
- 改动持久化结构时必须写迁移逻辑（`version + migrate`）。

## 10. 提交前检查清单

- 功能路径可用（至少手测 1 条主路径 + 1 条异常路径）。
- 无明显性能回退（拖拽、缩放、输入响应）。
- 轻量检查通过：`npx tsc --noEmit`，Rust 改动则 `cargo check`。
- 大改或发布前：`npm run build`。
- 新增约束/行为变化需同步更新文档。

## 11. i18n 规范

- i18n 入口：`src/i18n/index.ts`
- 语言文件：`src/i18n/locales/zh.json`、`src/i18n/locales/en.json`
- 组件中统一使用 `useTranslation()` + `t('key.path')`，避免硬编码中英文文案。

### 11.1 Key 命名

- 使用模块化层级命名：`project.title`、`node.menu.uploadImage`、`common.save`。
- 避免把中文句子直接作为 key；key 必须稳定、可复用、可检索。
- 通用文案优先放 `common.*`，页面专属文案放对应模块前缀。

### 11.2 新增文案流程

1. 先在 `zh.json` 增加新 key。
2. 同步在 `en.json` 增加相同 key（不要缺语言键）。
3. 代码里只引用 key，不写 fallback 字面量。

### 11.3 动态值与复数

- 动态值用插值：`t('xxx', { count, name })`。
- 数量相关场景使用 i18next 复数规则，不手写字符串拼接。
- 数字/时间等先格式化，再传给 `t`。

### 11.4 最低验证

- 切换中英文后，不出现未翻译 key 泄露（例如直接显示 `project.title`）。
- 新增 key 在中英语言包均存在。
- 关键按钮、提示、错误文案在两种语言下都可读不截断。

---

如与用户明确要求冲突，以用户要求优先；如与运行时安全冲突，以安全优先。
