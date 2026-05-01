import type { InspectionTaskItem } from '@/lib/api';

const TASK_VISIBLE_STATES = new Set(['pending_claim', 'awaiting_raw_data']);
const REVIEW_VISIBLE_STATES = new Set(['awaiting_review']);
const ISSUE_VISIBLE_STATES = new Set(['awaiting_issue']);

const STATUS_LABELS: Record<string, string> = {
  pending_claim: '待领取',
  awaiting_raw_data: '待录入原始数据',
  awaiting_review: '待审核',
  awaiting_issue: '待签发',
};

export function getInspectionTaskReminder(tasks: InspectionTaskItem[]) {
  const sortByCreatedDesc = (items: InspectionTaskItem[]) =>
    [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const taskTasks = sortByCreatedDesc(
    tasks.filter((task) => TASK_VISIBLE_STATES.has(task.taskStatus))
  );
  const reviewTasks = sortByCreatedDesc(
    tasks.filter((task) => REVIEW_VISIBLE_STATES.has(task.taskStatus))
  );
  const issueTasks = sortByCreatedDesc(
    tasks.filter((task) => ISSUE_VISIBLE_STATES.has(task.taskStatus))
  );
  const inspectionTasks = sortByCreatedDesc(
    tasks.filter(
      (task) =>
        TASK_VISIBLE_STATES.has(task.taskStatus) ||
        REVIEW_VISIBLE_STATES.has(task.taskStatus) ||
        ISSUE_VISIBLE_STATES.has(task.taskStatus)
    )
  );

  const inspectionLatest = inspectionTasks[0] ?? null;
  const taskLatest = taskTasks[0] ?? null;
  const reviewLatest = reviewTasks[0] ?? null;
  const issueLatest = issueTasks[0] ?? null;

  return {
    inspectionBadge: inspectionLatest
      ? {
          visible: true,
          count: inspectionTasks.length,
          statusLabel: STATUS_LABELS[inspectionLatest.taskStatus] ?? '',
          latestTask: inspectionLatest,
        }
      : {
          visible: false,
          count: 0,
          statusLabel: '',
          latestTask: null as InspectionTaskItem | null,
        },
    taskBadge: taskLatest
      ? {
          visible: true,
          count: taskTasks.length,
          statusLabel: STATUS_LABELS[taskLatest.taskStatus] ?? '',
          latestTask: taskLatest,
        }
      : {
          visible: false,
          count: 0,
          statusLabel: '',
          latestTask: null as InspectionTaskItem | null,
        },
    reviewBadge: reviewLatest
      ? {
          visible: true,
          count: reviewTasks.length,
          statusLabel: STATUS_LABELS[reviewLatest.taskStatus] ?? '',
          latestTask: reviewLatest,
        }
      : {
          visible: false,
          count: 0,
          statusLabel: '',
          latestTask: null as InspectionTaskItem | null,
        },
    issueBadge: issueLatest
      ? {
          visible: true,
          count: issueTasks.length,
          statusLabel: STATUS_LABELS[issueLatest.taskStatus] ?? '',
          latestTask: issueLatest,
        }
      : {
          visible: false,
          count: 0,
          statusLabel: '',
          latestTask: null as InspectionTaskItem | null,
        },
  };
}
