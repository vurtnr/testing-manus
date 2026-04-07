'use client';

interface Props {
  taskTitle: string;
  streaming: boolean;
  messages: { role: string; content: string }[];
}

export default function TaskResultPanel({ taskTitle, streaming, messages }: Props) {
  const hasResponse = messages.some((m) => m.role === 'assistant');

  return (
    <div className="result-panel">
      <div className="result-header">任务结果：{taskTitle}</div>

      {streaming ? (
        <div className="result-status">
          <span className="status-dot processing" />
          思考中...
        </div>
      ) : (
        <div className="result-status">
          <span className="status-dot" />
          {hasResponse ? '对话进行中' : '等待输入'}
        </div>
      )}

      {hasResponse && !streaming && (
        <>
          <div className="section-label">已调用能力</div>
          <div className="capabilities-called">
            <span className="cap-called">✓ 智能助手对话</span>
          </div>

          <div className="section-label">建议操作</div>
          <div className="next-actions">
            <a
              href="/knowledge"
              className="action-btn primary"
              style={{ textDecoration: 'none' }}
            >
              在知识库中检索
              <div className="action-desc">查询国家标准、行业标准的具体条款</div>
            </a>
            <button className="action-btn" onClick={() => {}}>
              继续对话
              <div className="action-desc">深入讨论当前话题</div>
            </button>
          </div>
        </>
      )}

      {!streaming && !hasResponse && (
        <div className="processing-state">
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <p>智能助手将在此处回复</p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            输入问题后，回答将自动呈现
          </p>
        </div>
      )}
    </div>
  );
}
