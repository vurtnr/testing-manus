import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, AuthError } from '@/lib/auth';
import { buildReportReviewPreview } from '@/app/report-review/review-preview';

export async function GET(request: NextRequest) {
  try {
    await getUserFromRequest(request);
    const fileId = request.nextUrl.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const sql = getDb();
    const [file] = await sql`
      SELECT id, filename, file_type, document_title, standard_number
      FROM files
      WHERE id = ${fileId}
      LIMIT 1
    `;

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const [chunkStats] = await sql`
      SELECT COUNT(*)::int AS chunk_count
      FROM chunks
      WHERE file_id = ${fileId}
    `;

    const sectionRows = await sql`
      SELECT DISTINCT section_title
      FROM chunks
      WHERE file_id = ${fileId}
        AND section_title IS NOT NULL
        AND section_title <> ''
      ORDER BY section_title
      LIMIT 6
    `;

    const preview = buildReportReviewPreview({
      fileId: file.id,
      filename: file.filename,
      fileType: file.file_type,
      documentTitle: file.document_title,
      standardNumber: file.standard_number,
      chunkCount: chunkStats?.chunk_count ?? 0,
      sectionTitles: sectionRows.map((row: any) => row.section_title as string),
    });

    return NextResponse.json(preview);
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
