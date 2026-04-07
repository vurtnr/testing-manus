import { getEnv } from './env';

export interface RerankResult {
  index: number;
  relevanceScore: number;
  text: string;
}

export async function rerank(
  query: string,
  documents: string[],
  topN = 5
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];

  const env = getEnv();

  const response = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gte-rerank-v2',
        input: {
          query,
          documents,
        },
        parameters: {
          return_documents: true,
          top_n: Math.min(topN, documents.length),
        },
      }),
    }
  );

  const data = await response.json();
  if (data.code) {
    throw new Error(`Rerank error: ${data.message}`);
  }

  return data.output.results.map((r: any) => ({
    index: r.index,
    relevanceScore: r.relevance_score,
    text: r.document?.text ?? '',
  }));
}
