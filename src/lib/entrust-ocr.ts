import { z } from 'zod';
import { getClient, VL_MODEL } from './dashscope';
import type { EntrustOcrResult } from './entrust';

const entrustOcrSchema = z.object({
  confidence: z.number().min(0).max(1).default(0.85),
    fields: z.object({
    paperEntrustNo: z.string().default(''),
    contractNo: z.string().default(''),
    clientName: z.string().default(''),
    constructionUnit: z.string().default(''),
    supervisionUnit: z.string().default(''),
    contractorUnit: z.string().default(''),
    projectName: z.string().default(''),
    projectLocation: z.string().default(''),
    witnessName: z.string().default(''),
    witnessPhone: z.string().default(''),
    samplerName: z.string().default(''),
    samplerPhone: z.string().default(''),
    sampleName: z.string().default(''),
    sampleCount: z.number().int().default(1),
    sampleSpec: z.string().default(''),
    sampleBatch: z.string().default(''),
    engineeringPart: z.string().default(''),
    manufacturer: z.string().default(''),
    representativeQuantity: z.string().default(''),
    productionDate: z.string().default(''),
    testItems: z.string().default(''),
    testStandard: z.string().default(''),
    sampleCode: z.string().default(''),
    contactName: z.string().default(''),
    contactPhone: z.string().default(''),
      receivedAt: z.string().default(''),
      note: z.string().default(''),
      ocrSourceName: z.string().default(''),
      sourceImageName: z.string().default(''),
      sourceImagePath: z.string().default(''),
    }),
  rawText: z.string().default(''),
});

function extractJsonObject(content: string): unknown {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1]);
  }

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(content.slice(firstBrace, lastBrace + 1));
  }

  throw new Error('OCR result did not contain valid JSON');
}

export async function extractEntrustFormFromImage(base64Image: string, filename: string): Promise<EntrustOcrResult> {
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
            text:
              '你是一名检测行业前台受理员，负责从纸质建设工程检测委托书中提取关键字段。' +
              '请识别图片中的所有关键栏位，并只输出一个 JSON 对象，不要输出解释。' +
              '要求：1. 尽量逐字提取；2. 看不清的字段输出空字符串；3. 电话、编号、日期保持原样；' +
              '4. 样品名称、规格型号、工程部位、生产厂家、代表数量/值、检测参数、检测标准、样品编号都尽量提取；' +
              '5. 如果表格只有一行样品，就提取这一行；6. JSON 格式必须是 ' +
              '{"confidence":0.0-1.0,"rawText":"全文OCR文本","fields":{"paperEntrustNo":"","contractNo":"","clientName":"","constructionUnit":"","supervisionUnit":"","contractorUnit":"","projectName":"","projectLocation":"","witnessName":"","witnessPhone":"","samplerName":"","samplerPhone":"","sampleName":"","sampleCount":1,"sampleSpec":"","sampleBatch":"","engineeringPart":"","manufacturer":"","representativeQuantity":"","productionDate":"","testItems":"","testStandard":"","sampleCode":"","contactName":"","contactPhone":"","receivedAt":"","note":"","ocrSourceName":"' +
              filename +
              '","sourceImageName":"' + filename + '","sourceImagePath":""}}',
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content ?? '';
  const parsed = entrustOcrSchema.parse(extractJsonObject(content));
  return {
    sourceName: filename,
    confidence: parsed.confidence,
    rawText: parsed.rawText,
    fields: {
      ...parsed.fields,
      ocrSourceName: filename,
      sourceImageName: filename,
      sourceImagePath: '',
    },
  };
}
