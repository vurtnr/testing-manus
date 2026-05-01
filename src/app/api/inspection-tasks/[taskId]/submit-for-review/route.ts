import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import {
  canSubmitInspectionRawData,
  hasPendingInspectionRawDataIssue,
  normalizeInspectionRawDataPreview,
} from '@/lib/inspection-raw-data';
import {
  getEntrustOrderById,
  submitInspectionTaskForReview,
} from '@/lib/entrust-store';

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
    const preview = normalizeInspectionRawDataPreview(task.rawDataPreviewJson);
    if (!preview) {
      return NextResponse.json({ error: '请先上传原始记录图片' }, { status: 409 });
    }
    if (!task.aiReviewPassed) {
      return NextResponse.json({ error: '请先完成 AI复核' }, { status: 409 });
    }
    if (!canSubmitInspectionRawData(preview, task.aiReviewPassed)) {
      return NextResponse.json(
        {
          error: hasPendingInspectionRawDataIssue(preview)
            ? '请先修改 AI 标记的红框数值'
            : '当前原始数据还不能提交审核',
        },
        { status: 409 }
      );
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
