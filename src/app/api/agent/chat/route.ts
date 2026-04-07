import { NextRequest } from 'next/server';
import { chatCompletion } from '@/lib/dashscope';
import { getUserFromRequest, AuthError } from '@/lib/auth';

const AGENT_SYSTEM_PROMPT = `你是 MaterialSense 材料检测智能助手。你是一个专业的材料检测领域 Agent，能够帮助用户完成以下任务：

1. 检测报告审核：分析和审核检测报告的完整性和合规性
2. 异常数据分析：识别检测数据中的异常模式和趋势
3. 合同风险扫描：审查检测合同中的风险条款
4. 财务统计汇总：汇总和分析检测业务财务数据
5. 知识查询：国家标准、行业标准的检索和解读

回答要求：
- 用中文回答
- 回答要准确、专业、有条理
- 如果用户的问题涉及具体标准条款或需要查阅文档，建议用户使用知识库功能
- 如果涉及实时监控数据，提示用户该功能即将上线`;

const MAX_MESSAGES = 50;
const MAX_BODY_SIZE = 10240; // 10KB

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    // Body size check
    const body = await request.text();
    if (body.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: '请求体过大' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response(JSON.stringify({ error: '无效的请求格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message, messages } = parsed;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: '消息不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build message history, filter out system roles from client
    const history: { role: 'user' | 'assistant'; content: string }[] = (messages || [])
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))
      .slice(-MAX_MESSAGES);

    const allMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await chatCompletion(allMessages, true);

          for await (const chunk of completion as AsyncIterable<any>) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = `data: ${JSON.stringify({ type: 'content', data: { text: content } })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }

          const doneData = `data: ${JSON.stringify({ type: 'done', data: {} })}\n\n`;
          controller.enqueue(encoder.encode(doneData));
          controller.close();
        } catch (error: any) {
          const errorData = `data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
