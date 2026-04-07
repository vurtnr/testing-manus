'use client';

import { useState, useRef, useCallback } from 'react';
import { streamChat, Citation, ChatMessage } from '@/lib/api';
import CitationMark from './CitationMark';

interface Props {
  onCitations: (citations: Citation[]) => void;
  onCitationClick: (citation: Citation) => void;
}

export default function ChatPanel({ onCitations, onCitationClick }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(async () => {
    const message = input.trim();
    if (!message || streaming) return;

    setStreaming(true);
    setInput('');
    setCurrentResponse('');
    setSuggestions([]);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      let fullResponse = '';
      let latestCitations: Citation[] = [];

      for await (const event of streamChat(message, conversationId)) {
        switch (event.type) {
          case 'content':
            fullResponse += event.data.text;
            setCurrentResponse(fullResponse);
            scrollToBottom();
            break;
          case 'citations':
            latestCitations = event.data;
            onCitations(latestCitations);
            break;
          case 'suggestions':
            setSuggestions(event.data);
            break;
          case 'done':
            setConversationId(event.data.conversationId);
            break;
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullResponse, citations: latestCitations },
      ]);
      setCurrentResponse('');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message}` },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, conversationId, onCitations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        💬 知识库问答
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !streaming && (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <p>上传文档后，在此提问</p>
            <p style={{ fontSize: 12, marginTop: 8 }}>支持 PDF、Word、Excel、图片</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-bubble">
              <RenderContent
                content={msg.content}
                citations={msg.citations}
                onCitationClick={onCitationClick}
              />
            </div>
          </div>
        ))}

        {streaming && currentResponse && (
          <div className="message assistant">
            <div className="message-bubble">
              <RenderContent
                content={currentResponse}
                citations={[]}
                onCitationClick={onCitationClick}
              />
            </div>
          </div>
        )}

        {streaming && !currentResponse && (
          <div className="message assistant">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions" style={{ padding: '0 24px 8px' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            placeholder="输入问题，按 Enter 发送..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={streaming || !input.trim()}
          >
            发送
          </button>
        </div>
      </div>
    </div>
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
  // Parse citation marks [1], [2], etc.
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
