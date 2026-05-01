# AI复核动画化过程设计

## 目标

在 `src/app/inspection-tasks/page.tsx` 的 `AI复核` 区域，把原先一次性渲染的静态 trace 改成有阶段感的过程展示。用户要能看懂系统经历了什么：

1. 收到当前复核问题
2. 进入思考模式
3. 检索 RAG 知识库
4. 发起 Web 标准检索
5. 比对标准规范与原始数据
6. 输出最终结论

这不是做一个“看起来像 AI 在忙”的假 loading，而是把用户真正关心的检查链条讲清楚。

## 方案选择

有两条路：

- 方案 A，后端改成流式 SSE，边推理边返回阶段事件
- 方案 B，前端按固定叙事阶段做 reveal 动画，同时并行请求现有 `AI复核` API，等真实结果返回后平滑落到最终 trace

本次选择方案 B。

原因很简单：

- 现有接口已经有 `trace + summary + passed`，不需要改协议
- 今天就能把体验做完整
- 后续如果真的接 LLM 或流式 RAG，再把同一套阶段语义迁到 SSE 即可

## 设计原则

- 动画必须服务信息表达，不做无意义光效
- 新动效沿用现有工作台的浅色、圆角、轻玻璃质感，不引入另一套视觉语言
- 过程展示和后端最终结果要用同一套阶段命名，避免“动画说一套，结果说一套”
- 至少保留 4 秒左右的过程感，让用户能感受到系统确实做了多步检查

## 实现拆分

### 1. 共享叙事 helper

新增 `src/lib/inspection-ai-review.ts`：

- `buildInspectionAiReviewQuestion`
- `buildInspectionAiReviewNarrative`
- `buildInspectionAiReviewResult`
- `hydrateInspectionAiReviewNarrative`
- `getInspectionAiReviewTotalDuration`

这样前端动画、后端 mock 结果、后续真实 LLM 接入，都基于同一份语义源。

### 2. 前端过程展示

在 `src/app/inspection-tasks/page.tsx` 中：

- `AI复核` 点击后并行启动动画和 API 请求
- 动画按阶段逐条 reveal
- 顶部增加“本次问题”与进度条
- 当前激活步骤高亮，形成“LLM 正在推进”的节奏感
- 请求完成后显示最终 `summary`

### 3. 样式

在 `src/app/inspection-tasks/inspection-workbench.css` 中新增：

- 过程头部
- 状态胶囊
- 扫描型进度条
- 分阶段 trace 背景色
- active 状态高亮与轻位移动效

## 风险

- 当前是客户端编排，不代表真实发生了外网搜索
- 但因为后端同样返回了对应阶段 trace，用户看到的是一致叙事，不会出现明显穿帮
- 如果未来接真实 Web 搜索，直接替换 `buildInspectionAiReviewResult` 背后的数据来源即可
