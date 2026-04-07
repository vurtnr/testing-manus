'use client';

import { useRef, useEffect } from 'react';
import { Citation, ChatMessage } from '@/lib/api';
import CitationMark from './CitationMark';

interface Props {
  messages: ChatMessage[];
  currentResponse: string;
  streaming: boolean;
  onCitationClick: (citation: Citation) => void;
}

export default function ConversationPanel({
  messages,
  currentResponse,
  streaming,
  onCitationClick,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentResponse, messages.length]);

  return (
    <>
      <div className="conversation-header">💬 任务对话</div>
      <div className="conversation-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`task-message ${msg.role}`}>
            <div className="task-message-bubble">
              <RenderContent
                content={msg.content}
                citations={msg.citations}
                onCitationClick={onCitationClick}
              />
            </div>
          </div>
        ))}

        {streaming && currentResponse && (
          <div className="task-message assistant">
            <div className="task-message-bubble">
              <RenderContent
                content={currentResponse}
                citations={[]}
                onCitationClick={onCitationClick}
              />
            </div>
          </div>
        )}

        {streaming && !currentResponse && (
          <div className="task-message assistant">
            <div className="task-message-bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </>
  );
}

function RenderContent({
  content,
  citations,
  onCitationClick,
}: {
  content: string;
  citations?: Citation[];
  onCitationClick: (c: Citation) => void;
}) {
  const parts = content.split(/(\[\d+\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1]);
          const citation = citations?.find((c) => c.index === idx);
          return (
            <CitationMark
              key={i}
              index={idx}
              onClick={() => citation && onCitationClick(citation)}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
