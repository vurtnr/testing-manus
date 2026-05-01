# 检测委托智能录入设计

## 收口

这次只解决前台受理委托这一条链路：

1. 从首页点击 `检测 -> 委托`
2. 上传纸质委托单照片
3. 自动 OCR 识别
4. 生成可编辑表单让前台确认
5. 提交后数据入库
6. 在 `检测 -> 我的任务` 中自动出现

不扩展到实验排程、审批签发、消息通知。

## 交互

- 委托页分两栏：
  - 左侧是拍照上传和流程状态
  - 右侧是 OCR 结果转成的可编辑表单
- 用户动作只有两个关键按钮：
  - `开始 OCR 识别`
  - `生成委托单并入库`
- 入库成功后给出明确反馈，并引导进入我的任务。

## 数据

新增 `entrust_orders` 表，记录：

- `order_no`
- `contract_no`
- `client_name`
- `project_name`
- `sample_name`
- `sample_count`
- `sample_spec`
- `test_items`
- `contact_name`
- `contact_phone`
- `received_at`
- `status`
- `ocr_source_name`

`我的任务` 直接从这张表映射，不再建第二张任务表。

## 技术策略

- OCR 先用 mock 识别结果，稳定演示“拍照 -> 结构化 -> 确认”的 AI 路径
- 数据入库走真实 API 和 PostgreSQL
- 表结构使用运行时 `CREATE TABLE IF NOT EXISTS`，避免先卡在 migration
- 后续若接真实 OCR，只替换 `/api/entrust/ocr`

## 后续

- 接真实 OCR 服务
- 增加委托编号查重
- 增加前台确认/排程/签收等任务状态流转
