import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: '当前流程在建设中...' },
    { status: 409 }
  );
}
