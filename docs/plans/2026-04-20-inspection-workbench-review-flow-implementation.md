# 实验任务工作台与审核流转页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redefine `inspection-tasks` as an experiment task workbench with a right-side raw-data drawer and add a new review queue page reachable from the home inspection module, using the existing system visual language and a minimal status flow from experiment completion to review to issue.

**Architecture:** Keep the existing task model as the single source of truth, but extend it with post-experiment workflow states for raw-data submission, review, and issue readiness. Reuse the existing workbench layout language from `entrust.css` and `report-review.css`, but do not reuse the current report-review business flow. Instead, add a focused raw-data preview/AI-review capability for completed experiment tasks and a separate review queue page for manual approval.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, node:test, plain CSS, existing `@/lib/api` fetch layer, Next API routes

---

## File Map

**Shared workflow model**
- Modify: `src/lib/entrust.ts`
  - Extend task state unions and labels for `awaiting_raw_data`, `awaiting_review`, `awaiting_issue`
  - Add raw-data preview and AI-review summary fields if needed for UI contracts
- Modify: `src/lib/api.ts`
  - Keep task client types aligned with server payloads
  - Add raw-data upload / preview / submit-review helpers
- Modify: `src/lib/entrust.test.ts`
  - Cover the new task-status mapping logic

**Persistence and server workflow**
- Modify: `src/lib/entrust-store.ts`
  - Add runtime schema evolution for raw-data and review fields
  - Add update helpers for post-experiment state transitions
- Modify: `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts`
  - Completion should now land in the “awaiting raw data” state, not jump straight to a generic completed terminal state
- Create: `src/app/api/inspection-tasks/[taskId]/raw-data-preview/route.ts`
  - Accept image upload
  - Return mock OCR table reconstruction plus staged AI-review trace data
- Create: `src/app/api/inspection-tasks/[taskId]/submit-for-review/route.ts`
  - Require successful AI review before moving task to `awaiting_review`
- Create: `src/app/api/inspection-tasks/[taskId]/approve-review/route.ts`
  - Move task to `awaiting_issue`
- Create: `src/app/api/inspection-tasks/[taskId]/reject-review/route.ts`
  - For this demo version, just return “当前流程在建设中...” and do not mutate state

**Inspection workbench UI**
- Modify: `src/app/inspection-tasks/page.tsx`
  - Replace委托心智 with experiment task workbench
  - Add status tabs, task cards, right-side drawer, raw-data upload, preview table, AI-review trace, and submit gating
- Create: `src/app/inspection-tasks/inspection-workbench.css`
  - New page-specific styles built from existing system tokens and patterns

**Review queue UI**
- Create: `src/app/review-tasks/page.tsx`
  - New review queue page reachable from the inspection module
- Create: `src/app/review-tasks/review-tasks.css`
  - Reuse the same workbench grammar as `report-review.css`, but scoped to the new queue page

**Home navigation**
- Modify: `src/app/home/HomeWelcome.tsx`
  - Route inspection review card to the new review queue page
- Modify: `src/components/CapabilityCards.tsx`
  - Update review card copy to match the new review queue concept
- Modify: `src/app/home/navigation.ts`
  - Point inspection review navigation at `/review-tasks`
- Modify: `src/app/home/navigation.test.ts`
  - Update expected route

**Important non-goals**
- Do not implement real role/permission controls
- Do not implement a true reject flow state rollback
- Do not make the reconstructed table editable
- Do not merge this flow into the existing `/report-review` page

---

### Task 1: Extend Task Status Model for Post-Experiment Workflow

**Files:**
- Modify: `src/lib/entrust.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/entrust.test.ts`

- [ ] **Step 1: Write the failing test for post-experiment state labels**

Add this test to `src/lib/entrust.test.ts`:

```ts
test('buildInspectionTask maps raw-data and review workflow states', () => {
  const awaitingRawData = buildInspectionTask({
    id: 'entrust-raw',
    orderNo: 'WT-20260420-010',
    paperEntrustNo: '',
    contractNo: 'HT-20260420-10',
    clientName: '华东建工材料有限公司',
    constructionUnit: '',
    supervisionUnit: '',
    contractorUnit: '',
    projectName: '混凝土样品检测',
    projectLocation: '项目现场',
    witnessName: '',
    witnessPhone: '',
    samplerName: '',
    samplerPhone: '',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '150mm x 150mm x 150mm',
    sampleBatch: '',
    engineeringPart: '',
    manufacturer: '',
    representativeQuantity: '',
    productionDate: '',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: '',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_raw_data',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    ocrSourceName: 'mock.jpg',
    sourceImageName: 'mock.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(awaitingRawData.taskStatus, 'awaiting_raw_data');
  assert.equal(awaitingRawData.status, 'completed');
  assert.equal(awaitingRawData.dueLabel, '待录入原始数据');

  const awaitingReview = buildInspectionTask({
    ...awaitingRawData,
    id: 'entrust-review',
    taskStatus: 'awaiting_review',
  });

  assert.equal(awaitingReview.dueLabel, '待审核');

  const awaitingIssue = buildInspectionTask({
    ...awaitingRawData,
    id: 'entrust-issue',
    taskStatus: 'awaiting_issue',
  });

  assert.equal(awaitingIssue.dueLabel, '待签发');
});
```

- [ ] **Step 2: Run the focused node test to verify the new state test fails**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
FAIL ... Type '"awaiting_raw_data"' is not assignable ...
```

- [ ] **Step 3: Update the shared task status unions and labels**

In `src/lib/entrust.ts`, update the task state unions:

```ts
type InspectionTaskStatus =
  | 'pending_claim'
  | 'in_experiment'
  | 'awaiting_raw_data'
  | 'awaiting_review'
  | 'awaiting_issue';
```

Use that union for:

- `EntrustFormData.taskStatus`
- `InspectionTaskItem.taskStatus`

Then update `buildInspectionTask()` so labels map like this:

```ts
const completedWorkflow = ['awaiting_raw_data', 'awaiting_review', 'awaiting_issue'].includes(record.taskStatus);
const inExperiment = record.taskStatus === 'in_experiment';

const dueLabel =
  record.taskStatus === 'awaiting_raw_data'
    ? '待录入原始数据'
    : record.taskStatus === 'awaiting_review'
      ? '待审核'
      : record.taskStatus === 'awaiting_issue'
        ? '待签发'
        : inExperiment
          ? '实验进行中'
          : '待选择设备并开始实验';
```

Set `status: 'completed'` for all post-experiment workflow states, because from the experimenter’s physical-work perspective the experiment is already complete.

Mirror the same union changes in `src/lib/api.ts`.

- [ ] **Step 4: Re-run the focused node test and verify it passes**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
All entrust tests pass, including the new workflow-state test
```

- [ ] **Step 5: Commit the shared status-model change**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust.test.ts
git commit -m "feat: extend inspection task workflow states"
```

---

### Task 2: Add Persistence Fields and Helpers for Raw Data and Review Flow

**Files:**
- Modify: `src/lib/entrust-store.ts`

- [ ] **Step 1: Extend the runtime schema evolution for review-flow metadata**

In `src/lib/entrust-store.ts`, add these optional columns to `ensureEntrustOrdersTable()`:

```ts
['raw_data_image_path', 'TEXT'],
['raw_data_image_name', 'TEXT'],
['raw_data_preview_json', 'JSONB'],
['ai_review_trace_json', 'JSONB'],
['ai_review_summary', 'TEXT'],
['ai_review_passed', 'BOOLEAN NOT NULL DEFAULT false'],
['review_comment', 'TEXT'],
['reviewed_at', 'TIMESTAMPTZ'],
```

Do not create a standalone SQL migration file for this feature. Stay on the existing runtime schema-evolution pattern already used by `entrust_orders`.

- [ ] **Step 2: Extend the record mapper with the new fields**

Add these fields to the mapped record return:

```ts
rawDataImagePath: record.raw_data_image_path ?? '',
rawDataImageName: record.raw_data_image_name ?? '',
rawDataPreviewJson: record.raw_data_preview_json ?? null,
aiReviewTraceJson: record.ai_review_trace_json ?? null,
aiReviewSummary: record.ai_review_summary ?? '',
aiReviewPassed: record.ai_review_passed ?? false,
reviewComment: record.review_comment ?? '',
reviewedAt: record.reviewed_at ?? '',
```

Also extend the corresponding TypeScript interface in `src/lib/entrust.ts` so later tasks can rely on the fields without `any`.

- [ ] **Step 3: Add focused store helpers for workflow transitions**

Create or extend helpers in `src/lib/entrust-store.ts` for:

```ts
export async function saveInspectionRawDataPreview(
  userId: string,
  id: string,
  payload: {
    rawDataImagePath: string;
    rawDataImageName: string;
    rawDataPreviewJson: unknown;
    aiReviewTraceJson: unknown;
    aiReviewSummary: string;
    aiReviewPassed: boolean;
  },
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> { ... }

export async function submitInspectionTaskForReview(
  userId: string,
  id: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> { ... }

export async function approveInspectionTaskReview(
  userId: string,
  id: string,
  reviewComment: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> { ... }
```

Rules:

- `saveInspectionRawDataPreview()` stores the preview payload and `aiReviewPassed`
- `submitInspectionTaskForReview()` moves `task_status` to `awaiting_review`
- `approveInspectionTaskReview()` stores `review_comment`, stamps `reviewed_at`, and moves `task_status` to `awaiting_issue`

- [ ] **Step 4: Add a failing guard test for the status-label mapping using the new fields**

Extend `src/lib/entrust.test.ts` with a minimal test proving the record can still be mapped when review metadata is present:

```ts
test('buildInspectionTask ignores stored raw-data metadata when deriving list display', () => {
  const task = buildInspectionTask({
    // reuse a valid entrust record
    id: 'entrust-meta',
    orderNo: 'WT-20260420-011',
    paperEntrustNo: '',
    contractNo: 'HT-20260420-11',
    clientName: '华东建工材料有限公司',
    constructionUnit: '',
    supervisionUnit: '',
    contractorUnit: '',
    projectName: '混凝土样品检测',
    projectLocation: '',
    witnessName: '',
    witnessPhone: '',
    samplerName: '',
    samplerPhone: '',
    sampleName: '混凝土试块',
    sampleCount: 3,
    sampleSpec: '150 x 150 x 150',
    sampleBatch: '',
    engineeringPart: '',
    manufacturer: '',
    representativeQuantity: '',
    productionDate: '',
    testItems: '抗压',
    testStandard: 'GB/T 50081-2019',
    sampleCode: '',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'awaiting_review',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    rawDataImagePath: 'inspection/raw-1.png',
    rawDataImageName: 'raw-1.png',
    rawDataPreviewJson: { groups: 3 },
    aiReviewTraceJson: [{ step: 'ocr' }],
    aiReviewSummary: '可进入下一步签发',
    aiReviewPassed: true,
    reviewComment: '',
    reviewedAt: '',
    ocrSourceName: 'mock.jpg',
    sourceImageName: 'mock.jpg',
    sourceImagePath: 'entrust/mock.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(task.orderNo, 'WT-20260420-011');
  assert.equal(task.dueLabel, '待审核');
});
```

- [ ] **Step 5: Run the verification for store-layer changes**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
All entrust tests pass
```

- [ ] **Step 6: Commit the persistence-layer changes**

```bash
git add src/lib/entrust.ts src/lib/entrust-store.ts src/lib/entrust.test.ts
git commit -m "feat: persist raw-data review workflow metadata"
```

---

### Task 3: Add Raw-Data Preview and Review Transition APIs

**Files:**
- Create: `src/app/api/inspection-tasks/[taskId]/raw-data-preview/route.ts`
- Create: `src/app/api/inspection-tasks/[taskId]/submit-for-review/route.ts`
- Create: `src/app/api/inspection-tasks/[taskId]/approve-review/route.ts`
- Create: `src/app/api/inspection-tasks/[taskId]/reject-review/route.ts`
- Modify: `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Change experiment completion to land in `awaiting_raw_data`**

In `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts`, change the transition:

```ts
const updated = await updateEntrustTaskAssignment(
  user.id,
  taskId,
  'awaiting_raw_data',
  task.experimenterName,
  {
    assignedEquipmentId: task.assignedEquipmentId,
    assignedEquipmentName: task.assignedEquipmentName,
  },
  tx
);
```

This keeps the equipment snapshot but frees the equipment itself back to `idle`.

- [ ] **Step 2: Create the raw-data preview API with mock OCR and AI review trace**

Create `src/app/api/inspection-tasks/[taskId]/raw-data-preview/route.ts` that:

1. Accepts `multipart/form-data` with an image file
2. Confirms the task exists and is in `awaiting_raw_data`
3. Saves the uploaded image under a dedicated folder, for example `uploads/inspection-raw-data/`
4. Returns a mocked reconstruction payload shaped like:

```ts
{
  preview: {
    headers: ['组号', '试件长(mm)', '试件宽(mm)', '破坏荷载(kN)', '抗压强度(MPa)', '代表值(MPa)', '占设计强度值(%)'],
    rows: [
      ['1', '150', '150', '726.8', '32.3', '31.7', '105.6'],
      ['2', '150', '150', '682.1', '30.3', '31.7', '105.6'],
      ['3', '150', '150', '713.6', '31.7', '31.7', '105.6'],
    ],
  },
  trace: [
    { id: 'ocr', label: 'OCR', detail: '已识别 3 组试件尺寸与破坏荷载' },
    { id: 'formula', label: 'Tool', detail: '查询标准公式：立方体抗压强度 = 破坏荷载 / 受压面积' },
    { id: 'conclusion', label: 'AI', detail: '按 150mm x 150mm 截面计算，结果与标准公式吻合' },
  ],
  summary: 'AI 结论：原始数据与标准规范公式吻合，可以进入下一步签发。',
  passed: true,
}
```

Then persist that payload via `saveInspectionRawDataPreview(...)`.

- [ ] **Step 3: Create the submit-for-review API**

Create `src/app/api/inspection-tasks/[taskId]/submit-for-review/route.ts` with this logic:

```ts
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const task = await getEntrustOrderById(user.id, taskId);

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.taskStatus !== 'awaiting_raw_data') {
      return NextResponse.json({ error: '当前任务不能提交审核' }, { status: 409 });
    }
    if (!task.aiReviewPassed) {
      return NextResponse.json({ error: '请先完成 AI复核' }, { status: 409 });
    }

    const updated = await submitInspectionTaskForReview(user.id, taskId);
    if (!updated) {
      return NextResponse.json({ error: '提交审核失败' }, { status: 500 });
    }

    return NextResponse.json(buildInspectionTask(updated));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create the approve and reject review APIs**

Create `src/app/api/inspection-tasks/[taskId]/approve-review/route.ts`:

```ts
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    const task = await getEntrustOrderById(user.id, taskId);
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.taskStatus !== 'awaiting_review') {
      return NextResponse.json({ error: '当前任务不是待审核状态' }, { status: 409 });
    }

    const updated = await approveInspectionTaskReview(user.id, taskId, comment);
    if (!updated) {
      return NextResponse.json({ error: '审核通过失败' }, { status: 500 });
    }

    return NextResponse.json(buildInspectionTask(updated));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Create `src/app/api/inspection-tasks/[taskId]/reject-review/route.ts`:

```ts
export async function POST() {
  return NextResponse.json(
    { error: '当前流程在建设中...' },
    { status: 409 }
  );
}
```

- [ ] **Step 5: Add the matching client helpers**

In `src/lib/api.ts`, add:

```ts
export interface InspectionRawDataPreview {
  preview: {
    headers: string[];
    rows: string[][];
  };
  trace: Array<{
    id: string;
    label: string;
    detail: string;
  }>;
  summary: string;
  passed: boolean;
}

export async function getInspectionRawDataPreview(
  taskId: string,
  image: File
): Promise<InspectionRawDataPreview> { ... }

export async function submitInspectionTaskForReview(taskId: string): Promise<InspectionTaskItem> { ... }

export async function approveInspectionTaskReview(taskId: string, comment: string): Promise<InspectionTaskItem> { ... }

export async function rejectInspectionTaskReview(taskId: string): Promise<void> { ... }
```

Use the same `authFetch` and `FormData` conventions already used by `uploadFile()` and `runEntrustOcr()`.

- [ ] **Step 6: Verify the API flow manually**

Run:

```bash
npm run dev
```

Then manually verify:

1. A completed experiment task returns `taskStatus: "awaiting_raw_data"`
2. Uploading a raw-data image returns preview JSON, trace entries, and `passed: true`
3. Submitting for review returns `taskStatus: "awaiting_review"`
4. Approving review returns `taskStatus: "awaiting_issue"`
5. Rejecting review returns `409` with `当前流程在建设中...`

- [ ] **Step 7: Commit the API workflow**

```bash
git add src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts src/app/api/inspection-tasks/[taskId]/raw-data-preview/route.ts src/app/api/inspection-tasks/[taskId]/submit-for-review/route.ts src/app/api/inspection-tasks/[taskId]/approve-review/route.ts src/app/api/inspection-tasks/[taskId]/reject-review/route.ts src/lib/api.ts
git commit -m "feat: add inspection raw-data and review workflow APIs"
```

---

### Task 4: Redirect Home Inspection Review Navigation to the New Review Queue

**Files:**
- Modify: `src/app/home/HomeWelcome.tsx`
- Modify: `src/components/CapabilityCards.tsx`
- Modify: `src/app/home/navigation.ts`
- Modify: `src/app/home/navigation.test.ts`

- [ ] **Step 1: Write the failing navigation test**

Update `src/app/home/navigation.test.ts` so the inspection review route expects the new page:

```ts
test('report review scenario routes to the new inspection review queue', () => {
  assert.equal(getScenarioDestination('报告审核场景'), '/review-tasks');
});
```

Also change the capability destination expectation:

```ts
test('inspection capability routes to the inspection review queue', () => {
  assert.equal(getCapabilityDestination('inspection'), '/review-tasks');
});
```

- [ ] **Step 2: Run the navigation test and verify it fails**

Run:

```bash
node --test src/app/home/navigation.test.ts
```

Expected:

```text
FAIL ... '/report-review' !== '/review-tasks'
```

- [ ] **Step 3: Update route mappings and card copy**

In `src/app/home/navigation.ts`:

```ts
export function getCapabilityDestination(id: string): string | null {
  if (id === 'inspection') return '/review-tasks';
  if (id === 'knowledge') return '/knowledge';
  return null;
}

export function getScenarioDestination(name: string): string | null {
  if (name === '报告审核场景') return '/review-tasks';
  if (name === '标准检索场景') return '/knowledge';
  return null;
}
```

In `src/components/CapabilityCards.tsx`, update the review module copy from generic report review to the new queue, for example:

```ts
{ id: 'inspection-review', title: '审核', desc: '进入审核工作台处理待审核原始数据。' },
```

In `src/app/home/HomeWelcome.tsx`, update:

```ts
if (moduleId === 'inspection-review') {
  router.push('/review-tasks');
  return;
}
```

- [ ] **Step 4: Re-run the navigation test and verify it passes**

Run:

```bash
node --test src/app/home/navigation.test.ts
```

Expected:

```text
All navigation tests pass
```

- [ ] **Step 5: Commit the home-navigation changes**

```bash
git add src/app/home/HomeWelcome.tsx src/components/CapabilityCards.tsx src/app/home/navigation.ts src/app/home/navigation.test.ts
git commit -m "feat: route inspection review entry to review queue"
```

---

### Task 5: Rebuild `inspection-tasks` as the Experiment Task Workbench

**Files:**
- Modify: `src/app/inspection-tasks/page.tsx`
- Create: `src/app/inspection-tasks/inspection-workbench.css`

- [ ] **Step 1: Add a failing test for the new status bucket utility**

Do not try to test the whole client page first. Extract the bucketing logic into a small pure helper in `src/app/inspection-tasks/` and test that first.

Create `src/app/inspection-tasks/workbench-groups.test.ts` with:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupInspectionTasksForWorkbench } from './workbench-groups.ts';

test('groupInspectionTasksForWorkbench buckets tasks by next workflow action', () => {
  const grouped = groupInspectionTasksForWorkbench([
    { id: '1', taskStatus: 'awaiting_raw_data', orderNo: 'WT-1' } as any,
    { id: '2', taskStatus: 'awaiting_review', orderNo: 'WT-2' } as any,
    { id: '3', taskStatus: 'awaiting_issue', orderNo: 'WT-3' } as any,
  ]);

  assert.deepEqual(grouped.awaitingRawData.map((task) => task.orderNo), ['WT-1']);
  assert.deepEqual(grouped.awaitingReview.map((task) => task.orderNo), ['WT-2']);
  assert.deepEqual(grouped.awaitingIssue.map((task) => task.orderNo), ['WT-3']);
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
node --test src/app/inspection-tasks/workbench-groups.test.ts
```

Expected:

```text
FAIL ... Cannot find module './workbench-groups.ts'
```

- [ ] **Step 3: Implement the grouping helper**

Create `src/app/inspection-tasks/workbench-groups.ts`:

```ts
import type { InspectionTaskItem } from '@/lib/api';

export function groupInspectionTasksForWorkbench(tasks: InspectionTaskItem[]) {
  return {
    awaitingRawData: tasks.filter((task) => task.taskStatus === 'awaiting_raw_data'),
    awaitingReview: tasks.filter((task) => task.taskStatus === 'awaiting_review'),
    awaitingIssue: tasks.filter((task) => task.taskStatus === 'awaiting_issue'),
  };
}
```

- [ ] **Step 4: Re-run the helper test and verify it passes**

Run:

```bash
node --test src/app/inspection-tasks/workbench-groups.test.ts
```

Expected:

```text
All tests pass
```

- [ ] **Step 5: Rewrite the page around the new workbench IA**

In `src/app/inspection-tasks/page.tsx`, remove the委托 header and “新建委托” panel entirely. Replace them with:

1. Workbench header:
   - breadcrumb-style back button
   - title `实验任务工作台`
   - subtitle `按任务单号继续录入原始数据`
2. Status tabs:
   - `待录入原始数据`
   - `待审核`
   - `待签发`
3. Left task list:
   - task number prominent
   - sample name / test items / equipment line
   - `录入原始数据` primary action only on `awaiting_raw_data`
4. Right drawer state:
   - placeholder when no task selected
   - upload zone
   - reconstructed table
   - `AI复核` trace log
   - disabled `提交` until review passes

Use the screenshot-driven structure from:

[`inspection-workbench-sketch.png`](/tmp/inspection-workbench-sketch.png)

For the page state, add:

```ts
const [activeTab, setActiveTab] = useState<'awaiting_raw_data' | 'awaiting_review' | 'awaiting_issue'>('awaiting_raw_data');
const [selectedTask, setSelectedTask] = useState<InspectionTaskItem | null>(null);
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [preview, setPreview] = useState<InspectionRawDataPreview | null>(null);
const [previewLoading, setPreviewLoading] = useState(false);
const [submitLoading, setSubmitLoading] = useState(false);
```

When the user clicks `录入原始数据`, open the drawer by setting `selectedTask`.

When the user uploads a file, call `getInspectionRawDataPreview(task.id, file)`.

Only after `preview?.passed === true` should `提交` call `submitInspectionTaskForReview(task.id)`.

- [ ] **Step 6: Add page-specific CSS that reuses the existing visual language**

Create `src/app/inspection-tasks/inspection-workbench.css` and follow these rules:

- Reuse the same background treatment as `report-review.css`
- Reuse rounded white panels like `entrust.css`
- Use teal as the only accent color
- Use a gray-header table that echoes the provided sample image
- Keep the AI-review log as stacked chips/cards, not terminal green-on-black

Start with this shell:

```css
.inspection-workbench-layout {
  height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 28%),
    linear-gradient(180deg, #f7fbfa 0%, #eef4f3 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inspection-workbench-body {
  padding: 28px 24px 32px;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(420px, 0.95fr);
  gap: 18px;
}
```

Then carry over the same spacing, border, and panel grammar used in `report-review.css`.

- [ ] **Step 7: Verify the workbench page behavior manually**

Run:

```bash
npm run dev
```

Manual expectations:

1. No委托文案 remains on `/inspection-tasks`
2. Task-number-first cards are visible
3. Clicking `录入原始数据` opens the right drawer
4. Uploading the sample image shows the reconstructed table
5. `提交` is disabled until AI review finishes
6. Successful submit moves the task from `待录入原始数据` to `待审核`

- [ ] **Step 8: Commit the workbench UI**

```bash
git add src/app/inspection-tasks/page.tsx src/app/inspection-tasks/workbench-groups.ts src/app/inspection-tasks/workbench-groups.test.ts src/app/inspection-tasks/inspection-workbench.css
git commit -m "feat: rebuild inspection tasks as experiment workbench"
```

---

### Task 6: Build the New Review Queue Page

**Files:**
- Create: `src/app/review-tasks/page.tsx`
- Create: `src/app/review-tasks/review-tasks.css`

- [ ] **Step 1: Add a failing test for the review action guard**

Create `src/app/review-tasks/review-actions.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { canApproveReviewTask } from './review-actions.ts';

test('canApproveReviewTask always allows approval and blocks empty implementation assumptions', () => {
  assert.equal(canApproveReviewTask({ taskStatus: 'awaiting_review' } as any), true);
  assert.equal(canApproveReviewTask({ taskStatus: 'awaiting_issue' } as any), false);
});
```

- [ ] **Step 2: Run the review helper test and verify it fails**

Run:

```bash
node --test src/app/review-tasks/review-actions.test.ts
```

Expected:

```text
FAIL ... Cannot find module './review-actions.ts'
```

- [ ] **Step 3: Implement the minimal review helper**

Create `src/app/review-tasks/review-actions.ts`:

```ts
import type { InspectionTaskItem } from '@/lib/api';

export function canApproveReviewTask(task: InspectionTaskItem): boolean {
  return task.taskStatus === 'awaiting_review';
}
```

- [ ] **Step 4: Re-run the helper test and verify it passes**

Run:

```bash
node --test src/app/review-tasks/review-actions.test.ts
```

Expected:

```text
All tests pass
```

- [ ] **Step 5: Build the new review queue page**

Create `src/app/review-tasks/page.tsx` with this structure:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveInspectionTaskReview,
  getInspectionTasks,
  rejectInspectionTaskReview,
  type InspectionTaskItem,
} from '@/lib/api';
import './review-tasks.css';

export default function ReviewTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<InspectionTaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [comment, setComment] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInspectionTasks()
      .then((items) => {
        const reviewTasks = items.filter((task) => task.taskStatus === 'awaiting_review');
        setTasks(reviewTasks);
        setSelectedTaskId(reviewTasks[0]?.id ?? '');
      })
      .catch((err: any) => setError(err.message || '加载审核任务失败'));
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  // handlers omitted here in the plan prose, but implement approve/reject around the API helpers
}
```

Behavior:

- left column = pending review queue
- right column = comment box + approve/reject actions
- `通过` calls `approveInspectionTaskReview`
- `退回` calls `rejectInspectionTaskReview`, catches the 409, and surfaces `当前流程在建设中...`

- [ ] **Step 6: Add review queue CSS that reuses the report-review workbench grammar**

Create `src/app/review-tasks/review-tasks.css` by following `report-review.css`, but simplify it:

- same header rhythm
- same panel treatment
- no upload panel
- queue on the left, decision panel on the right

At minimum include:

```css
.review-tasks-layout {
  height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.12), transparent 28%),
    linear-gradient(180deg, #f7fbfa 0%, #eef4f3 100%);
  display: flex;
  flex-direction: column;
}

.review-tasks-body {
  padding: 28px 24px 32px;
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1.1fr);
  gap: 18px;
}
```

- [ ] **Step 7: Verify the review page manually**

Run:

```bash
npm run dev
```

Manual expectations:

1. Home inspection review card opens `/review-tasks`
2. The page only shows `awaiting_review` tasks
3. Typing a comment and clicking `通过` moves the task to `待签发`
4. Clicking `退回` shows `当前流程在建设中...`

- [ ] **Step 8: Commit the review queue**

```bash
git add src/app/review-tasks/page.tsx src/app/review-tasks/review-tasks.css src/app/review-tasks/review-actions.ts src/app/review-tasks/review-actions.test.ts
git commit -m "feat: add inspection review queue page"
```

---

### Task 7: Final Integration Verification

**Files:**
- Modify: `docs/report-review-ux.md` only if it is now misleading enough to require follow-up documentation

- [ ] **Step 1: Run the focused automated verification set**

Run:

```bash
node --test src/lib/entrust.test.ts
node --test src/app/home/navigation.test.ts
node --test src/app/inspection-tasks/workbench-groups.test.ts
node --test src/app/review-tasks/review-actions.test.ts
```

Expected:

```text
All four node:test commands pass
```

- [ ] **Step 2: Run manual end-to-end flow verification**

Run the app locally and validate this exact path:

1. Finish an experiment, task lands in `待录入原始数据`
2. Open `/inspection-tasks`
3. Find the task by `任务单号`
4. Open the drawer and upload the sample image
5. Verify the reconstructed table resembles the paper sample structure
6. Click `AI复核` and confirm the staged trace appears
7. Confirm `提交` stays disabled before review and becomes enabled after a passing review
8. Submit for review and confirm the task moves to `待审核`
9. From home inspection module, enter the new review page
10. Approve the task and confirm it moves to `待签发`
11. Trigger `退回` once and confirm the page shows `当前流程在建设中...`

- [ ] **Step 3: Create the final integrating commit**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust-store.ts src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts src/app/api/inspection-tasks/[taskId]/raw-data-preview/route.ts src/app/api/inspection-tasks/[taskId]/submit-for-review/route.ts src/app/api/inspection-tasks/[taskId]/approve-review/route.ts src/app/api/inspection-tasks/[taskId]/reject-review/route.ts src/app/home/HomeWelcome.tsx src/components/CapabilityCards.tsx src/app/home/navigation.ts src/app/home/navigation.test.ts src/app/inspection-tasks/page.tsx src/app/inspection-tasks/workbench-groups.ts src/app/inspection-tasks/workbench-groups.test.ts src/app/inspection-tasks/inspection-workbench.css src/app/review-tasks/page.tsx src/app/review-tasks/review-actions.ts src/app/review-tasks/review-actions.test.ts src/app/review-tasks/review-tasks.css
git commit -m "feat: add inspection raw-data and review workbench flow"
```

---

## Self-Review

**Spec coverage:** The plan covers the two-page IA from the approved design: the experiment task workbench with raw-data drawer and the separate review queue page from the home inspection module. It also covers the status flow through `待录入原始数据 -> 待审核 -> 待签发`, the AI-review gating, and the temporary reject behavior.

**Placeholder scan:** No `TODO` or “handle appropriately” gaps remain. All new pages, CSS files, API routes, helper modules, and test files are named explicitly.

**Type consistency:** The plan uses the same workflow-state names everywhere: `awaiting_raw_data`, `awaiting_review`, and `awaiting_issue`. The review queue route is consistently `/review-tasks`, and the raw-data preview payload uses the same `preview / trace / summary / passed` contract in both API and UI tasks.

