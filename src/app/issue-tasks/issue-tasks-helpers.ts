import type {
  InspectionAiReviewResult,
  InspectionTaskItem,
} from '@/lib/api';

export function getIssueQueue(tasks: InspectionTaskItem[]) {
  return tasks.filter((task) => task.taskStatus === 'awaiting_issue');
}

export function getIssuedQueue(tasks: InspectionTaskItem[]) {
  return tasks.filter((task) => task.taskStatus === 'issued');
}

export function getIssueDocumentZoom(pageWidth: number, containerWidth: number, gutter = 32) {
  if (pageWidth <= 0 || containerWidth <= 0) return 1;
  const availableWidth = Math.max(containerWidth - gutter, 0);
  if (availableWidth <= 0) return 1;
  return Math.min(1, availableWidth / pageWidth);
}

export function getDefaultIssueTaskId(tasks: InspectionTaskItem[], currentId: string) {
  if (tasks.some((task) => task.id === currentId)) return currentId;
  return tasks[0]?.id || '';
}

export function canConfirmIssueTask(
  task: InspectionTaskItem | null,
  reviewResult: InspectionAiReviewResult | null
) {
  return task?.taskStatus === 'awaiting_issue' && reviewResult?.passed === true;
}

export function shouldShowIssuedDownload(
  task: InspectionTaskItem & { issuedDocumentUrl?: string }
) {
  return task.taskStatus === 'issued' && Boolean(task.issuedDocumentUrl);
}

export function isIssuedIssueTask(task: InspectionTaskItem | null) {
  return task?.taskStatus === 'issued';
}
