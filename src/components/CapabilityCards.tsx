'use client';

interface Props {
  onCardClick: (capability: string) => void;
}

const CAPABILITIES = [
  {
    id: 'inspection',
    name: '检测软件',
    icon: '🔬',
    status: '即将上线',
    statusClass: 'soon',
    desc: '报告审核、合同评审与财务统计自动化处理',
    abilities: ['报告审核', '合同评审', '财务统计'],
    comingSoon: true,
  },
  {
    id: 'monitoring',
    name: '实时监控',
    icon: '📡',
    status: '即将上线',
    statusClass: 'soon',
    desc: '抗渗、抗压、抗拉实时数据监控与异常预警',
    abilities: ['抗渗监控', '抗压监控', '抗拉监控'],
    comingSoon: true,
  },
  {
    id: 'knowledge',
    name: '知识库',
    icon: '📚',
    status: '可用',
    statusClass: '',
    desc: '国家标准、行业标准智能检索与依据引用',
    abilities: ['标准检索', '案例查询', '依据引用'],
    comingSoon: false,
  },
];

export default function CapabilityCards({ onCardClick }: Props) {
  return (
    <div className="capability-grid">
      {CAPABILITIES.map((cap) => (
        <div
          key={cap.id}
          className={`capability-card${cap.comingSoon ? ' coming-soon' : ''}`}
          onClick={() => onCardClick(cap.id)}
        >
          <div className="capability-header">
            <div className="capability-name">
              <div className="capability-icon">{cap.icon}</div>
              {cap.name}
            </div>
            <span className={`capability-status${cap.statusClass ? ' ' + cap.statusClass : ''}`}>
              {cap.status}
            </span>
          </div>
          <div className="capability-desc">{cap.desc}</div>
          <div className="capability-abilities">
            {cap.abilities.map((a) => (
              <span key={a} className="ability-tag">{a}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
