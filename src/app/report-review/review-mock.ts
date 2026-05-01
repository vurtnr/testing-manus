export type ReviewSeverity = 'high' | 'medium' | 'low';

export interface ReviewSection {
  id: string;
  title: string;
  description: string;
}

export interface ReviewIssue {
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

export const MOCK_REVIEW_SECTIONS: ReviewSection[] = [
  { id: 'basic', title: '基本信息', description: '报告编号、委托单位、检测日期' },
  { id: 'specimen', title: '试件信息', description: '试件规格、数量、龄期与状态' },
  { id: 'conclusion', title: '检测结论', description: '判定结论、复核意见、异常说明' },
  { id: 'signature', title: '签字盖章', description: '审核人、批准人、盖章与日期' },
];

export const MOCK_REVIEW_ISSUES: ReviewIssue[] = [
  {
    id: 'issue-1',
    title: '检测结论缺少适用标准编号',
    severity: 'high',
    location: '检测结论 / 第 12 页',
    recommendation: '补充与结论直接关联的标准编号，并在结论段落保留引用依据。',
    sectionId: 'conclusion',
    evidenceTitle: 'JGJ/T 294-2013 结论表述要求',
    evidenceText: '结论应明确引用所依据的标准与判定规则，不得仅给出结果。',
    sourceType: '规则',
  },
  {
    id: 'issue-2',
    title: '试件龄期与原始记录不一致',
    severity: 'high',
    location: '试件信息 / 第 5 页',
    recommendation: '复核原始记录与报告正文，确认龄期字段后重新生成报告。',
    sectionId: 'specimen',
    evidenceTitle: '历史相似案例：龄期字段冲突',
    evidenceText: '同类报告中，龄期冲突通常来自人工录入时未同步修订结论页。',
    sourceType: '历史案例',
  },
  {
    id: 'issue-3',
    title: '委托单位字段缺少统一社会信用代码',
    severity: 'medium',
    location: '基本信息 / 第 1 页',
    recommendation: '补充委托单位识别字段，便于归档和追溯。',
    sectionId: 'basic',
    evidenceTitle: '标准化归档字段建议',
    evidenceText: '归档字段建议包含单位名称、统一社会信用代码与委托编号。',
    sourceType: '语义检索',
  },
  {
    id: 'issue-4',
    title: '审核人签字日期晚于批准日期',
    severity: 'medium',
    location: '签字盖章 / 第 15 页',
    recommendation: '重新核对流程节点日期，避免审批链顺序错误。',
    sectionId: 'signature',
    evidenceTitle: '流程顺序校验规则',
    evidenceText: '审核日期不得晚于批准日期，异常时应要求人工确认流程节点。',
    sourceType: '规则',
  },
  {
    id: 'issue-5',
    title: '建议补充试件照片附件',
    severity: 'low',
    location: '试件信息 / 第 4 页',
    recommendation: '若客户需要追溯完整链路，可追加试件照片附件。',
    sectionId: 'specimen',
    evidenceTitle: '历史项目资料完整性建议',
    evidenceText: '同类型项目在争议复核时常用到试件照片作为补充说明。',
    sourceType: '历史案例',
  },
  {
    id: 'issue-6',
    title: '结论段建议增加风险备注',
    severity: 'low',
    location: '检测结论 / 第 12 页',
    recommendation: '增加对边界样本的风险说明，降低复核沟通成本。',
    sectionId: 'conclusion',
    evidenceTitle: '语义复核建议',
    evidenceText: '当前结论可以通过，但建议补充边界条件说明，提高解释性。',
    sourceType: '语义检索',
  },
];

export function buildIssueSummary(issues: ReviewIssue[]) {
  return issues.reduce(
    (summary, issue) => {
      summary[issue.severity] += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0 }
  );
}
