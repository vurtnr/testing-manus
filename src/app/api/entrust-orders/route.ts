import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getUserFromRequest, AuthError } from '@/lib/auth';
import {
  buildEntrustOrderNo,
  normalizeEntrustReceivedAt,
  type EntrustOcrResult,
} from '@/lib/entrust';
import { getEnv } from '@/lib/env';
import {
  countEntrustOrdersForDay,
  insertEntrustOrder,
  listEntrustOrders,
} from '@/lib/entrust-store';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const records = await listEntrustOrders(user.id);
    return NextResponse.json(records);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const formData = await request.formData();
    const image = formData.get('image');
    const ocrResultRaw = formData.get('ocrResult');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: '请上传纸质委托单照片' }, { status: 400 });
    }
    if (typeof ocrResultRaw !== 'string') {
      return NextResponse.json({ error: '缺少 OCR 识别结果' }, { status: 400 });
    }

    const ocrResult = JSON.parse(ocrResultRaw) as EntrustOcrResult;
    const fields = ocrResult.fields;

    const requiredFields = [
      'clientName',
      'projectName',
      'sampleName',
      'sampleSpec',
      'testItems',
      'contactName',
      'contactPhone',
      'receivedAt',
      'ocrSourceName',
    ] as const;

    for (const field of requiredFields) {
      if (!fields[field]) {
        return NextResponse.json({ error: `OCR 缺少关键字段: ${field}` }, { status: 400 });
      }
    }

    const env = getEnv();
    const entrustDir = path.join(env.UPLOAD_DIR, 'entrust');
    await fs.mkdir(entrustDir, { recursive: true });

    const ext = path.extname(image.name) || '.jpg';
    const imageStorageName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const imageStoragePath = path.join(entrustDir, imageStorageName);
    const relativePath = path.join('entrust', imageStorageName);
    await fs.writeFile(imageStoragePath, Buffer.from(await image.arrayBuffer()));

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await countEntrustOrdersForDay(user.id, dayStart.toISOString(), dayEnd.toISOString());

    const record = await insertEntrustOrder(user.id, {
      orderNo: buildEntrustOrderNo(now, count + 1),
      paperEntrustNo: fields.paperEntrustNo || '',
      contractNo: fields.contractNo || '',
      clientName: fields.clientName,
      constructionUnit: fields.constructionUnit || '',
      supervisionUnit: fields.supervisionUnit || '',
      contractorUnit: fields.contractorUnit || '',
      projectName: fields.projectName,
      projectLocation: fields.projectLocation || '',
      witnessName: fields.witnessName || '',
      witnessPhone: fields.witnessPhone || '',
      samplerName: fields.samplerName || '',
      samplerPhone: fields.samplerPhone || '',
      sampleName: fields.sampleName,
      sampleCount: fields.sampleCount || 1,
      sampleSpec: fields.sampleSpec,
      sampleBatch: fields.sampleBatch || '',
      engineeringPart: fields.engineeringPart || '',
      manufacturer: fields.manufacturer || '',
      representativeQuantity: fields.representativeQuantity || '',
      productionDate: fields.productionDate || '',
      testItems: fields.testItems,
      testStandard: fields.testStandard || '',
      sampleCode: fields.sampleCode || '',
      contactName: fields.contactName,
      contactPhone: fields.contactPhone,
      receivedAt: normalizeEntrustReceivedAt(fields.receivedAt, now),
      note: fields.note || '',
      status: 'pending_acceptance',
      taskStatus: 'pending_claim',
      experimenterName: '',
      assignedEquipmentId: '',
      assignedEquipmentName: '',
      pickupDepartment: '材料所',
      ocrSourceName: fields.ocrSourceName,
      sourceImageName: image.name,
      sourceImagePath: relativePath,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
