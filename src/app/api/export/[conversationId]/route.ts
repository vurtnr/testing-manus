import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserFromRequest, AuthError } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    const { conversationId } = await params;
    const sql = getDb();

    const [conversation] = await sql`
      SELECT title FROM conversations WHERE id = ${conversationId}
    `;

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const messages = await sql`
      SELECT role, content, citations FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;

    // Build markdown
    let md = `# ${conversation.title || '对话记录'}\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? '👤 用户' : '🤖 助手';
      md += `## ${role}\n\n${msg.content}\n\n`;

      if (msg.citations) {
        const citations = typeof msg.citations === 'string'
          ? JSON.parse(msg.citations)
          : msg.citations;

        if (Array.isArray(citations) && citations.length > 0) {
          md += '**引用来源：**\n\n';
          for (const c of citations) {
            md += `- [${c.index}] ${c.filename} - ${formatSource(c.sourceLocation)}\n`;
          }
          md += '\n';
        }
      }
    }

    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="conversation-${conversationId.slice(0, 8)}.md"`,
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function formatSource(loc: Record<string, any>): string {
  if (loc.page) return `第${loc.page}页`;
  if (loc.section) return loc.section;
  if (loc.sheet) return `${loc.sheet}${loc.rowRange ? ` (${loc.rowRange[0]}-${loc.rowRange[1]}行)` : ''}`;
  return loc.filename || '未知';
}
