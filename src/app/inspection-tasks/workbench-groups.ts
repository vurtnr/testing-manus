import type { InspectionTaskItem } from '@/lib/api';

export type WorkbenchTab =
  | 'pending_claim'
  | 'in_experiment'
  | 'awaiting_raw_data'
  | 'awaiting_review'
  | 'awaiting_issue';

export interface InspectionTaskWorkbenchGroups {
  pendingClaim: InspectionTaskItem[];
  inExperiment: InspectionTaskItem[];
  awaitingRawData: InspectionTaskItem[];
  awaitingReview: InspectionTaskItem[];
  awaitingIssue: InspectionTaskItem[];
}

export function groupInspectionTasksForWorkbench(tasks: InspectionTaskItem[]) {
  return {
    pendingClaim: tasks.filter((task) => task.taskStatus === 'pending_claim'),
    inExperiment: tasks.filter((task) => task.taskStatus === 'in_experiment'),
    awaitingRawData: tasks.filter((task) => task.taskStatus === 'awaiting_raw_data'),
    awaitingReview: tasks.filter((task) => task.taskStatus === 'awaiting_review'),
    awaitingIssue: tasks.filter((task) => task.taskStatus === 'awaiting_issue'),
  };
}

export function getDefaultWorkbenchTab(groups: InspectionTaskWorkbenchGroups): WorkbenchTab {
  if (groups.awaitingRawData.length > 0) return 'awaiting_raw_data';
  if (groups.pendingClaim.length > 0) return 'pending_claim';
  if (groups.inExperiment.length > 0) return 'in_experiment';
  if (groups.awaitingReview.length > 0) return 'awaiting_review';
  return 'awaiting_issue';
}
