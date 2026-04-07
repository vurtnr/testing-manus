import { imageOcr } from '../dashscope';

export interface ParsedImage {
  ocrText: string;
}

export async function parseImage(buffer: Buffer): Promise<ParsedImage> {
  const base64 = buffer.toString('base64');
  const ocrText = await imageOcr(base64);
  return { ocrText };
}
