import OpenAI from 'openai';
import { getEnv } from './env';

let _client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!_client) {
    const env = getEnv();
    _client = new OpenAI({
      apiKey: env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }
  return _client;
}

export const CHAT_MODEL = 'qwen-plus';
export const VL_MODEL = 'qwen-vl-plus';

export async function chatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  stream = false
): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getClient();
  return client.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    stream,
    temperature: 0.7,
    max_tokens: 2048,
  });
}

export async function imageOcr(base64Image: string): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: VL_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          {
            type: 'text',
            text: '请提取图片中的所有文字内容，保持原始格式和结构。如果图片中有表格，请用Markdown表格格式输出。',
          },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? '';
}
