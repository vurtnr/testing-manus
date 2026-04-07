import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, AuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const sql = getDb();
    const files = await sql`
      SELECT id, filename, file_type, file_size, upload_status, created_at
      FROM files
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(
      files.map((f: any) => ({
        id: f.id,
        filename: f.filename,
        fileType: f.file_type,
        fileSize: f.file_size,
        uploadStatus: f.upload_status,
        createdAt: f.created_at,
      }))
    );
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
