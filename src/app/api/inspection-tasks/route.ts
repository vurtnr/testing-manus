import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import { buildInspectionTask } from '@/lib/entrust';
import { listEntrustOrders } from '@/lib/entrust-store';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequestOrDemo(request);
    const records = await listEntrustOrders(user.id);
    return NextResponse.json(records.map(buildInspectionTask));
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
