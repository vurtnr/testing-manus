import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import {
  completeInspectionTaskIssue,
  getEntrustOrderById,
} from '@/lib/entrust-store';
import {
  buildIssueDocumentFilename,
  getIssueDocumentFileUrl,
} from '@/lib/issue-document-template';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const task = await getEntrustOrderById(user.id, taskId);

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.taskStatus !== 'awaiting_issue') {
      return NextResponse.json({ error: '当前任务不是待签发状态' }, { status: 409 });
    }
    const issuedDocumentName =
      typeof body?.issuedDocumentName === 'string'
        ? body.issuedDocumentName
        : buildIssueDocumentFilename(task);
    const issuedDocumentUrl =
      typeof body?.issuedDocumentUrl === 'string'
        ? body.issuedDocumentUrl
        : getIssueDocumentFileUrl(taskId);

    const updated = await completeInspectionTaskIssue(user.id, taskId, {
      issuedDocumentName,
      issuedDocumentUrl,
    });
    if (!updated) {
      return NextResponse.json({ error: '确认签发失败' }, { status: 500 });
    }

    return NextResponse.json(buildInspectionTask(updated));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
