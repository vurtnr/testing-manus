export interface EntrustOcrProgressStep {
  id: string;
  label: string;
  detail: string;
}

export function buildEntrustOcrProgressSteps(): EntrustOcrProgressStep[] {
  return [
    {
      id: 'image',
      label: 'Image',
      detail: '读取上传照片，校验委托单完整性与清晰度。',
    },
    {
      id: 'ocr',
      label: 'OCR',
      detail: '提取纸质委托单中的表格文字、手写编号和关键字段。',
    },
    {
      id: 'reasoning',
      label: 'LLM',
      detail: '使用 LLM 理解字段关系，补齐委托人、样品与检测项之间的语义映射。',
    },
    {
      id: 'structuring',
      label: 'Struct',
      detail: '生成结构化摘要，准备交由前台人工确认后按照片原件入库。',
    },
    {
      id: 'ready',
      label: 'Ready',
      detail: '识别完成，等待你确认按照片原件和 OCR 结果一起归档。',
    },
  ];
}

export function getEntrustSubmitHint(hasOcrResult: boolean) {
  return hasOcrResult
    ? 'OCR 摘要已就绪，确认后将按照片原件和识别结果一起归档入库'
    : '请先完成 OCR 识别后再按照片原件入库';
}
