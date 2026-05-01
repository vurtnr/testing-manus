import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, AuthError } from '@/lib/auth';
import { extractEntrustFormFromImage } from '@/lib/entrust-ocr';

export async function POST(request: NextRequest) {
  try {
    await getUserFromRequest(request);
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return NextResponse.json({ error: '请先上传纸质委托单照片' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const result = await extractEntrustFormFromImage(buffer.toString('base64'), image.name);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
