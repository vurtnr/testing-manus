import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { getEnv } from '@/lib/env';
import { normalizeInspectionRawDataPreview } from '@/lib/inspection-raw-data';
import {
  getEntrustOrderById,
  saveInspectionRawDataPreview,
  updateInspectionRawDataPreview,
} from '@/lib/entrust-store';

function buildMockRawDataPreview() {
  return {
    headers: [
      '组号',
      '试件长(mm)',
      '试件宽(mm)',
      '破坏荷载(kN)',
      '抗压强度(MPa)',
      '代表值(MPa)',
      '占设计强度值(%)',
    ],
    rows: [
      ['1', '150', '150', '726.8', '32.3', '31.7', '105.6'],
      ['2', '150', '150', '682.1', '30.3', '31.7', '105.6'],
      ['3', '150', '150', '713.6', '31.7', '31.7', '105.6'],
    ],
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: '请上传原始记录图片' }, { status: 400 });
    }

    const task = await getEntrustOrderById(user.id, taskId);
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.taskStatus !== 'awaiting_raw_data') {
      return NextResponse.json({ error: '当前任务不能录入原始数据' }, { status: 409 });
    }

    const env = getEnv();
    const rawDataDir = path.join(env.UPLOAD_DIR, 'inspection-raw-data');
    await fs.mkdir(rawDataDir, { recursive: true });

    const ext = path.extname(image.name) || '.png';
    const imageStorageName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const imageStoragePath = path.join(rawDataDir, imageStorageName);
    const relativePath = path.join('inspection-raw-data', imageStorageName);
    await fs.writeFile(imageStoragePath, Buffer.from(await image.arrayBuffer()));

    const preview = buildMockRawDataPreview();
    const updated = await saveInspectionRawDataPreview(user.id, taskId, {
      rawDataImagePath: relativePath,
      rawDataImageName: image.name,
      rawDataPreviewJson: preview,
    });

    if (!updated) {
      return NextResponse.json({ error: '保存原始数据预览失败' }, { status: 500 });
    }

    return NextResponse.json({
      preview,
      imageName: image.name,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const { taskId } = await context.params;
    const body = (await request.json()) as { preview?: unknown };
    const preview = normalizeInspectionRawDataPreview(body.preview);

    if (!preview) {
      return NextResponse.json({ error: '缺少可保存的原始数据表格' }, { status: 400 });
    }

    const task = await getEntrustOrderById(user.id, taskId);
    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }
    if (task.taskStatus !== 'awaiting_raw_data') {
      return NextResponse.json({ error: '当前任务不能录入原始数据' }, { status: 409 });
    }
    if (!task.rawDataImageName) {
      return NextResponse.json({ error: '请先上传原始记录图片' }, { status: 409 });
    }

    const updated = await updateInspectionRawDataPreview(user.id, taskId, preview);
    if (!updated) {
      return NextResponse.json({ error: '保存原始数据修改失败' }, { status: 500 });
    }

    return NextResponse.json({
      preview,
      imageName: updated.rawDataImageName,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
