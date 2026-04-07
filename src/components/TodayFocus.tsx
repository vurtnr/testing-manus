'use client';

const FOCUS_ITEMS = [
  {
    dotColor: 'red',
    label: '待审核报告',
    detail: '3 份高风险，需优先处理',
    count: '12',
  },
  {
    dotColor: 'amber',
    label: '抗压异常',
    detail: '今日新增 2 组数据超阈值',
    count: '2',
  },
  {
    dotColor: 'blue',
    label: '待确认复核建议',
    detail: '来自上周异常分析',
    count: '5',
  },
  {
    dotColor: 'green',
    label: '财务统计',
    detail: '本月检测收入增长 8%',
    count: '+8%',
  },
];

export default function TodayFocus() {
  return (
    <div className="focus-grid">
      {FOCUS_ITEMS.map((item) => (
        <div key={item.label} className="focus-card">
          <div className={`focus-dot ${item.dotColor}`} />
          <div className="focus-content">
            <div className="focus-label">{item.label}</div>
            <div className="focus-detail">{item.detail}</div>
          </div>
          <div className="focus-count">{item.count}</div>
        </div>
      ))}
    </div>
  );
}
