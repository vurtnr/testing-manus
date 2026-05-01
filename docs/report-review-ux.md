# Report Review UX Design

## Goal
Add a usable `报告审核` flow under the homepage `检测软件` module so inspectors can upload a report, watch the review progress, inspect evidence, resolve issues, and export a final pass/fail decision with reasons.

## Office-Hours Conclusion
The narrow wedge is not "build a full lab operating system." It is "help a reviewer answer: can this report be issued, and why?" The product must reduce manual checklist work, surface standard-backed evidence, and keep a human reviewer in control of the final decision.

## Entry Points
- Homepage capability card: change `检测软件` from `即将上线` to `可用`, with primary CTA `报告审核`.
- Homepage scenario card: `报告审核场景` opens the same flow with a prefilled template.
- Task input shortcut: phrases like `审核今天新增的检测报告` route into the report-review workspace instead of generic chat.

## IA
- Step 1: Upload report
- Step 2: Parsing and extraction
- Step 3: Review workbench
- Step 4: Decision and export

## Primary User Flow
1. User clicks `检测软件` or `报告审核场景`.
2. System opens a dedicated `报告审核` workspace, not a chat-only task.
3. User uploads one report package: PDF/Word plus optional attachments.
4. System shows a multi-stage progress rail:
   - `文件上传`
   - `结构化提取`
   - `规则引擎审核`
   - `标准依据检索`
   - `Agent 复核`
   - `结论生成`
5. User lands in the review workbench with three synchronized panes:
   - Left: report outline and extracted fields
   - Center: issue timeline grouped by severity
   - Right: evidence drawer with cited standards and reasoning
6. User resolves or overrides issues, adds comments, and confirms the final decision.
7. System exports an audit report with `通过 / 不通过 / 需补正` plus evidence summary.

## Key Screens

### 1. Homepage Entry
- Card subtitle: `报告审核、合同评审与财务统计自动化处理`
- Card actions on hover:
  - `开始审核`
  - `查看样例`
- Visual cue: status pill `可用`, not `即将上线`

### 2. Upload Screen
- Header: `报告审核`
- Dropzone copy: `上传检测报告，系统将自动提取结构、匹配标准并生成审核意见`
- Secondary options:
  - `选择报告模板`
  - `导入历史项目`
- Right-side checklist:
  - supported formats
  - expected fields
  - estimated review time

### 3. Progress Screen
- Replace spinner with a vertical stage tracker.
- Each stage has:
  - current status
  - short explanation
  - elapsed time
- If a stage stalls, show `仍在处理中，可先查看已识别内容`.
- Provide optimistic partial preview as soon as extraction completes.

### 4. Review Workbench
- Left pane: `报告结构`
  - basic info
  - specimen/test items
  - conclusion section
  - signature/stamp/completeness checks
- Center pane: `审核问题`
  - severity tabs: `高风险`, `需补正`, `建议`
  - cards show title, impacted section, confidence, owner action
- Right pane: `依据与解释`
  - matched standard clauses
  - rule-engine hit
  - LLM review reasoning
  - historical similar cases

### 5. Decision Screen
- Sticky summary bar:
  - `高风险 2`
  - `需补正 4`
  - `建议 3`
- Decision buttons:
  - `通过`
  - `需补正`
  - `不通过`
- Required comment box for `需补正` and `不通过`
- Export actions:
  - `导出审核报告`
  - `发送复核意见`
  - `保存草稿`

## UX Rules
- Never block the whole page once extraction has started; show partial results early.
- Keep "AI did something" language out of the UI. Use reviewer language: `发现问题`, `匹配依据`, `建议处理`.
- Every issue card must answer:
  - what is wrong
  - where it is
  - why it matters
  - what the reviewer should do
- Human override is first-class:
  - `标记为已接受`
  - `忽略本条`
  - `补充人工意见`

## States
- Empty: prompt upload with one example report
- Parsing: staged progress with preview
- Success: open review workbench automatically
- Failure: stage-specific error plus `重新处理` and `下载原文件`
- No issues found: still require final reviewer confirmation

## Visual Direction
- Reuse the current teal workbench language.
- Introduce amber for `审核中`, red for `高风险`, green for `通过`.
- Prefer dense inspection UI over marketing cards.
- Use bordered panels, compact typography, and status chips rather than large empty whitespace.

## Components
- `ReportReviewEntryCard`
- `ReportUploadPanel`
- `ReviewProgressRail`
- `ReviewIssueList`
- `EvidenceClauseCard`
- `ReviewerDecisionBar`
- `AuditExportSheet`

## Acceptance Criteria
- A first-time user can start a report review from the homepage in one click.
- Upload progress and review-stage progress are visually distinct.
- The user can inspect every issue with linked evidence before making a decision.
- Final output always includes decision, reasons, and cited basis.

## Wireframes

### Homepage Entry
```text
+--------------------------------------------------------------+
| 系统能力                                                     |
|                                                              |
| [检测软件] [可用]                                             |
| 报告审核、合同评审与财务统计自动化处理                        |
| [报告审核] [合同评审] [财务统计]                              |
|                                         [开始审核] [查看样例] |
+--------------------------------------------------------------+
```

### Upload Screen
```text
+-----------------------------+--------------------------------+
| 报告审核                    | 上传说明                        |
|                             | - 支持 PDF / Word / 附件包      |
| [拖拽上传区域]              | - 自动提取结构化字段            |
| 上传检测报告或点击选择      | - 预计 2-5 分钟完成首轮审核     |
|                             | - 可中途查看已识别内容          |
| [选择文件] [导入样例]       |                                  |
+-----------------------------+--------------------------------+
```

### Progress Screen
```text
+--------------------------------------------------------------+
| 报告审核 / JGJ-T 294-2013.pdf                                |
|                                                              |
| 1 文件上传        已完成   4s                                |
| 2 结构化提取      进行中   已解析 14/35 页                   |
| 3 规则引擎审核    等待中                                      |
| 4 标准依据检索    等待中                                      |
| 5 Agent 复核      等待中                                      |
| 6 结论生成        等待中                                      |
|                                                              |
| [已识别内容预览] [取消任务]                                   |
+--------------------------------------------------------------+
```

### Review Workbench
```text
+----------------------+-------------------------+----------------------+
| 报告结构             | 审核问题                | 依据与解释           |
|                      |                         |                      |
| 基本信息             | [高风险 2] [需补正 4]   | 标准条款             |
| 试件信息             | [建议 3]                | - JGJ/T 294-2013 3.2 |
| 检测结论             |                         | - JGJ/T 294-2013 5.1 |
| 原始记录             | 问题卡 1                |                      |
| 签字盖章             | 标题                    | 规则命中             |
|                      | 位置                    | 语义理解             |
|                      | 处理建议                | 历史相似案例         |
+----------------------+-------------------------+----------------------+
| [通过] [需补正] [不通过]  审核意见 ________________________   |
+--------------------------------------------------------------+
```

## Interaction Details

### Homepage
- `检测软件` 卡片 hover 时显示双 CTA：`开始审核`、`查看样例`
- 点击卡片主区域默认进入 `报告审核`
- `报告审核场景` 点击后直接进入上传页，并自动带入默认任务名 `审核检测报告`

### Upload
- 单文件上传是默认路径，多文件只允许作为附件补充
- 文件一旦开始上传，立即出现上传任务卡
- 上传成功后不保留成功卡，只保留 `解析中` 和 `失败` 卡
- 若用户关闭页面，提示 `审核任务仍在后台进行`

### Progress
- 主进度是“审核阶段进度”，不是单纯的上传百分比
- 如果 `结构化提取` 超过 20 秒，出现辅助说明：`扫描版报告较慢，可先查看已识别内容`
- 阶段完成后展示产出摘要，例如：
  - `已识别 35 页`
  - `抽取字段 26 项`
  - `命中规则 9 条`

### Review Workbench
- 点击左侧结构节点，中心问题列表自动过滤到该章节
- 点击中心问题卡，右侧证据抽屉自动滚动到对应标准条款
- 支持 reviewer 动作：
  - `接受问题`
  - `忽略问题`
  - `转人工复核`
  - `补充备注`
- 问题卡默认按 severity 排序，再按置信度排序

### Decision and Export
- 若仍有 `高风险` 未处理，`通过` 按钮 disabled
- `需补正` 和 `不通过` 必填意见
- 导出前弹出确认层，展示：
  - 最终结论
  - 问题统计
  - 依据条款数量
  - 审核人备注

## State Matrix

| State | User sees | Primary action | Secondary action |
|---|---|---|---|
| Empty | 上传引导 + 样例入口 | 上传报告 | 查看样例 |
| Uploading | 文件进度卡 | 继续等待 | 取消上传 |
| Extracting | 阶段进度 + 预览 | 查看已识别内容 | 返回首页 |
| Reviewing | 三栏审核工作台 | 处理问题 | 切换章节/证据 |
| Needs Fix | 高风险/补正项高亮 | 填写处理意见 | 导出问题单 |
| Passed | 通过摘要 | 导出审核报告 | 存档 |
| Failed | 失败原因 | 重新处理 | 下载原文件 |

## Microcopy
- Entry CTA: `开始审核`
- Upload helper: `上传检测报告，系统将自动匹配标准并生成审核意见`
- Stage helper: `系统正在提取报告结构并匹配审核依据`
- High-risk card CTA: `立即处理`
- No issues: `未发现明显问题，仍需你完成最终确认`
- Export success: `审核报告已生成，可发送给复核人或直接归档`

## Component Rules
- `ReviewProgressRail`
  - vertical stage list
  - supports `waiting`, `running`, `done`, `failed`
- `ReviewIssueList`
  - sticky severity tabs
  - card density optimized for 6-12 issues per screen
- `EvidenceClauseCard`
  - standard number
  - clause text
  - hit source (`规则`, `语义检索`, `历史案例`)
- `ReviewerDecisionBar`
  - sticky bottom
  - always visible in workbench
  - displays unresolved issue counters

## Implementation Slice Recommendation
- Slice 1: homepage entry + upload screen + progress rail
- Slice 2: review workbench shell with mock issue data
- Slice 3: evidence drawer + decision bar + export flow
- Slice 4: connect rule engine / RAG / agent outputs to real issue cards
