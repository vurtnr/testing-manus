'use client';

import ConversationPanel from '@/components/ConversationPanel';
import TaskResultPanel from '@/components/TaskResultPanel';
import AgentInput from '@/components/AgentInput';
import { ChatMessage } from '@/lib/api';

interface Props {
  taskTitle: string;
  messages: ChatMessage[];
  currentResponse: string;
  streaming: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export default function HomeTask({
  taskTitle,
  messages,
  currentResponse,
  streaming,
  inputValue,
  onInputChange,
  onSend,
}: Props) {
  return (
    <div className="task-state">
      {/* Left: Conversation panel with input at bottom */}
      <div style={{ width: '45%', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <ConversationPanel
          messages={messages}
          currentResponse={currentResponse}
          streaming={streaming}
          onCitationClick={() => {}}
        />
        <AgentInput
          variant="bottom"
          value={inputValue}
          onChange={onInputChange}
          onSend={onSend}
          disabled={streaming}
        />
      </div>

      {/* Right: Result panel */}
      <TaskResultPanel
        taskTitle={taskTitle}
        streaming={streaming}
        messages={messages}
      />
    </div>
  );
}
