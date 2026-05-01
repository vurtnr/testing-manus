import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import { getEntrustOrderByOrderNo } from '@/lib/entrust-store';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const orderNo = request.nextUrl.searchParams.get('orderNo')?.trim();

    if (!orderNo) {
      return NextResponse.json({ error: '缺少任务单号' }, { status: 400 });
    }

    const record = await getEntrustOrderByOrderNo(user.id, orderNo);
    if (!record) {
      return NextResponse.json({ error: '未找到对应任务单' }, { status: 404 });
    }

    return NextResponse.json(buildInspectionTask(record));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
