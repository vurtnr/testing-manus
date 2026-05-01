# 实验任务首页与完成闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Flutter app home screen that shows the current user's in-progress inspection tasks and lets them complete a task, while extending the Next.js API and persistence model so task completion also releases the assigned equipment.

**Architecture:** Keep `entrust_orders` as the single source of truth for inspection tasks. Extend the task lifecycle with one new terminal state, persist equipment assignment on the entrust record, and implement completion as a transactional server-side action that releases equipment and updates the task together. On the Flutter side, keep the first iteration inside `lab_mobile_app/lib/main.dart`, but inject the API dependency so the new home screen can be widget-tested without live HTTP.

**Tech Stack:** Next.js 15 App Router, TypeScript, node:test, PostgreSQL via `postgres`, Flutter/Dart, flutter_test, http

---

## File Map

**Server domain and shared client types**
- Modify: `src/lib/entrust.ts`
  - Extend task status unions
  - Add assigned equipment fields to entrust/task shapes
  - Update `buildInspectionTask()` to map completed tasks correctly
- Modify: `src/lib/api.ts`
  - Keep shared client types aligned with server task payloads
  - Add completion client helper for web/mobile reuse
- Modify: `src/lib/entrust.test.ts`
  - Cover completed-task mapping and equipment field propagation

**Persistence and transactional helpers**
- Modify: `src/lib/entrust-store.ts`
  - Extend runtime schema evolution with `assigned_equipment_id` and `assigned_equipment_name`
  - Add transaction-capable read/write helpers for task assignment/completion
- Modify: `src/lib/lab-equipment-store.ts`
  - Add optional SQL executor injection so route handlers can run inside one transaction

**API routes**
- Modify: `src/app/api/inspection-tasks/[taskId]/start-experiment/route.ts`
  - Save assigned equipment on task when starting experiment
  - Move task + equipment update into one DB transaction
- Create: `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts`
  - Validate task state
  - Release equipment
  - Mark task as `experiment_completed`

**Existing web consumer**
- Modify: `src/app/inspection-tasks/page.tsx`
  - Render the new completed badge text correctly
  - Avoid mislabeling completed tasks as “实验中”

**Flutter app**
- Modify: `lab_mobile_app/lib/main.dart`
  - Introduce a lightweight `TaskApi` abstraction
  - Change app entry from direct lookup page to `HomePage`
  - Add home screen loading/error/empty/success states
  - Keep `TaskLookupPage` as the existing领取 flow, but add back navigation because it is no longer the root page
  - Add `completeExperiment()` client method and completion confirmation flow
- Modify: `lab_mobile_app/test/widget_test.dart`
  - Assert the app boots into the new home page
  - Assert a fake in-progress task renders with an `实验完成` action

**Important non-goal**
- Do **not** add a SQL migration file for `entrust_orders` in this feature. That table already follows the runtime `ensureEntrustOrdersTable()` pattern, and the current `db:migrate` script does not safely replay later SQL files. Extend the runtime schema evolution instead of introducing a half-working migration path.

---

### Task 1: Extend Task Domain Types and Mapper Logic

**Files:**
- Modify: `src/lib/entrust.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/entrust.test.ts`

- [ ] **Step 1: Write the failing domain test for completed tasks**

Add this test to `src/lib/entrust.test.ts`:

```ts
test('buildInspectionTask maps completed tasks and keeps equipment snapshot', () => {
  const task = buildInspectionTask({
    id: 'entrust-2',
    orderNo: 'WT-20260420-002',
    paperEntrustNo: '36X',
    contractNo: 'HT-20260420-02',
    clientName: '华东建工材料有限公司',
    constructionUnit: '华东建工材料有限公司',
    supervisionUnit: '常州亿诺监理咨询有限公司',
    contractorUnit: '华东路桥工程有限公司',
    projectName: '水泥胶砂样品检测',
    projectLocation: '项目现场',
    witnessName: '张工',
    witnessPhone: '13800138000',
    samplerName: '张工',
    samplerPhone: '13800138000',
    sampleName: '水泥胶砂',
    sampleCount: 1,
    sampleSpec: '40mm x 40mm x 160mm',
    sampleBatch: '',
    engineeringPart: '主体结构',
    manufacturer: '无锡某水泥有限公司',
    representativeQuantity: '1 组',
    productionDate: '2026-04-20',
    testItems: '抗压、抗折',
    testStandard: 'GB/T 17671-2021',
    sampleCode: 'SJ-001',
    contactName: '张工',
    contactPhone: '13800138000',
    receivedAt: '2026-04-20T09:30:00+08:00',
    note: '',
    status: 'pending_acceptance',
    taskStatus: 'experiment_completed',
    experimenterName: '实验员A',
    assignedEquipmentId: 'equipment-1',
    assignedEquipmentName: '全自动压力试验机 01',
    ocrSourceName: '水泥胶砂-委托单.jpg',
    sourceImageName: '水泥胶砂-委托单.jpg',
    sourceImagePath: 'entrust/mock-2.jpg',
    createdAt: '2026-04-20T09:40:00Z',
    updatedAt: '2026-04-20T10:30:00Z',
  });

  assert.equal(task.status, 'completed');
  assert.equal(task.taskStatus, 'experiment_completed');
  assert.equal(task.dueLabel, '实验已完成');
  assert.equal(task.assignedEquipmentName, '全自动压力试验机 01');
});
```

- [ ] **Step 2: Run the focused node test and verify it fails**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
FAIL ... Type '"experiment_completed"' is not assignable ...
```

- [ ] **Step 3: Implement the minimal type and mapper changes**

Update `src/lib/entrust.ts` and `src/lib/api.ts` to match this shape:

```ts
export interface EntrustFormData {
  // existing fields...
  taskStatus: 'pending_claim' | 'in_experiment' | 'experiment_completed';
  experimenterName: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
}

export interface InspectionTaskItem {
  id: string;
  orderNo: string;
  title: string;
  status: 'pending' | 'processing' | 'completed';
  taskStatus: 'pending_claim' | 'in_experiment' | 'experiment_completed';
  experimenterName: string;
  assigneeLabel: string;
  dueLabel: string;
  summary: string;
  createdAt: string;
  sampleName: string;
  sampleCount: number;
  testItems: string;
  testStandard: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
}

export function buildInspectionTask(record: EntrustOrderRecord): InspectionTaskItem {
  const completed = record.taskStatus === 'experiment_completed';
  const inExperiment = record.taskStatus === 'in_experiment';

  return {
    id: record.id,
    orderNo: record.orderNo,
    title: `${record.orderNo} · ${record.sampleName}`,
    status: completed ? 'completed' : inExperiment ? 'processing' : 'pending',
    taskStatus: record.taskStatus,
    experimenterName: record.experimenterName,
    assigneeLabel: completed
      ? record.experimenterName || '实验已完成'
      : inExperiment
        ? record.experimenterName || '实验人员待补录'
        : '待实验人员领取',
    dueLabel: completed ? '实验已完成' : inExperiment ? '实验进行中' : '待选择设备并开始实验',
    summary: `${record.clientName} · ${record.projectName} · ${record.testItems}`,
    createdAt: record.createdAt,
    sampleName: record.sampleName,
    sampleCount: record.sampleCount,
    testItems: record.testItems,
    testStandard: record.testStandard,
    assignedEquipmentId: record.assignedEquipmentId,
    assignedEquipmentName: record.assignedEquipmentName,
  };
}
```

Also make sure any new entrust records default these new fields to `''`.

- [ ] **Step 4: Re-run the focused node test and verify it passes**

Run:

```bash
node --test src/lib/entrust.test.ts
```

Expected:

```text
ok 4 - buildInspectionTask maps completed tasks and keeps equipment snapshot
```

- [ ] **Step 5: Commit the domain contract change**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust.test.ts
git commit -m "feat: extend inspection task lifecycle contracts"
```

---

### Task 2: Persist Equipment Assignment on Entrust Tasks

**Files:**
- Modify: `src/lib/entrust-store.ts`
- Modify: `src/lib/lab-equipment-store.ts`

- [ ] **Step 1: Extend the runtime schema evolution for entrust orders**

In `src/lib/entrust-store.ts`, add these optional columns to `ensureEntrustOrdersTable()`:

```ts
const optionalColumns = [
  // existing columns...
  ['assigned_equipment_id', 'UUID'],
  ['assigned_equipment_name', 'TEXT'],
] as const;
```

Update the insert mapping and row mapper so entrust rows always expose these fields:

```ts
assignedEquipmentId: record.assigned_equipment_id ?? '',
assignedEquipmentName: record.assigned_equipment_name ?? '',
```

Keep them as empty strings for newly created pending tasks.

- [ ] **Step 2: Make store helpers transaction-capable instead of hard-wired to `getDb()`**

Add an optional SQL executor parameter to the store helpers that participate in start/complete flows:

```ts
type SqlExecutor = ReturnType<typeof getDb>;

export async function getEntrustOrderById(
  userId: string,
  id: string,
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  const [record] = await sql`
    SELECT *
    FROM entrust_orders
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    LIMIT 1
  `;
  return record ? mapRecord(record) : null;
}
```

Do the same pattern for:

- `updateEntrustTaskAssignment()` in `src/lib/entrust-store.ts`
- `getLabEquipmentById()` in `src/lib/lab-equipment-store.ts`
- `updateLabEquipmentStatus()` in `src/lib/lab-equipment-store.ts`

- [ ] **Step 3: Expand `updateEntrustTaskAssignment()` so it can save equipment snapshot**

Use a signature like this:

```ts
export async function updateEntrustTaskAssignment(
  userId: string,
  id: string,
  taskStatus: EntrustFormData['taskStatus'],
  experimenterName: string,
  assignment: {
    assignedEquipmentId?: string;
    assignedEquipmentName?: string;
  } = {},
  sql: SqlExecutor = getDb()
): Promise<EntrustOrderRecord | null> {
  const [record] = await sql`
    UPDATE entrust_orders
    SET
      task_status = ${taskStatus},
      experimenter_name = ${experimenterName || null},
      assigned_equipment_id = ${assignment.assignedEquipmentId ?? null}::uuid,
      assigned_equipment_name = ${assignment.assignedEquipmentName ?? null},
      updated_at = NOW()
    WHERE user_id = ${userId}
      AND id = ${id}::uuid
    RETURNING *
  `;
  return record ? mapRecord(record) : null;
}
```

This lets the start route save equipment snapshot, while the complete route can keep the snapshot unchanged by passing the current values back in.

- [ ] **Step 4: Run fast verification for the touched TypeScript files**

Run:

```bash
node --test src/lib/entrust.test.ts
npm run lint
```

Expected:

```text
All node tests pass
Next.js lint exits 0
```

- [ ] **Step 5: Commit the persistence plumbing**

```bash
git add src/lib/entrust-store.ts src/lib/lab-equipment-store.ts
git commit -m "feat: persist assigned equipment on inspection tasks"
```

---

### Task 3: Make Start and Complete Experiment Transactional Server Actions

**Files:**
- Modify: `src/app/api/inspection-tasks/[taskId]/start-experiment/route.ts`
- Create: `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts`
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Update the start-experiment route so it writes task + equipment in one transaction**

In `src/app/api/inspection-tasks/[taskId]/start-experiment/route.ts`, switch the core mutation to `sql.begin(...)`:

```ts
const sql = getDb();

const result = await sql.begin(async (tx) => {
  const task = await getEntrustOrderById(user.id, taskId, tx);
  if (!task) throw new Error('TASK_NOT_FOUND');
  if (task.taskStatus !== 'pending_claim') throw new Error('TASK_STATUS_INVALID');

  const equipment = await getLabEquipmentById(equipmentId, tx);
  if (!equipment) throw new Error('EQUIPMENT_NOT_FOUND');
  if (equipment.status !== 'idle') throw new Error('EQUIPMENT_NOT_IDLE');

  const updatedEquipment = await updateLabEquipmentStatus(equipmentId, 'busy', tx);
  const updatedTask = await updateEntrustTaskAssignment(
    user.id,
    taskId,
    'in_experiment',
    '实验人员A',
    {
      assignedEquipmentId: equipment.id,
      assignedEquipmentName: equipment.equipmentName,
    },
    tx
  );

  return { updatedTask, updatedEquipment };
});
```

Return `buildInspectionTask(result.updatedTask)` plus the updated equipment payload. Delete the old “update then rollback manually” branch because the DB transaction replaces it.

- [ ] **Step 2: Create the completion route**

Create `src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts` with this behavior:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import {
  getEntrustOrderById,
  updateEntrustTaskAssignment,
} from '@/lib/entrust-store';
import {
  getLabEquipmentById,
  updateLabEquipmentStatus,
} from '@/lib/lab-equipment-store';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const sql = getDb();

    const updatedTask = await sql.begin(async (tx) => {
      const task = await getEntrustOrderById(user.id, taskId, tx);
      if (!task) throw new Error('TASK_NOT_FOUND');
      if (task.taskStatus !== 'in_experiment') throw new Error('TASK_STATUS_INVALID');
      if (!task.assignedEquipmentId) throw new Error('TASK_EQUIPMENT_MISSING');

      const equipment = await getLabEquipmentById(task.assignedEquipmentId, tx);
      if (!equipment) throw new Error('EQUIPMENT_NOT_FOUND');

      await updateLabEquipmentStatus(equipment.id, 'idle', tx);
      const updated = await updateEntrustTaskAssignment(
        user.id,
        taskId,
        'experiment_completed',
        task.experimenterName,
        {
          assignedEquipmentId: task.assignedEquipmentId,
          assignedEquipmentName: task.assignedEquipmentName,
        },
        tx
      );

      if (!updated) throw new Error('TASK_UPDATE_FAILED');
      return updated;
    });

    return NextResponse.json(buildInspectionTask(updatedTask));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusMap: Record<string, number> = {
      TASK_NOT_FOUND: 404,
      TASK_STATUS_INVALID: 409,
      TASK_EQUIPMENT_MISSING: 409,
      EQUIPMENT_NOT_FOUND: 404,
      TASK_UPDATE_FAILED: 500,
    };

    return NextResponse.json(
      { error: error.message },
      { status: statusMap[error.message] ?? 500 }
    );
  }
}
```

- [ ] **Step 3: Add the shared client helper for completion**

In `src/lib/api.ts`, add:

```ts
export async function completeInspectionExperiment(taskId: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/complete-experiment`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to complete experiment');
  }
  return res.json();
}
```

- [ ] **Step 4: Verify the server behavior manually with local APIs**

Run:

```bash
npm run db:up
npm run dev
curl -sS 'http://localhost:3030/api/inspection-tasks'
```

Then, after creating or using an existing `in_experiment` task, call:

```bash
curl -sS -X POST "http://localhost:3030/api/inspection-tasks/<TASK_ID>/complete-experiment"
```

Expected:

```text
JSON payload with "taskStatus":"experiment_completed"
```

Also verify the released equipment row:

```bash
docker compose exec postgres psql -U rag_user -d rag_kb -c "select equipment_name,status from lab_equipment order by equipment_name;"
```

Expected:

```text
the previously assigned equipment is back to idle
```

- [ ] **Step 5: Commit the API lifecycle change**

```bash
git add src/app/api/inspection-tasks/[taskId]/start-experiment/route.ts src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts src/lib/api.ts
git commit -m "feat: add inspection task completion endpoint"
```

---

### Task 4: Keep Existing Web Task List Compatible with the New Status

**Files:**
- Modify: `src/app/inspection-tasks/page.tsx`

- [ ] **Step 1: Update the badge text logic to handle the third state explicitly**

Replace the existing ternary badge text with a three-state mapping:

```tsx
const badgeLabel =
  task.taskStatus === 'pending_claim'
    ? '待领取'
    : task.taskStatus === 'in_experiment'
      ? '实验中'
      : '实验完成';
```

Use `badgeLabel` inside the badge render instead of treating every non-pending task as “实验中”.

- [ ] **Step 2: Add the assigned equipment line if present**

Under the sample/test line, render:

```tsx
{task.assignedEquipmentName && <div>设备：{task.assignedEquipmentName}</div>}
```

This keeps the existing web consumer useful after the payload grows.

- [ ] **Step 3: Run quick verification on the web page dependencies**

Run:

```bash
node --test src/lib/entrust.test.ts
npm run lint
```

Expected:

```text
node tests pass
lint exits 0
```

- [ ] **Step 4: Commit the compatibility patch**

```bash
git add src/app/inspection-tasks/page.tsx
git commit -m "fix: show completed inspection tasks correctly on web"
```

---

### Task 5: Add the Flutter Home Screen and Completion Flow

**Files:**
- Modify: `lab_mobile_app/lib/main.dart`

- [ ] **Step 1: Introduce a minimal `TaskApi` abstraction so the app can be tested without real HTTP**

At the top of `lab_mobile_app/lib/main.dart`, add:

```dart
abstract class TaskApi {
  Future<List<InspectionTask>> fetchInspectionTasks();
  Future<InspectionTask> fetchTaskByOrderNo(String orderNo);
  Future<List<LabEquipment>> fetchIdleEquipment();
  Future<StartExperimentResult> startExperiment({
    required String taskId,
    required String equipmentId,
  });
  Future<InspectionTask> completeExperiment({required String taskId});
}

typedef TaskApiFactory = TaskApi Function(String baseUrl);
```

Then update `ApiClient` to `implements TaskApi`, add `fetchInspectionTasks()` and `completeExperiment()`, and make `LabMobileApp` accept an optional factory:

```dart
class LabMobileApp extends StatelessWidget {
  const LabMobileApp({super.key, TaskApiFactory? apiFactory})
    : _apiFactory = apiFactory ?? ApiClient.new;

  final TaskApiFactory _apiFactory;

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3030',
  );

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '检测实验 App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(...),
      home: HomePage(api: _apiFactory(baseUrl)),
    );
  }
}
```

- [ ] **Step 2: Replace the direct lookup landing screen with `HomePage`**

Create a new `HomePage` widget inside `lab_mobile_app/lib/main.dart` that:

```dart
class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.api});

  final TaskApi api;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _loading = true;
  String? _error;
  String? _feedback;
  String? _completingTaskId;
  List<InspectionTask> _tasks = const [];

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final tasks = await widget.api.fetchInspectionTasks();
      setState(() {
        _tasks = tasks.where((task) => task.taskStatus == 'in_experiment').toList();
      });
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }
}
```

The page body should show:

- title `我的实验任务`
- a summary chip like `实验中 2 项`
- an active task card list with sample name / test items / standard / equipment name
- one `去领取任务` button that pushes `TaskLookupPage(api: widget.api)`
- empty-state copy when `_tasks.isEmpty`

- [ ] **Step 3: Add the completion action and refresh-on-return behavior**

Inside `HomePage`, add:

```dart
Future<void> _handleComplete(InspectionTask task) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('确认实验已完成？'),
      content: Text('完成后，${task.orderNo} 会从首页移除，并释放当前设备。'),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('取消')),
        FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('确认完成')),
      ],
    ),
  );

  if (confirmed != true) return;

  setState(() {
    _completingTaskId = task.id;
    _feedback = null;
    _error = null;
  });

  try {
    await widget.api.completeExperiment(taskId: task.id);
    setState(() {
      _tasks = _tasks.where((item) => item.id != task.id).toList();
      _feedback = '已将 ${task.orderNo} 标记为实验完成';
    });
  } catch (error) {
    setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
  } finally {
    if (mounted) {
      setState(() => _completingTaskId = null);
    }
  }
}
```

When navigating to the existing lookup flow, refresh the home screen on return:

```dart
await Navigator.of(context).push(
  MaterialPageRoute(builder: (_) => TaskLookupPage(api: widget.api)),
);
if (mounted) {
  await _loadTasks();
}
```

Update `TaskLookupPage` to accept `final TaskApi api;` and use `widget.api` instead of constructing a new `ApiClient`. Also add an `AppBar(title: const Text('实验任务领取'))` because the page is no longer the root screen.

- [ ] **Step 4: Expand `InspectionTask` on the Flutter side**

Update the Dart model to parse the new fields:

```dart
class InspectionTask {
  InspectionTask({
    required this.id,
    required this.orderNo,
    required this.sampleName,
    required this.sampleCount,
    required this.testItems,
    required this.testStandard,
    required this.taskStatus,
    required this.experimenterName,
    required this.assignedEquipmentId,
    required this.assignedEquipmentName,
  });

  factory InspectionTask.fromJson(Map<String, dynamic> json) {
    return InspectionTask(
      id: json['id'] as String,
      orderNo: json['orderNo'] as String,
      sampleName: json['sampleName'] as String? ?? '',
      sampleCount: json['sampleCount'] as int? ?? 0,
      testItems: json['testItems'] as String? ?? '',
      testStandard: json['testStandard'] as String? ?? '',
      taskStatus: json['taskStatus'] as String? ?? 'pending_claim',
      experimenterName: json['experimenterName'] as String? ?? '',
      assignedEquipmentId: json['assignedEquipmentId'] as String? ?? '',
      assignedEquipmentName: json['assignedEquipmentName'] as String? ?? '',
    );
  }

  final String id;
  final String orderNo;
  final String sampleName;
  final int sampleCount;
  final String testItems;
  final String testStandard;
  final String taskStatus;
  final String experimenterName;
  final String assignedEquipmentId;
  final String assignedEquipmentName;
}
```

- [ ] **Step 5: Verify the mobile flow manually**

Run:

```bash
cd lab_mobile_app
flutter analyze
flutter test test/widget_test.dart
```

Expected:

```text
No issues found!  (or existing unrelated warnings only)
All widget tests pass
```

Then run the app against local web/API:

```bash
flutter run -d ios --dart-define=API_BASE_URL=http://localhost:3030
```

Manual smoke expectation:

1. App first screen is `我的实验任务`
2. Tap `去领取任务` and complete the existing领取 flow
3. Success page returns to home
4. The new task appears in the home task list
5. Tapping `实验完成` removes it from the list and shows success feedback

- [ ] **Step 6: Commit the Flutter home hub**

```bash
git add lab_mobile_app/lib/main.dart
git commit -m "feat: add mobile inspection task home hub"
```

---

### Task 6: Update Widget Tests for the New Root Screen

**Files:**
- Modify: `lab_mobile_app/test/widget_test.dart`

- [ ] **Step 1: Replace the old root-screen test with a fake API-backed home-screen test**

Update `lab_mobile_app/test/widget_test.dart` to this structure:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:lab_mobile_app/main.dart';

class FakeTaskApi implements TaskApi {
  @override
  Future<List<InspectionTask>> fetchInspectionTasks() async => [
    InspectionTask(
      id: 'task-1',
      orderNo: 'WT-20260420-001',
      sampleName: '混凝土试块',
      sampleCount: 1,
      testItems: '抗压',
      testStandard: 'GB/T 50081-2019',
      taskStatus: 'in_experiment',
      experimenterName: '实验员A',
      assignedEquipmentId: 'equipment-1',
      assignedEquipmentName: '全自动压力试验机 01',
    ),
  ];

  @override
  Future<InspectionTask> fetchTaskByOrderNo(String orderNo) => throw UnimplementedError();

  @override
  Future<List<LabEquipment>> fetchIdleEquipment() => throw UnimplementedError();

  @override
  Future<StartExperimentResult> startExperiment({required String taskId, required String equipmentId}) =>
      throw UnimplementedError();

  @override
  Future<InspectionTask> completeExperiment({required String taskId}) async =>
      fetchInspectionTasks().then((tasks) => tasks.first);
}

void main() {
  testWidgets('renders home hub with active task and claim entry', (WidgetTester tester) async {
    await tester.pumpWidget(LabMobileApp(apiFactory: (_) => FakeTaskApi()));
    await tester.pumpAndSettle();

    expect(find.text('我的实验任务'), findsOneWidget);
    expect(find.text('WT-20260420-001'), findsOneWidget);
    expect(find.text('实验完成'), findsOneWidget);
    expect(find.text('去领取任务'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run the widget test and verify it fails before the home screen exists**

Run:

```bash
cd lab_mobile_app
flutter test test/widget_test.dart
```

Expected:

```text
Expected: exactly one matching candidate
Actual: _TextWidgetFinder:<Found 0 widgets with text "我的实验任务">
```

- [ ] **Step 3: Re-run the widget test after the home screen implementation**

Run:

```bash
cd lab_mobile_app
flutter test test/widget_test.dart
```

Expected:

```text
All tests passed!
```

- [ ] **Step 4: Commit the test update**

```bash
git add lab_mobile_app/test/widget_test.dart
git commit -m "test: cover mobile task home entry screen"
```

---

### Task 7: Final Verification and Release Notes for the Branch

**Files:**
- Modify: `CHANGELOG.md` (only if the branch convention requires it)
- Modify: `VERSION` (only if the branch convention requires it)

- [ ] **Step 1: Run the full verification set**

Run:

```bash
node --test src/lib/entrust.test.ts
npm run lint
cd lab_mobile_app && flutter analyze && flutter test test/widget_test.dart
```

Expected:

```text
node tests pass
Next lint exits 0
Flutter analyze passes or shows only known unrelated warnings
Flutter widget tests pass
```

- [ ] **Step 2: Run the end-to-end manual smoke sequence**

Run the web/API and the Flutter app, then verify this sequence manually:

1. Home screen loads
2. `去领取任务` enters the existing task-claim flow
3. Starting an experiment returns to the home screen via the success page
4. The task appears as active with the assigned equipment name
5. Completing the task removes it from the active list
6. The same equipment is visible as `idle` in the database after completion
7. `/inspection-tasks` web page shows completed tasks with the correct badge text

- [ ] **Step 3: Create the finishing commit**

```bash
git add src/lib/entrust.ts src/lib/api.ts src/lib/entrust-store.ts src/lib/lab-equipment-store.ts src/app/api/inspection-tasks/[taskId]/start-experiment/route.ts src/app/api/inspection-tasks/[taskId]/complete-experiment/route.ts src/app/inspection-tasks/page.tsx lab_mobile_app/lib/main.dart lab_mobile_app/test/widget_test.dart
git commit -m "feat: add mobile inspection task completion home flow"
```

---

## Self-Review

**Spec coverage:** The plan covers the approved design's core pieces: a new app home screen, a dedicated claim entry point, one new terminal task state, equipment release on completion, and the compatibility fix for the existing web task list.

**Placeholder scan:** No `TODO`, `TBD`, or “handle appropriately” gaps are left in the tasks. Every new file path and command is explicit.

**Type consistency:** The plan uses the same new terminal state name everywhere, `experiment_completed`, and keeps the shared equipment fields named `assignedEquipmentId` and `assignedEquipmentName` across TypeScript and Dart.

