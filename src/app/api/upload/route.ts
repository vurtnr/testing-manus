import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getDb } from '@/lib/db';
import { getEnv } from '@/lib/env';
import { ingestFile } from '@/lib/ingestion';
import { getUserFromRequest, AuthError } from '@/lib/auth';
import { findDuplicateStandardFile } from '@/lib/standard-file';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function getFileType(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
  };
  return map[mimeType] ?? 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const env = getEnv();
    const sql = getDb();
    const fileType = getFileType(file.type);

    const existingFileRows = await sql`
      SELECT filename, standard_number
      FROM files
      WHERE upload_status IN ('pending', 'processing', 'ready')
    `;
    const existingFiles = existingFileRows.map((row: any) => ({
      filename: row.filename as string,
      standardNumber: row.standard_number as string | null,
    }));
    const duplicate = findDuplicateStandardFile(file.name, existingFiles);
    if (duplicate) {
      return NextResponse.json(
        { error: `标准文件已存在：${duplicate.filename}` },
        { status: 409 }
      );
    }

    // Ensure upload dir exists
    await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

    // Generate unique storage path
    const ext = path.extname(file.name) || `.${fileType}`;
    const storageName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const storagePath = path.join(env.UPLOAD_DIR, storageName);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    // Create DB record
    const [row] = await sql`
      INSERT INTO files (filename, file_type, file_size, storage_path, upload_status, user_id)
      VALUES (${file.name}, ${fileType}, ${file.size}, ${storageName}, 'pending', ${user.id})
      RETURNING id, upload_status
    `;

    // Start ingestion in background (non-blocking)
    ingestFile(row.id).catch((err) => {
      console.error(`Ingestion failed for ${row.id}:`, err);
    });

    return NextResponse.json({
      fileId: row.id,
      status: row.upload_status,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
