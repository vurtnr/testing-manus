'use client';

interface Props {
  onScenarioClick: (scenario: string) => void;
}

const SCENARIOS = [
  { icon: '📝', name: '报告审核场景' },
  { icon: '⚠️', name: '异常复核场景' },
  { icon: '📖', name: '标准检索场景' },
  { icon: '📄', name: '合同评审场景' },
  { icon: '💰', name: '财务分析场景' },
];

export default function ScenarioEntries({ onScenarioClick }: Props) {
  return (
    <div className="scenario-grid">
      {SCENARIOS.map((s) => (
        <div
          key={s.name}
          className="scenario-card"
          onClick={() => onScenarioClick(s.name)}
        >
          <div className="scenario-icon">{s.icon}</div>
          <div className="scenario-name">{s.name}</div>
        </div>
      ))}
    </div>
  );
}
