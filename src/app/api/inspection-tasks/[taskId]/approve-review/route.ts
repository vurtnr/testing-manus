import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import {
  approveInspectionTaskReview,
  getEntrustOrderById,
} from '@/lib/entrust-store';

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
