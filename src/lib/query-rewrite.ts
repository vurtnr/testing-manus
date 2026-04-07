import { getClient } from './dashscope';

const REWRITE_MODEL = 'qwen-turbo';

const REWRITE_SYSTEM = `你是一个查询改写助手。将用户问题改写为更适合文档检索的形式。

规则:
1. 消解代词 (把"它"、"这个"替换为具体名词)
2. 展开缩写 (如 "GBT" → "GB/T 国标")
3. 提取隐含条件 (如 "最新的" → 加上时间限定)
4. 拆出核心检索词
5. 输出一个 JSON 数组，包含 2-3 个不同角度的改写查询
6. 保持用户原语言 (中文问题输出中文改写)

输出格式 (仅输出 JSON，不要其他内容):
["改写查询1", "改写查询2", "改写查询3"]`;

export async function rewriteQuery(query: string): Promise<string[]> {
  const client = getClient();

  try {
    const response = await client.chat.completions.create({
      model: REWRITE_MODEL,
      messages: [
        { role: 'system', content: REWRITE_SYSTEM },
        { role: 'user', content: `原始问题: ${query}` },
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const text = response.choices[0]?.message?.content ?? '[]';
    const cleaned = text.replace(/```json?\n?/g, '').trim();
    const rewritten: string[] = JSON.parse(cleaned);

    // Always include original query, deduplicate
    return [...new Set([query, ...rewritten.filter((q) => q.trim())])];
  } catch {
    // If rewrite fails, just use the original query
    console.warn('Query rewrite failed, using original query only');
    return [query];
  }
}
