# 首页检测任务回流提醒与角标 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return users to the home page after entrust intake, auto-expand the inspection module once, and show dual-layer inspection task badges plus a lightweight task summary until the newest task moves from `pending_claim` / `awaiting_raw_data` into `awaiting_review`.

**Architecture:** Keep the home page as a capability dashboard, not a task center. Add one small domain extension, `pickupDepartment`, and one pure home-side reminder helper that filters tasks to the two “needs continued handling” states. Use a one-shot URL signal on entrust success to auto-expand the inspection module once, then clear it. Reuse the existing `CapabilityCards` visual language and `home.css` styling, only adding badges and one summary card under the expanded inspection module.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, node:test, plain CSS, existing `@/lib/api` fetch layer

---

## File Map

**Domain and persistence**
- Modify: `src/lib/entrust.ts`
  - Add `pickupDepartment` to entrust/task shapes
  - Preserve current workflow state mapping
- Modify: `src/lib/api.ts`
  - Mirror `pickupDepartment` in client task/order types
- Modify: `src/lib/entrust-store.ts`
  - Add runtime schema evolution for `pickup_department`
  - Map the field back out of `entrust_orders`
- Modify: `src/app/api/entrust-orders/route.ts`
  - Default new tasks to `pickupDepartment: '材料所'`
- Modify: `src/lib/entrust.test.ts`
  - Add coverage for the new field flowing through task mapping

**Home reminder logic**
- Create: `src/app/home/inspection-task-reminder.ts`
  - Pure helper for filtering “badge-worthy” tasks and deriving badge text
- Create: `src/app/home/inspection-task-reminder.test.ts`
  - Unit tests for badge visibility/count/label rules

**Homepage UI**
- Modify: `src/app/entrust/page.tsx`
  - On successful intake, redirect to `/?inspectionSignal=created` instead of `/inspection-tasks`
- Modify: `src/components/CapabilityCards.tsx`
  - Add optional badge props for the inspection big card and `inspection-task` module card
  - Support parent-controlled expansion so HomeWelcome can auto-expand once
- Modify: `src/app/home/HomeWelcome.tsx`
  - Read the one-shot return signal
  - Auto-expand the inspection module once
  - Fetch inspection tasks, compute badge state, and render a task summary card
- Modify: `src/app/home/home.css`
  - Add inspection badge and task-summary styles that match the existing home page system language

**Non-goals**
- Do not make the homepage a full task list page
- Do not auto-expand inspection on every visit
- Do not add homepage task actions
- Do not change the existing workbench header or overall homepage layout

---

### Task 1: Add `pickupDepartment` to Entrust and Task Models

**Files:**
- Modify: `src/lib/entrust.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/entrust-store.ts`
- Modify: `src/app/api/entrust-orders/route.ts`
- Modify: `src/lib/entrust.test.ts`

- [ ] **Step 1: Write the failing test for `pickupDepartment` flowing into task data**

Add this assertion block to `src/lib/entrust.test.ts` inside the existing “maps entrust orders into my tasks items” test:

```ts
const task = buildInspectionTask(baseRecord);

assert.equal(task.pickupDepartment, '材料所');
```

Then update `baseRecord` in that test fixture to include:

```ts
pickupDepartment: '材料所',
```

Also add `pickupDepartment` to the other test fixtures in the same file where `EntrustOrderRecord` objects are created, using either `'材料所'` or `''` depending on the scenario.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
FAIL ... Property 'pickupDepartment' does not exist ...
```

- [ ] **Step 3: Add `pickupDepartment` to the shared TypeScript models**

In `src/lib/entrust.ts`, add:

```ts
export interface EntrustFormData {
  // existing fields...
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  ocrSourceName: string;
}

export interface InspectionTaskItem {
  // existing fields...
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  aiReviewSummary: string;
  aiReviewPassed: boolean;
}
```

In `buildInspectionTask(record)`, include:

```ts
pickupDepartment: record.pickupDepartment,
```

In `src/lib/api.ts`, mirror the same field on both `EntrustOrder` and `InspectionTaskItem`.

- [ ] **Step 4: Add runtime persistence for `pickup_department`**

In `src/lib/entrust-store.ts`, update the schema evolution:

```ts
await sql`
  CREATE TABLE IF NOT EXISTS entrust_orders (
    -- existing columns ...
    assigned_equipment_name TEXT,
    pickup_department TEXT,
    raw_data_image_path TEXT,
    ...
  )
`;

const optionalColumns = [
  // existing columns...
  ['pickup_department', 'TEXT'],
] as const;
```

In the mapper:

```ts
pickupDepartment: record.pickup_department ?? '',
```

In the insert statement:

```ts
INSERT INTO entrust_orders (
  -- existing columns...
  assigned_equipment_name,
  pickup_department,
  ocr_source_name,
  ...
) VALUES (
  -- existing values...
  ${data.assignedEquipmentName || null},
  ${data.pickupDepartment || null},
  ${data.ocrSourceName},
  ...
)
```

- [ ] **Step 5: Default new intake tasks to `材料所`**

In `src/app/api/entrust-orders/route.ts`, when calling `insertEntrustOrder(...)`, add:

```ts
pickupDepartment: '材料所',
```

Keep the other default workflow values unchanged:

```ts
taskStatus: 'pending_claim',
experimenterName: '',
assignedEquipmentId: '',
assignedEquipmentName: '',
```

- [ ] **Step 6: Re-run the focused test and verify it passes**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
All entrust tests pass, and the pickupDepartment assertion is green
```

- [ ] **Step 7: Commit the domain-field change**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust-store.ts src/app/api/entrust-orders/route.ts src/lib/entrust.test.ts
git commit -m "feat: add pickup department to inspection task data"
```

---

### Task 2: Add a Pure Helper for Homepage Inspection Task Reminder State

**Files:**
- Create: `src/app/home/inspection-task-reminder.ts`
- Create: `src/app/home/inspection-task-reminder.test.ts`

- [ ] **Step 1: Write the failing helper test for badge visibility, count, and latest-status label**

Create `src/app/home/inspection-task-reminder.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

import { getInspectionTaskReminder } from './inspection-task-reminder.ts';

test('getInspectionTaskReminder counts only pending-claim and awaiting-raw-data tasks and uses latest created task status', () => {
  const result = getInspectionTaskReminder([
    {
      id: 'old-pending',
      orderNo: 'WT-001',
      taskStatus: 'pending_claim',
      createdAt: '2026-04-20T08:00:00Z',
    } as any,
    {
      id: 'new-raw',
      orderNo: 'WT-002',
      taskStatus: 'awaiting_raw_data',
      createdAt: '2026-04-20T10:00:00Z',
    } as any,
    {
      id: 'reviewed',
      orderNo: 'WT-003',
      taskStatus: 'awaiting_review',
      createdAt: '2026-04-20T11:00:00Z',
    } as any,
  ]);

  assert.equal(result.visible, true);
  assert.equal(result.count, 2);
  assert.equal(result.statusLabel, '待录入原始数据');
  assert.equal(result.latestTask?.orderNo, 'WT-002');
});

test('getInspectionTaskReminder hides the badge once all tasks are in later workflow states', () => {
  const result = getInspectionTaskReminder([
    {
      id: 'reviewed',
      orderNo: 'WT-010',
      taskStatus: 'awaiting_review',
      createdAt: '2026-04-20T10:00:00Z',
    } as any,
  ]);

  assert.equal(result.visible, false);
  assert.equal(result.count, 0);
  assert.equal(result.statusLabel, '');
  assert.equal(result.latestTask, null);
});
```

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
node --test src/app/home/inspection-task-reminder.test.ts
```

Expected:

```text
FAIL ... Cannot find module './inspection-task-reminder.ts'
```

- [ ] **Step 3: Implement the pure reminder helper**

Create `src/app/home/inspection-task-reminder.ts`:

```ts
import type { InspectionTaskItem } from '@/lib/api';

const REMINDER_VISIBLE_STATES = new Set(['pending_claim', 'awaiting_raw_data']);

const STATUS_LABELS: Record<string, string> = {
  pending_claim: '待领取',
  awaiting_raw_data: '待录入原始数据',
};

export function getInspectionTaskReminder(tasks: InspectionTaskItem[]) {
  const visibleTasks = tasks
    .filter((task) => REMINDER_VISIBLE_STATES.has(task.taskStatus))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (visibleTasks.length === 0) {
    return {
      visible: false,
      count: 0,
      statusLabel: '',
      latestTask: null as InspectionTaskItem | null,
    };
  }

  const latestTask = visibleTasks[0];

  return {
    visible: true,
    count: visibleTasks.length,
    statusLabel: STATUS_LABELS[latestTask.taskStatus] ?? '',
    latestTask,
  };
}
```

- [ ] **Step 4: Re-run the helper test and verify it passes**

Run:

```bash
node --test src/app/home/inspection-task-reminder.test.ts
```

Expected:

```text
All tests pass
```

- [ ] **Step 5: Commit the reminder helper**

```bash
git add src/app/home/inspection-task-reminder.ts src/app/home/inspection-task-reminder.test.ts
git commit -m "feat: add homepage inspection task reminder helper"
```

---

### Task 3: Return Entrust Intake to Home with a One-Shot Inspection Signal

**Files:**
- Modify: `src/app/entrust/page.tsx`

- [ ] **Step 1: Write the redirect behavior as a local constant before changing the navigation**

At the top of `src/app/entrust/page.tsx`, add:

```ts
const INSPECTION_RETURN_SIGNAL = '/?inspectionSignal=created';
```

This keeps the return target explicit instead of burying a magic query string in the submit handler.

- [ ] **Step 2: Update the success redirect**

In the `handleSubmit()` success path, replace:

```ts
router.push(`/inspection-tasks?highlight=${order.id}`);
```

with:

```ts
setFeedback(`委托单 ${order.orderNo} 已按照片原件入库，正在返回首页。`);
router.push(INSPECTION_RETURN_SIGNAL);
```

Do not add any additional branching here. The homepage will own the one-shot signal handling.

- [ ] **Step 3: Verify the page still compiles**

Run:

```bash
npx tsc --noEmit 2>&1 | rg "entrust/page.tsx" -n -S || true
```

Expected:

```text
no entrust/page.tsx-specific type errors
```

- [ ] **Step 4: Commit the redirect change**

```bash
git add src/app/entrust/page.tsx
git commit -m "feat: return entrust intake flow to home with inspection signal"
```

---

### Task 4: Make the Homepage Inspection Module Controlled and Badge-Aware

**Files:**
- Modify: `src/components/CapabilityCards.tsx`
- Modify: `src/app/home/HomeWelcome.tsx`
- Modify: `src/app/home/home.css`

- [ ] **Step 1: Add controlled expansion and badge props to `CapabilityCards`**

Update the props in `src/components/CapabilityCards.tsx`:

```ts
interface CapabilityBadge {
  count: number;
  statusLabel: string;
}

interface Props {
  onKnowledgeClick: () => void;
  onModuleClick: (moduleId: string) => void;
  expandedId?: CapabilityId | null;
  onExpandedChange?: (id: CapabilityId | null) => void;
  inspectionBadge?: CapabilityBadge | null;
  inspectionTaskBadge?: CapabilityBadge | null;
}
```

Then replace the internal `expandedId` state with a controlled/uncontrolled fallback:

```ts
const [internalExpandedId, setInternalExpandedId] = useState<CapabilityId | null>(null);
const expandedId = controlledExpandedId ?? internalExpandedId;
const setExpandedId = onExpandedChange ?? setInternalExpandedId;
```

Render the big inspection-card badge when:

```ts
capability.id === 'inspection' && inspectionBadge
```

Render the module-level badge on `inspection-task` when:

```ts
module.id === 'inspection-task' && inspectionTaskBadge
```

The badge text should be:

```ts
`${badge.count} · ${badge.statusLabel}`
```

- [ ] **Step 2: Add homepage state for one-shot expansion and reminder fetching**

In `src/app/home/HomeWelcome.tsx`, import:

```ts
import { useEffect, useMemo, useState } from 'react';
import { getInspectionTasks, type InspectionTaskItem } from '@/lib/api';
import { getInspectionTaskReminder } from './inspection-task-reminder';
```

Add homepage state:

```ts
const [expandedCapability, setExpandedCapability] = useState<'sales' | 'inspection' | 'management' | 'knowledge' | null>(null);
const [inspectionTasks, setInspectionTasks] = useState<InspectionTaskItem[]>([]);
const reminder = useMemo(() => getInspectionTaskReminder(inspectionTasks), [inspectionTasks]);
```

Add task fetching:

```ts
useEffect(() => {
  getInspectionTasks().then(setInspectionTasks).catch(() => setInspectionTasks([]));
}, []);
```

Add one-shot signal handling:

```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('inspectionSignal') !== 'created') return;

  setExpandedCapability('inspection');

  params.delete('inspectionSignal');
  const query = params.toString();
  const nextUrl = query ? `/?${query}` : '/';
  window.history.replaceState({}, '', nextUrl);
}, []);
```

- [ ] **Step 3: Render the summary card only when the inspection module is expanded and the reminder is visible**

Under the `CapabilityCards` render in `HomeWelcome`, add:

```tsx
{expandedCapability === 'inspection' && reminder.visible && reminder.latestTask && (
  <div className="inspection-home-reminder-card">
    <div className="inspection-home-reminder-top">
      <strong>{reminder.latestTask.orderNo}</strong>
      <span className="inspection-home-reminder-status">
        {reminder.statusLabel}
      </span>
    </div>
    <div className="inspection-home-reminder-body">
      {reminder.statusLabel === '待领取'
        ? `待领取部门：${reminder.latestTask.pickupDepartment || '材料所'}`
        : '当前状态：待录入原始数据'}
    </div>
  </div>
)}
```

Pass the badge props into `CapabilityCards`:

```tsx
<CapabilityCards
  onKnowledgeClick={navigateToKnowledge}
  onModuleClick={handleModuleClick}
  expandedId={expandedCapability}
  onExpandedChange={setExpandedCapability}
  inspectionBadge={reminder.visible ? { count: reminder.count, statusLabel: reminder.statusLabel } : null}
  inspectionTaskBadge={reminder.visible ? { count: reminder.count, statusLabel: reminder.statusLabel } : null}
/>
```

- [ ] **Step 4: Add the homepage badge and summary-card styling**

In `src/app/home/home.css`, add styles that reuse the existing homepage card system instead of inventing a new pattern:

```css
.capability-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.14);
  color: #a16207;
  font-size: 11px;
  font-weight: 700;
}

.inspection-home-reminder-card {
  margin-top: 14px;
  border: 1px solid rgba(15, 118, 110, 0.1);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  padding: 16px 18px;
}

.inspection-home-reminder-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.inspection-home-reminder-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(245, 158, 11, 0.14);
  color: #a16207;
  font-size: 12px;
  font-weight: 700;
}

.inspection-home-reminder-body {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}
```

- [ ] **Step 5: Verify the homepage behavior manually**

Run:

```bash
npm run dev
```

Manual expectations:

1. Entering `/` normally does **not** auto-expand inspection
2. Visiting `/?inspectionSignal=created` auto-expands inspection once
3. Reloading `/` after the query is cleared does **not** auto-expand again
4. Both the inspection big card and the `我的任务` module card show the same badge text
5. The reminder card shows `待领取部门：材料所` for a newly created task
6. If the latest visible task moves to `awaiting_raw_data`, the badge text switches to `待录入原始数据`

- [ ] **Step 6: Commit the homepage reminder UX**

```bash
git add src/components/CapabilityCards.tsx src/app/home/HomeWelcome.tsx src/app/home/home.css src/app/home/inspection-task-reminder.ts src/app/home/inspection-task-reminder.test.ts
git commit -m "feat: add homepage inspection task reminder badge"
```

---

### Task 5: Final Verification for the Home Return Signal Flow

**Files:**
- No new files beyond earlier tasks

- [ ] **Step 1: Run the focused automated verification set**

Run:

```bash
node --test src/lib/entrust.test.ts
node --test src/app/home/navigation.test.ts
node --test src/app/home/inspection-task-reminder.test.ts
```

Expected:

```text
All three node:test commands pass
```

- [ ] **Step 2: Run the end-to-end manual flow**

Validate this exact sequence:

1. Open `/entrust`
2. Complete OCR intake and click `确认按照片原件入库`
3. Confirm the app returns to `/` with the inspection module auto-expanded once
4. Confirm the `检测` big card and `我的任务` module card both show a badge like `1 · 待领取`
5. Confirm the summary card shows `待领取部门：材料所`
6. After the app-side task is claimed and experiment is completed, refresh `/`
7. Confirm the homepage badge remains, but the text changes to `待录入原始数据`
8. After raw data is submitted and the task enters `awaiting_review`, refresh `/`
9. Confirm both homepage badges disappear

- [ ] **Step 3: Create the integrating commit**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust-store.ts src/app/api/entrust-orders/route.ts src/app/entrust/page.tsx src/components/CapabilityCards.tsx src/app/home/HomeWelcome.tsx src/app/home/home.css src/app/home/inspection-task-reminder.ts src/app/home/inspection-task-reminder.test.ts src/lib/entrust.test.ts
git commit -m "feat: surface inspection task return signal on home"
```

---

## Self-Review

**Spec coverage:** This plan covers the exact delta in the approved design: return-to-home behavior, one-shot inspection expansion, dual-layer badges, latest-task status selection, `材料所` as pickup department, and disappearance only when the task reaches `awaiting_review`.

**Placeholder scan:** No `TODO`, `TBD`, or vague “add validation” steps remain. Every file path, helper, test, and command is explicit.

**Type consistency:** The plan consistently uses the same homepage-visible states, `pending_claim` and `awaiting_raw_data`, and the same hidden state boundary, `awaiting_review`, where the homepage badge disappears. The one-shot query signal is consistently named `inspectionSignal=created`.

