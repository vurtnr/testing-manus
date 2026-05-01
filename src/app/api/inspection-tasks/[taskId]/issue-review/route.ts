import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { getEntrustOrderById } from '@/lib/entrust-store';
import { buildInspectionIssueReviewResult } from '@/lib/inspection-issue-review';

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
    if (task.taskStatus !== 'awaiting_issue') {
      return NextResponse.json({ error: '当前任务不能执行签发复核' }, { status: 409 });
    }
    if (!task.rawDataPreviewJson) {
      return NextResponse.json({ error: '当前任务缺少原始数据，不能签发' }, { status: 409 });
    }

    const result = buildInspectionIssueReviewResult({
      sampleName: task.sampleName,
      sampleCount: task.sampleCount,
      testItems: task.testItems,
      testStandard: task.testStandard,
      assignedEquipmentName: task.assignedEquipmentName,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
