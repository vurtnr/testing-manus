'use client';

interface Props {
  variant: 'hero' | 'bottom';
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AgentInput({
  variant,
  value,
  onChange,
  onSend,
  placeholder = '请输入你的任务，例如：审核今天新增的检测报告',
  disabled = false,
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (variant === 'hero') {
    return (
      <div className="hero-input-wrapper">
        <input
          className="hero-input"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          className="hero-send-btn"
          onClick={onSend}
          disabled={disabled || !value.trim()}
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="task-input-area">
      <textarea
        className="task-input"
        placeholder="继续追问或补充信息..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
      />
      <button
        className="task-send"
        onClick={onSend}
        disabled={disabled || !value.trim()}
      >
        发送
      </button>
    </div>
  );
}
