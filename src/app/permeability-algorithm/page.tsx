'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  buildPermeabilityTimeline,
  getPermeabilityAlertCount,
  type PermeabilitySpecimenStatus,
} from './simulation-state';
import './permeability-algorithm.css';

const TIMELINE = buildPermeabilityTimeline();

function getStatusLabel(status: PermeabilitySpecimenStatus) {
  if (status === 'alert') return 'Alert';
  if (status === 'watch') return 'Watch';
  return 'Normal';
}

export default function PermeabilityAlgorithmPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeStage = TIMELINE[activeIndex]!;
  const alertCount = useMemo(() => getPermeabilityAlertCount(activeStage), [activeStage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        if (current >= TIMELINE.length - 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="permeability-layout">
      <header className="permeability-header">
        <button
          type="button"
          className="permeability-back"
          onClick={() => router.push('/')}
        >
          ← 首页 / 抗渗算法
        </button>
        <div className="permeability-header-copy">
          <div className="permeability-kicker">Permeability / AI Simulation</div>
          <h1>混凝土抗渗实验 AI 识别模拟</h1>
          <p>用时间推进的方式模拟 6 组试块从初始干态到边缘渗水异常升级的算法识别过程。</p>
        </div>
        <div className="permeability-header-stats">
          <div className="permeability-stat">
            <span>试块总数</span>
            <strong>6 组</strong>
          </div>
          <div className="permeability-stat">
            <span>当前异常</span>
            <strong>{alertCount} 组</strong>
          </div>
        </div>
      </header>

      <div className="permeability-body">
        <section className="permeability-stage-panel">
          <div className="permeability-stage-head">
            <div>
              <div className="permeability-stage-title">实验台影像</div>
              <div className="permeability-stage-subtitle">
                当前阶段 {activeStage.label} · {activeStage.timestamp}
              </div>
            </div>
            <div className={`permeability-stage-badge status-${alertCount > 0 ? 'alert' : 'normal'}`}>
              {alertCount > 0 ? '边缘渗水预警' : '基线稳定'}
            </div>
          </div>

          <div className="permeability-stage-image-shell">
            <img
              key={activeStage.imagePath}
              src={activeStage.imagePath}
              alt={activeStage.summary}
              className="permeability-stage-image"
            />
            {activeStage.abnormalSpecimenId && (
              <div className="permeability-hotspot hotspot-specimen-4">
                <div className="permeability-hotspot-label">4 号边缘渗水</div>
              </div>
            )}
          </div>

          <div className="permeability-timeline">
            {TIMELINE.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                className={`permeability-timeline-step${index === activeIndex ? ' active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="permeability-timeline-node" />
                <span className="permeability-timeline-label">{stage.label}</span>
                <small>{stage.timestamp}</small>
              </button>
            ))}
          </div>
        </section>

        <aside className="permeability-ai-panel">
          <div className="permeability-ai-card">
            <div className="permeability-ai-title">AI 分析面板</div>
            <div className="permeability-ai-summary">{activeStage.summary}</div>
          </div>

          <div className="permeability-ai-card">
            <div className="permeability-ai-title">试块状态</div>
            <div className="permeability-specimen-list">
              {activeStage.specimens.map((specimen) => (
                <div
                  key={specimen.id}
                  className={`permeability-specimen-item status-${specimen.status}`}
                >
                  <div>
                    <strong>{specimen.label}</strong>
                    <div className="permeability-specimen-status">
                      {getStatusLabel(specimen.status)}
                    </div>
                  </div>
                  <div className="permeability-specimen-confidence">
                    {Math.round(specimen.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="permeability-ai-card">
            <div className="permeability-ai-title">算法判定</div>
            <div className="permeability-decision-grid">
              <div className="permeability-decision-item">
                <span>异常组数</span>
                <strong>{alertCount}</strong>
              </div>
              <div className="permeability-decision-item">
                <span>最高置信度</span>
                <strong>
                  {Math.max(...activeStage.specimens.map((item) => item.confidence * 100)).toFixed(0)}%
                </strong>
              </div>
              <div className="permeability-decision-item span-2">
                <span>结论</span>
                <strong>
                  {activeStage.abnormalSpecimenId
                    ? '检测到第 4 组试块边缘连续渗水，建议判定异常并复核样品密实度。'
                    : '当前 6 组试块保持基线稳定，未发现边缘渗水异常。'}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
