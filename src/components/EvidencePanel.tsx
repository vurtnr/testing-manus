'use client';

import { Citation } from '@/lib/api';

interface Props {
  citations: Citation[];
  activeCitation: Citation | null;
  onCitationClick: (citation: Citation) => void;
}

const SOURCE_LABELS: Record<string, (loc: Record<string, any>) => string> = {
  pdf: (loc) => `第 ${loc.page} 页`,
  docx: (loc) => loc.section ?? '文档',
  xlsx: (loc) => `${loc.sheet}${loc.rowRange ? ` (${loc.rowRange[0]}-${loc.rowRange[1]}行)` : ''}`,
  image: (loc) => loc.filename ?? '图片',
};

export default function EvidencePanel({ citations, activeCitation, onCitationClick }: Props) {
  if (citations.length === 0) {
    return (
      <div className="evidence-panel">
        <div className="evidence-header">📎 引用来源</div>
        <div className="evidence-content">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>提问后，引用来源将显示在此处</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evidence-panel">
      <div className="evidence-header">
        📎 引用来源 ({citations.length})
      </div>
      <div className="evidence-content">
        {citations.map((citation) => {
          const labelFn = SOURCE_LABELS[citation.fileType];
          const sourceLabel = labelFn ? labelFn(citation.sourceLocation) : '未知来源';
          const isActive = activeCitation?.chunkId === citation.chunkId;
          const confidence = Math.round(citation.confidenceScore * 100);

          return (
            <div
              key={citation.chunkId}
              className={`evidence-card ${isActive ? 'active' : ''}`}
              onClick={() => onCitationClick(citation)}
            >
              <div className="evidence-source">
                <span>[{citation.index}]</span>
                <span>{citation.filename}</span>
                <span>·</span>
                <span>{sourceLabel}</span>
              </div>
              <div className="evidence-text">
                {citation.textExcerpt}
              </div>
              <div className="evidence-confidence">
                相关度: {confidence}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
