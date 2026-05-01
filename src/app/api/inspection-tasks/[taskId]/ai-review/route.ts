import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { markInspectionRawDataIssue, normalizeInspectionRawDataPreview } from '@/lib/inspection-raw-data';
import {
  getEntrustOrderById,
  saveInspectionAiReviewResult,
} from '@/lib/entrust-store';
import { buildInspectionAiReviewResult } from '@/lib/inspection-ai-review';

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
      return NextResponse.json({ error: '当前任务不能执行 AI复核' }, { status: 409 });
    }
    if (!task.rawDataPreviewJson) {
      return NextResponse.json({ error: '请先上传原始记录图片' }, { status: 409 });
    }
    const preview = normalizeInspectionRawDataPreview(task.rawDataPreviewJson);
    if (!preview) {
      return NextResponse.json({ error: '当前原始数据无法执行 AI复核' }, { status: 409 });
    }
    const flaggedPreview = markInspectionRawDataIssue(preview);

    const result = buildInspectionAiReviewResult({
      sampleName: task.sampleName,
      testItems: task.testItems,
      testStandard: task.testStandard,
      rawDataPreview: flaggedPreview,
    });
    const updated = await saveInspectionAiReviewResult(user.id, taskId, {
      rawDataPreviewJson: flaggedPreview,
      aiReviewTraceJson: result.trace,
      aiReviewSummary: result.summary,
      aiReviewPassed: result.passed,
    });

    if (!updated) {
      return NextResponse.json({ error: '保存 AI复核结果失败' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
