'use client';

import { useState, useCallback, useEffect } from 'react';
import HomeWelcome from '@/app/home/HomeWelcome';
import HomeTask from '@/app/home/HomeTask';
import { streamAgentChat, ChatMessage, getCurrentUser, logout, UserInfo } from '@/lib/api';
import { addRecentTask } from '@/components/RecentTasks';
import './home/home.css';

type PageMode = 'welcome' | 'task';

export default function Home() {
  const [mode, setMode] = useState<PageMode>('welcome');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  // Input state (shared between welcome hero and task bottom)
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  const startStreaming = useCallback(async (message: string) => {
    setStreaming(true);
    setCurrentResponse('');

    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    addRecentTask(message);

    try {
      let fullResponse = '';

      for await (const event of streamAgentChat(message, messages)) {
        switch (event.type) {
          case 'content':
            fullResponse += event.data.text;
            setCurrentResponse(fullResponse);
            break;
          case 'done':
            break;
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullResponse },
      ]);
      setCurrentResponse('');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message}` },
      ]);
      setCurrentResponse('');
    } finally {
      setStreaming(false);
    }
  }, [conversationId]);

  // Welcome → Task transition
  const handleSendTask = useCallback(() => {
    const message = inputValue.trim();
    if (!message) return;

    setTaskTitle(message);
    setInputValue('');
    setMode('task');
    startStreaming(message);
  }, [inputValue, startStreaming]);

  // Quick task / scenario click
  const handleQuickTask = useCallback((text: string) => {
    setTaskTitle(text);
    setInputValue('');
    setMode('task');
    startStreaming(text);
  }, [startStreaming]);

  // Follow-up message in task state
  const handleTaskSend = useCallback(() => {
    const message = inputValue.trim();
    if (!message || streaming) return;

    setInputValue('');
    startStreaming(message);
  }, [inputValue, streaming, startStreaming]);

  // Task → Welcome transition
  const handleReturnToWelcome = useCallback(() => {
    setMode('welcome');
    setMessages([]);
    setCurrentResponse('');
    setConversationId(undefined);
    setTaskTitle('');
    setInputValue('');
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="workbench">
      {/* Header */}
      <div className="workbench-header">
        <div className="workbench-header-left">
          {mode === 'task' && (
            <button className="workbench-header-back" onClick={handleReturnToWelcome}>
              ← 返回总览
            </button>
          )}
          <span className="workbench-header-brand">MaterialSense</span>
          <div className="workbench-header-divider" />
          {mode === 'task' ? (
            <span className="workbench-header-task-name">{taskTitle}</span>
          ) : (
            <span className="workbench-header-org">华东建材检测中心</span>
          )}
        </div>
        <div className="workbench-header-right">
          {user && (
            <div className="user-menu-wrapper">
              <button
                className="user-avatar"
                onClick={() => setShowUserMenu(!showUserMenu)}
                onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
              >
                {(user.displayName || user.email).charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div className="user-dropdown">
                  <div className="user-dropdown-name">{user.displayName || user.email}</div>
                  <div className="user-dropdown-email">{user.email}</div>
                  <button className="user-dropdown-logout" onClick={handleLogout}>
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      {mode === 'welcome' ? (
        <HomeWelcome
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendTask={handleSendTask}
          onQuickTask={handleQuickTask}
        />
      ) : (
        <HomeTask
          taskTitle={taskTitle}
          messages={messages}
          currentResponse={currentResponse}
          streaming={streaming}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleTaskSend}
        />
      )}
    </div>
  );
}
