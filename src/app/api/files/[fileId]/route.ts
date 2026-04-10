import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { getUserFromRequest, AuthError } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { fileId } = await params;
    const sql = getDb();
    const env = getEnv();

    // Get file info
    const [file] = await sql`SELECT storage_path FROM files WHERE id = ${fileId}`;
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete DB record (cascades to chunks)
    await sql`DELETE FROM files WHERE id = ${fileId}`;

    // Delete physical file
    try {
      const filePath = path.join(env.UPLOAD_DIR, file.storage_path);
      await fs.unlink(filePath);
    } catch {
      // File might already be deleted, ignore
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
