import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTaskDetail } from '@/lib/entrust';
import { getEntrustOrderById } from '@/lib/entrust-store';
import { convertWordToHtml } from '@/lib/parsers/word';
import {
  buildIssueDocumentBuffer,
  buildIssueDocumentFilename,
  getIssueDocumentFileUrl,
} from '@/lib/issue-document-template';

export async function GET(
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

    const detail = buildInspectionTaskDetail(task);
    const templatePath = path.join(process.cwd(), 'public', 'temp.docx');
    const templateBuffer = await fs.readFile(templatePath);
    const documentBuffer = await buildIssueDocumentBuffer(templateBuffer, detail);
    const html = await convertWordToHtml(documentBuffer);

    return NextResponse.json({
      html,
      filename: buildIssueDocumentFilename(detail),
      downloadUrl: getIssueDocumentFileUrl(taskId),
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
