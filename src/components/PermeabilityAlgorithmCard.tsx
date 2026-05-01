'use client';

interface Props {
  onOpen: () => void;
}

export default function PermeabilityAlgorithmCard({ onOpen }: Props) {
  return (
    <button
      type="button"
      className="permeability-algorithm-card"
      onClick={onOpen}
    >
      <div className="permeability-algorithm-copy">
        <div className="permeability-algorithm-kicker">Algorithm Showcase</div>
        <h3 className="permeability-algorithm-title">抗渗算法</h3>
        <p className="permeability-algorithm-desc">
          模拟混凝土抗渗实验中，AI 对 6 组试块边缘渗水的连续识别、预警升级与最终判定过程。
        </p>
        <div className="permeability-algorithm-metrics">
          <span>6 组试块</span>
          <span>4 个时间点</span>
          <span>1 组异常升级</span>
        </div>
      </div>
      <div className="permeability-algorithm-visual">
        <img
          src="/origin.png"
          alt="混凝土抗渗实验基线图"
          className="permeability-algorithm-image"
        />
        <div className="permeability-algorithm-overlay" />
        <div className="permeability-algorithm-chip">实验进行中</div>
      </div>
    </button>
  );
}
