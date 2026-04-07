import OpenAI from 'openai';
import { getEnv } from './env';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const env = getEnv();
    _client = new OpenAI({
      apiKey: env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }
  return _client;
}

const EMBEDDING_MODEL = 'text-embedding-v3';
const EMBEDDING_DIMENSIONS = 1024;
const MAX_CONCURRENT = 5;

export async function embedText(text: string): Promise<number[]> {
  const client = getClient();
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  // Process in batches of MAX_CONCURRENT
  for (let i = 0; i < texts.length; i += MAX_CONCURRENT) {
    const batch = texts.slice(i, i + MAX_CONCURRENT);
    const embeddings = await Promise.all(batch.map((t) => embedText(t)));
    results.push(...embeddings);
  }
  return results;
}
