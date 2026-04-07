import { pdf } from 'pdf-to-img';
import { getClient } from '../dashscope';

const OCR_MODEL = 'qwen-vl-ocr-latest';

export interface ParsedPage {
  pageIndex: number;
  text: string;
}

async function ocrPageFromImage(imageBuffer: Buffer): Promise<string> {
  const base64 = imageBuffer.toString('base64');
  const client = getClient();

  const response = await client.chat.completions.create({
    model: OCR_MODEL,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          },
          {
            type: 'text' as const,
            text: '请逐字逐句提取此页面中的所有文字内容，严格保持原文，一个字都不要改。要求：1. 不要使用LaTeX或数学公式格式，所有内容保持纯文本输出；2. 尺寸、公差、范围等保持原文写法（如"240±2"不要变成公式）；3. 如果有表格，用Markdown表格格式输出；4. 只输出提取的文字，不要额外说明。',
          },
        ] as any,
      },
    ],
    max_tokens: 8192,
  });

  return response.choices[0]?.message?.content ?? '';
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPage[]> {
  const pages: ParsedPage[] = [];

  // Render all pages to images, then OCR each one
  const doc = await pdf(buffer, { scale: 2 });
  const totalPages = doc.length;
  console.log(`PDF: rendering ${totalPages} pages for OCR`);

  let pageNum = 0;
  for await (const image of doc) {
    pageNum++;
    try {
      console.log(`OCR page ${pageNum}/${totalPages}...`);
      const ocrText = await ocrPageFromImage(Buffer.from(image));
      if (ocrText.trim()) {
        pages.push({ pageIndex: pageNum, text: ocrText.trim() });
      }
    } catch (err) {
      console.error(`OCR failed for page ${pageNum}:`, err);
    }
  }

  return pages;
}
