type ReviewSeverity = 'high' | 'medium' | 'low';

interface ReviewIssue {
  id: string;
  title: string;
  severity: ReviewSeverity;
  location: string;
  recommendation: string;
  sectionId: string;
  evidenceTitle: string;
  evidenceText: string;
  sourceType: '规则' | '语义检索' | '历史案例';
}

interface ReviewSection {
  id: string;
  title: string;
  description: string;
}

function buildIssueSummary(issues: ReviewIssue[]) {
  return issues.reduce(
    (summary, issue) => {
      summary[issue.severity] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

export interface ReportReviewSource {
  fileId: string;
  filename: string;
  fileType: string;
  documentTitle: string | null;
  standardNumber: string | null;
  chunkCount: number;
  sectionTitles: string[];
}

export interface ReportReviewPreview {
  fileId: string;
  filename: string;
  fileType: string;
  documentTitle: string | null;
  standardNumber: string | null;
  chunkCount: number;
  sections: ReviewSection[];
  issues: ReviewIssue[];
  summary: ReturnType<typeof buildIssueSummary>;
}

export function buildReportReviewPreview(source: ReportReviewSource): ReportReviewPreview {
  const sections = source.sectionTitles.length > 0
    ? source.sectionTitles.map((title, index) => ({
      id: `section-${index + 1}`,
      title,
      description: '从已解析报告内容中提取的章节',
    }))
    : [
      { id: 'section-1', title: '基本信息', description: '从报告正文提取的基础字段' },
      { id: 'section-2', title: '检测结论', description: '从报告正文提取的结论段' },
    ];

  const issues: ReviewIssue[] = [];
  const conclusionSectionId = sections.find((section) => /结论/.test(section.title))?.id ?? sections[0].id;
  const basicSectionId = sections.find((section) => /基本|信息/.test(section.title))?.id ?? sections[0].id;

  if (!source.standardNumber) {
    issues.push({
      id: 'real-issue-standard',
      title: '报告未识别到标准编号',
      severity: 'high',
      location: `${sections[0].title} / 自动抽取结果`,
      recommendation: '补充标准编号后重新生成审核结论，避免结论缺乏依据。',
      sectionId: conclusionSectionId,
      evidenceTitle: '报告元数据缺少标准编号',
      evidenceText: '当前解析结果未识别出标准编号，无法建立稳定的条款引用链路。',
      sourceType: '规则',
    });
  }

  if (!source.documentTitle) {
    issues.push({
      id: 'real-issue-title',
      title: '未抽取到明确的报告标题',
      severity: 'medium',
      location: `${basicSectionId} / 自动抽取结果`,
      recommendation: '补充规范化标题，便于归档、追溯和导出审核报告。',
      sectionId: basicSectionId,
      evidenceTitle: '报告标题缺失',
      evidenceText: '系统未能从正文前段抽取出稳定标题，可能影响归档字段完整性。',
      sourceType: '语义检索',
    });
  }

  if (source.chunkCount < 20) {
    issues.push({
      id: 'real-issue-content',
      title: '解析内容偏少，建议人工复核原始报告',
      severity: 'medium',
      location: `${conclusionSectionId} / OCR 与切块结果`,
      recommendation: '确认报告页数、清晰度与扫描质量，必要时重新上传清晰版文件。',
      sectionId: conclusionSectionId,
      evidenceTitle: '有效切块数量较少',
      evidenceText: `当前仅生成 ${source.chunkCount} 个文本块，可能存在扫描缺页或识别质量不足。`,
      sourceType: '历史案例',
    });
  }

  issues.push({
    id: 'real-issue-review',
    title: '建议人工确认最终审核结论后再导出',
    severity: 'low',
    location: `${conclusionSectionId} / 审核结论`,
    recommendation: '结合抽取字段与历史案例完成最终人工确认。',
    sectionId: conclusionSectionId,
    evidenceTitle: '审核工作台默认提醒',
    evidenceText: '当前为首轮自动审核结果，导出前仍需人工确认。',
    sourceType: '语义检索',
  });

  return {
    fileId: source.fileId,
    filename: source.filename,
    fileType: source.fileType,
    documentTitle: source.documentTitle,
    standardNumber: source.standardNumber,
    chunkCount: source.chunkCount,
    sections,
    issues,
    summary: buildIssueSummary(issues),
  };
}
