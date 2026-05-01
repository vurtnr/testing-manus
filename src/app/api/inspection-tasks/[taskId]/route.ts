import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTaskDetail } from '@/lib/entrust';
import { deleteEntrustOrder, getEntrustOrderById } from '@/lib/entrust-store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const record = await getEntrustOrderById(user.id, taskId);

    if (!record) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json(buildInspectionTaskDetail(record));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const record = await getEntrustOrderById(user.id, taskId);

    if (!record) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    const deleted = await deleteEntrustOrder(user.id, taskId);
    if (!deleted) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: taskId });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
