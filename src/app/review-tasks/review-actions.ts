import type { InspectionTaskItem } from '@/lib/api';

export function canApproveReviewTask(task: InspectionTaskItem): boolean {
  return task.taskStatus === 'awaiting_review';
}

export function getReviewApprovalRedirect(task: InspectionTaskItem): string | null {
  if (task.taskStatus === 'awaiting_issue') {
    return '/?inspectionSignal=issue';
  }
  return null;
}
