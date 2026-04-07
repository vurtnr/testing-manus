import { getClient, CHAT_MODEL } from './dashscope';
import { hybridSearch, RetrievalResult, expandWithNeighbors, SearchFilters } from './retrieval';
import { getDb } from './db';
import { rewriteQuery } from './query-rewrite';
import { rerank } from './reranker';

export interface Citation {
  index: number;
  chunkId: string;
  fileId: string;
  filename: string;
  fileType: string;
  sourceLocation: Record<string, any>;
  textExcerpt: string;
  confidenceScore: number;
}

const SYSTEM_PROMPT = `你是一个材料检测标准知识库助手，负责根据检索到的国家标准、行业标准或相关标准文本回答用户问题。

请严格遵循以下规则：

1. 只能依据当前提供的检索内容作答，包括标准正文、条款、表格、附录、注释及元数据；不得将模型自身已有知识、常识或经验性说法当作标准依据输出。
2. 回答优先给出标准依据，包括标准编号、标准名称、版本年份、相关条款号、表格号或附录位置。使用 [1]、[2] 等引用标记标注来源。
3. 如果当前检索内容不足以支持明确结论，必须明确说明"根据当前提供的标准内容无法确认"或"当前证据不足"，不得猜测，不得补全缺失条款。
4. 如果回答包含推断，必须明确标注"[推断]"并说明推断依据，让用户区分原文明确规定和基于条文的推断。
5. 若不同标准、不同版本或不同条款之间存在冲突，必须明确指出冲突点；若无法判断优先级，不得自行选择其一作为最终结论。
6. 涉及适用范围、材料类别、试验条件、判定规则、指标数值、单位、环境条件、前处理方法时，必须严格依据原文，不得编造或泛化。
7. 如果结论成立有前提条件，先说明适用前提，再给出结论。不得把局部规定表述为普遍规则。
8. 回答应尽量使用以下结构：
   - **结论**：直接回答用户问题
   - **适用前提**：此结论适用的材料/条件/范围
   - **依据**：标准号/名称/条款号/表格/附录，附引用标记
   - **说明**：是否为原文明确规定、是否存在版本限制、当前是否信息不足
9. 当用户问题表述模糊，无法唯一确定具体材料、检测项目、标准对象或版本时，应指出需要补充的信息，而不是直接给出绝对结论。
10. 不得编造不存在的标准、条款号、数值、单位、试验步骤、判定要求或实施条件。

回答时使用用户提问的语言（中文问题用中文回答，英文问题用英文回答）。

参考文档：
{context}`;

export async function* ragStream(
  query: string,
  conversationId?: string,
  filters?: SearchFilters,
  userId?: string
): AsyncGenerator<{ type: string; data: any }> {
  const sql = getDb();

  // 1. Query rewrite — generate multiple search angles
  yield { type: 'retrieval_progress', data: { stage: 'rewriting_query' } };
  const queries = await rewriteQuery(query);

  // 2. Coarse recall — multi-query hybrid search
  yield { type: 'retrieval_progress', data: { stage: 'coarse_recall', queries } };
  const allResults = await Promise.all(
    queries.map((q) => hybridSearch(q, 20, filters))
  );
  const coarseResults = dedupByChunkId(allResults.flat());

  // 3. Rerank — cross-encoder precision sort
  let finalResults: RetrievalResult[];
  if (coarseResults.length > 0) {
    yield { type: 'retrieval_progress', data: { stage: 'reranking', candidateCount: coarseResults.length } };
    const chunkTexts = coarseResults.map((r) => r.content);
    const reranked = await rerank(query, chunkTexts, 5);
    // Map reranked indices back to RetrievalResults
    finalResults = reranked.map((r) => coarseResults[r.index]);
  } else {
    finalResults = [];
  }

  // 3.5. Expand child hits to parent + sibling context
  yield { type: 'retrieval_progress', data: { stage: 'expanding_context' } };
  finalResults = await expandWithNeighbors(finalResults);

  yield { type: 'retrieval_progress', data: { chunksFound: finalResults.length } };

  // 4. Build context with source metadata — use expanded content when available
  const context = finalResults
    .map((r, i) => `[${i + 1}] ${r.expandedContent ?? r.content}`)
    .join('\n\n');

  // 5. Get filename for citations
  const fileIds = [...new Set(finalResults.map((r) => r.fileId))];
  const files = await sql`
    SELECT id, filename, file_type FROM files WHERE id = ANY(${fileIds})
  `;
  const fileMap = new Map(files.map((f: any) => [f.id, f]));

  // 6. Build citation list
  const citations: Citation[] = finalResults.map((r, i) => ({
    index: i + 1,
    chunkId: r.id,
    fileId: r.fileId,
    filename: fileMap.get(r.fileId)?.filename ?? '未知文件',
    fileType: fileMap.get(r.fileId)?.file_type ?? 'unknown',
    sourceLocation: r.sourceLocation,
    textExcerpt: r.content.slice(0, 300),
    confidenceScore: r.finalScore,
  }));

  // Send citations
  yield { type: 'citations', data: citations };

  // 7. Create or get conversation
  let convId: string = conversationId ?? '';
  if (!convId) {
    const [conv] = await sql`
      INSERT INTO conversations (title, user_id) VALUES (${query.slice(0, 50)}, ${userId || '00000000-0000-0000-0000-000000000000'})
      RETURNING id
    `;
    convId = conv.id;
  }

  // Save user message
  await sql`
    INSERT INTO messages (conversation_id, role, content) VALUES (${convId}, 'user', ${query})
  `;

  // 8. Stream response from Qwen
  const systemMessage = SYSTEM_PROMPT.replace('{context}', context);
  const client = getClient();

  const stream = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: query },
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      fullResponse += text;
      yield { type: 'content', data: { text } };
    }
  }

  // 9. Save assistant message with citations
  await sql`
    INSERT INTO messages (conversation_id, role, content, citations)
    VALUES (${convId}, 'assistant', ${fullResponse}, ${JSON.stringify(citations)})
  `;

  // Send suggestions
  yield {
    type: 'suggestions',
    data: generateSuggestions(query, finalResults),
  };

  yield { type: 'done', data: { conversationId: convId } };
}

function dedupByChunkId(results: RetrievalResult[]): RetrievalResult[] {
  const seen = new Map<string, RetrievalResult>();
  for (const r of results) {
    const existing = seen.get(r.id);
    if (!existing || r.finalScore > existing.finalScore) {
      seen.set(r.id, r);
    }
  }
  return [...seen.values()].sort((a, b) => b.finalScore - a.finalScore);
}

function generateSuggestions(query: string, results: RetrievalResult[]): string[] {
  const suggestions: string[] = [];

  if (results.length > 0) {
    const sources = new Set(results.map((r) => r.sourceLocation.type));
    if (sources.has('pdf')) {
      suggestions.push('这个问题的具体依据在哪一页？');
    }
    if (sources.has('xlsx')) {
      suggestions.push('能否以表格形式展示相关数据？');
    }
    suggestions.push('还有其他相关条款吗？');
  }

  return suggestions.slice(0, 3);
}
