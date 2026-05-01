'use client';

import {
  buildHomeFinanceBandSnapshot,
  formatCompactCny,
  formatPercent,
} from './home-finance-band-data';

const SNAPSHOT = buildHomeFinanceBandSnapshot(new Date('2026-04-22T09:00:00+08:00'));

const SERIES_META = [
  { key: 'contractAmount', label: '合同金额', color: '#0f766e' },
  { key: 'collectedAmount', label: '已收款', color: '#14b8a6' },
  { key: 'receivableAmount', label: '应收款', color: '#f59e0b' },
  { key: 'outputValue', label: '产值', color: '#2563eb' },
] as const;

const KPI_COPY = {
  contractAmount: '年度累计签约额，3 月进入集中中标期。',
  collectedAmount: '回款保持追赶，4 月回笼速度明显抬升。',
  receivableAmount: '存量应收仍有压力，主要来自 2-3 月新签项目。',
  outputValue: '已完成检测对应的确认产值，接近合同额的四分之三。',
} as const;

const CHART_WIDTH = 720;
const CHART_HEIGHT = 284;
const CHART_PADDING = { top: 18, right: 20, bottom: 28, left: 54 };

function getChartValue(point: (typeof SNAPSHOT.series)[number], key: (typeof SERIES_META)[number]['key']) {
  return point[key];
}

function createLinePath(
  key: (typeof SERIES_META)[number]['key'],
  maxValue: number
) {
  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  return SNAPSHOT.series
    .map((point, index) => {
      const x =
        CHART_PADDING.left +
        (index / (SNAPSHOT.series.length - 1)) * innerWidth;
      const y =
        CHART_PADDING.top +
        innerHeight -
        (getChartValue(point, key) / maxValue) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function HomeFinanceBand() {
  const maxValue = Math.max(...SNAPSHOT.series.map((point) => point.contractAmount));
  const yAxisTicks = [0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: maxValue * ratio,
  }));

  const collectionRate =
    SNAPSHOT.summary.collectedAmount / SNAPSHOT.summary.contractAmount;
  const receivableRate =
    SNAPSHOT.summary.receivableAmount / SNAPSHOT.summary.contractAmount;
  const outputRate =
    SNAPSHOT.summary.outputValue / SNAPSHOT.summary.contractAmount;

  return (
    <section className="home-finance-band" aria-label="2026 YTD 经营概览">
      <div className="home-finance-band-head">
        <div>
          <div className="home-finance-band-kicker">2026 YTD Operations Snapshot</div>
          <h2 className="home-finance-band-title">经营概览</h2>
        </div>
      </div>

      <div className="home-finance-kpi-grid">
        {SERIES_META.map((metric) => {
          const value = SNAPSHOT.summary[metric.key];

          return (
            <article key={metric.key} className="home-finance-kpi-card">
              <div className="home-finance-kpi-top">
                <span
                  className="home-finance-kpi-dot"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="home-finance-kpi-label">{metric.label}</span>
              </div>
              <div className="home-finance-kpi-value">{formatCompactCny(value)}</div>
              <div className="home-finance-kpi-copy">
                {KPI_COPY[metric.key]}
              </div>
            </article>
          );
        })}
      </div>

      <div className="home-finance-band-body">
        <article className="home-finance-chart-card">
          <div className="home-finance-card-head">
            <div className="home-finance-card-title">年度累计走势</div>
            <div className="home-finance-card-subtitle">
              合同、回款、应收与产值从 1 月到 4 月的累计变化
            </div>
          </div>

          <div className="home-finance-legend">
            {SERIES_META.map((metric) => (
              <div key={metric.key} className="home-finance-legend-item">
                <span
                  className="home-finance-legend-line"
                  style={{ backgroundColor: metric.color }}
                />
                <span>{metric.label}</span>
              </div>
            ))}
          </div>

          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="home-finance-chart"
            role="img"
            aria-label="合同金额、已收款、应收款与产值累计趋势图"
          >
            {yAxisTicks.map((tick) => {
              const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
              const y =
                CHART_PADDING.top + innerHeight - tick.ratio * innerHeight;
              return (
                <g key={tick.ratio}>
                  <line
                    x1={CHART_PADDING.left}
                    x2={CHART_WIDTH - CHART_PADDING.right}
                    y1={y}
                    y2={y}
                    className="home-finance-grid-line"
                  />
                  <text
                    x={CHART_PADDING.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="home-finance-axis-label"
                  >
                    {formatCompactCny(tick.value)}
                  </text>
                </g>
              );
            })}

            {SNAPSHOT.series.map((point, index) => {
              const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
              const x =
                CHART_PADDING.left +
                (index / (SNAPSHOT.series.length - 1)) * innerWidth;
              return (
                <text
                  key={point.isoDate}
                  x={x}
                  y={CHART_HEIGHT - 6}
                  textAnchor="middle"
                  className="home-finance-axis-label"
                >
                  {point.label}
                </text>
              );
            })}

            {SERIES_META.map((metric) => (
              <path
                key={metric.key}
                d={createLinePath(metric.key, maxValue)}
                fill="none"
                stroke={metric.color}
                strokeWidth={metric.key === 'collectedAmount' ? 4 : 3}
                strokeDasharray={metric.key === 'receivableAmount' ? '8 6' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        </article>

        <article className="home-finance-mix-card">
          <div className="home-finance-card-head">
            <div className="home-finance-card-title">回款结构</div>
            <div className="home-finance-card-subtitle">
              今年签约盘子里，资金回笼与存量应收的当前关系
            </div>
          </div>

          <div className="home-finance-mix-bar" aria-hidden="true">
            <div
              className="home-finance-mix-segment collected"
              style={{ width: `${collectionRate * 100}%` }}
            />
            <div
              className="home-finance-mix-segment receivable"
              style={{ width: `${receivableRate * 100}%` }}
            />
          </div>

          <div className="home-finance-mix-stats">
            <div className="home-finance-mix-item">
              <div className="home-finance-mix-label">已收款占合同额</div>
              <div className="home-finance-mix-value">{formatPercent(collectionRate)}</div>
            </div>
            <div className="home-finance-mix-item">
              <div className="home-finance-mix-label">应收款占合同额</div>
              <div className="home-finance-mix-value">{formatPercent(receivableRate)}</div>
            </div>
            <div className="home-finance-mix-item">
              <div className="home-finance-mix-label">产值兑现率</div>
              <div className="home-finance-mix-value">{formatPercent(outputRate)}</div>
            </div>
          </div>

          <div className="home-finance-milestones">
            <div className="home-finance-milestone">
              <strong>1 月</strong>
              <span>节前委托平稳，签约额刚起量。</span>
            </div>
            <div className="home-finance-milestone">
              <strong>3 月</strong>
              <span>集中进样与中标叠加，合同与产值明显抬升。</span>
            </div>
            <div className="home-finance-milestone">
              <strong>4 月</strong>
              <span>回款追赶加快，但应收盘子仍需持续催收。</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
