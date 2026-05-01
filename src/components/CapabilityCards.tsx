'use client';

import { useMemo, useState } from 'react';

export type CapabilityId = 'sales' | 'inspection' | 'management' | 'knowledge';

interface ModuleCard {
  id: string;
  title: string;
  desc: string;
}

interface CapabilityCard {
  id: CapabilityId;
  name: string;
  icon: string;
  desc: string;
  accent: string;
  eyebrow: string;
  hint: string;
  modules?: ModuleCard[];
}

interface CapabilityBadge {
  count: number;
  statusLabel: string;
}

interface Props {
  onKnowledgeClick: () => void;
  onModuleClick: (moduleId: string) => void;
  expandedId?: CapabilityId | null;
  onExpandedChange?: (id: CapabilityId | null) => void;
  inspectionBadge?: CapabilityBadge | null;
  inspectionTaskBadge?: CapabilityBadge | null;
  inspectionReviewBadge?: CapabilityBadge | null;
  inspectionIssueBadge?: CapabilityBadge | null;
}

const CAPABILITIES: CapabilityCard[] = [
  {
    id: 'sales',
    name: '销售',
    icon: '💼',
    accent: 'sales',
    eyebrow: 'Business',
    hint: '点击展开销售模块',
    desc: '围绕经营合同、财务和招投标快速进入业务处理。',
    modules: [
      { id: 'sales-contract', title: '合同', desc: '合同扫描、要点提取与风险评审。' },
      { id: 'sales-finance', title: '财务', desc: '收入汇总、回款跟踪与经营分析。' },
      { id: 'sales-bid', title: '招投标', desc: '标书整理、要求核对与投标准备。' },
    ],
  },
  {
    id: 'inspection',
    name: '检测',
    icon: '🔬',
    accent: 'inspection',
    eyebrow: 'Lab Ops',
    hint: '点击展开检测流程',
    desc: '聚焦委托流转、审核签发和个人任务执行。',
    modules: [
      { id: 'inspection-entrust', title: '委托', desc: '录入委托、识别资料缺失并触发受理。' },
      { id: 'inspection-task', title: '我的任务', desc: '汇总待办、实验节点和个人进度。' },
      { id: 'inspection-review', title: '审核', desc: '进入审核工作台处理待审核原始数据。' },
      { id: 'inspection-issue', title: '签发', desc: '确认结论、签发文档并追踪回执。' },
    ],
  },
  {
    id: 'management',
    name: '管理',
    icon: '🧭',
    accent: 'management',
    eyebrow: 'Org',
    hint: '点击展开管理入口',
    desc: '承接组织协同和绩效管理两类高频后台工作。',
    modules: [
      { id: 'management-oa', title: 'OA', desc: '审批、通知和跨部门协同入口。' },
      { id: 'management-performance', title: '人员绩效', desc: '人员产能、任务完成率和绩效复盘。' },
    ],
  },
  {
    id: 'knowledge',
    name: '知识库',
    icon: '📚',
    accent: 'knowledge',
    eyebrow: 'Knowledge',
    hint: '直接进入知识检索',
    desc: '标准、案例和依据检索入口保持独立，直接进入知识库。',
  },
];

export default function CapabilityCards({
  onKnowledgeClick,
  onModuleClick,
  expandedId: controlledExpandedId,
  onExpandedChange,
  inspectionBadge,
  inspectionTaskBadge,
  inspectionReviewBadge,
  inspectionIssueBadge,
}: Props) {
  const [internalExpandedId, setInternalExpandedId] = useState<CapabilityId | null>(null);
  const expandedId = controlledExpandedId ?? internalExpandedId;
  const setExpandedId = onExpandedChange ?? setInternalExpandedId;

  const visibleCards = useMemo(() => {
    if (!expandedId) return CAPABILITIES;
    return CAPABILITIES.filter((card) => card.id === expandedId);
  }, [expandedId]);

  return (
    <div className={`capability-grid${expandedId ? ' single-mode' : ''}`}>
      {visibleCards.map((capability) => {
        const isExpanded = expandedId === capability.id;
        const isKnowledge = capability.id === 'knowledge';

        if (isExpanded && capability.modules) {
          return (
            <div
              key={capability.id}
              className={`capability-card capability-expanded accent-${capability.accent}`}
            >
              <button
                type="button"
                className="capability-close-btn"
                aria-label={`收起${capability.name}`}
                onClick={() => setExpandedId(null)}
              >
                ×
              </button>
              <div className="capability-header">
                <div>
                  <div className="capability-eyebrow">{capability.eyebrow}</div>
                  <div className="capability-name">
                    <div className="capability-icon">{capability.icon}</div>
                    {capability.name}
                  </div>
                </div>
                <div className="capability-expanded-meta">
                  {capability.id === 'inspection' && inspectionBadge ? (
                    <span className="capability-badge">
                      {inspectionBadge.count} · {inspectionBadge.statusLabel}
                    </span>
                  ) : (
                    `${capability.modules.length} 个模块`
                  )}
                </div>
              </div>
              <div className="capability-desc">{capability.desc}</div>
              <div className="capability-module-grid">
                {capability.modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className="capability-module-card"
                    onClick={() => onModuleClick(module.id)}
                  >
                    {module.id === 'inspection-task' && inspectionTaskBadge && (
                      <span className="capability-module-badge">
                        {inspectionTaskBadge.count} · {inspectionTaskBadge.statusLabel}
                      </span>
                    )}
                    {module.id === 'inspection-review' && inspectionReviewBadge && (
                      <span className="capability-module-badge">
                        {inspectionReviewBadge.count} · {inspectionReviewBadge.statusLabel}
                      </span>
                    )}
                    {module.id === 'inspection-issue' && inspectionIssueBadge && (
                      <span className="capability-module-badge">
                        {inspectionIssueBadge.count} · {inspectionIssueBadge.statusLabel}
                      </span>
                    )}
                    <div className="capability-module-title">{module.title}</div>
                    <div className="capability-module-desc">{module.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        }

        return (
          <button
            key={capability.id}
            type="button"
            className={`capability-card capability-entry accent-${capability.accent}${isKnowledge ? ' knowledge-entry' : ''}`}
            onClick={() => {
              if (isKnowledge) {
                onKnowledgeClick();
                return;
              }
              setExpandedId(capability.id);
            }}
          >
              <div className="capability-header">
                <div>
                  <div className="capability-eyebrow">{capability.eyebrow}</div>
                  <div className="capability-name">
                    <div className="capability-icon">{capability.icon}</div>
                    {capability.name}
                  </div>
                </div>
                {capability.id === 'inspection' && inspectionBadge && (
                  <span className="capability-badge">
                    {inspectionBadge.count} · {inspectionBadge.statusLabel}
                  </span>
                )}
              </div>
            <div className="capability-desc">{capability.desc}</div>
            <div className="capability-entry-footer">
              <span className="capability-entry-hint">{capability.hint}</span>
              <span className="capability-entry-arrow">{isKnowledge ? '→' : '+'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
