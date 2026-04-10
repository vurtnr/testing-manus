import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, AuthError } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    const chunkId = request.nextUrl.searchParams.get('chunkId');
    if (!chunkId) {
      return NextResponse.json({ error: 'chunkId is required' }, { status: 400 });
    }

    const sql = getDb();
    const [chunk] = await sql`
      SELECT c.*, f.filename, f.file_type
      FROM chunks c
      JOIN files f ON c.file_id = f.id
      WHERE c.id = ${chunkId}
    `;

    if (!chunk) {
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: chunk.id,
      fileId: chunk.file_id,
      content: chunk.content,
      sourceLocation: typeof chunk.source_location === 'string'
        ? JSON.parse(chunk.source_location)
        : chunk.source_location,
      tokenCount: chunk.token_count,
      filename: chunk.filename,
      fileType: chunk.file_type,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
