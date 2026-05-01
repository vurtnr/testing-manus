import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequestOrDemo, AuthError } from '@/lib/auth';
import {
  listLabEquipment,
  type LabEquipmentStatus,
} from '@/lib/lab-equipment-store';

export async function GET(request: NextRequest) {
  try {
    await getUserFromRequestOrDemo(request);
    const status = request.nextUrl.searchParams.get('status') as LabEquipmentStatus | null;

    if (status && !['idle', 'busy', 'maintenance'].includes(status)) {
      return NextResponse.json({ error: 'Invalid equipment status' }, { status: 400 });
    }

    const records = await listLabEquipment(status ?? undefined);
    return NextResponse.json(records);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
