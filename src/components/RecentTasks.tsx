'use client';

import { useEffect, useState } from 'react';

interface RecentTask {
  id: string;
  title: string;
  status: 'done' | 'processing' | 'pending';
  time: string;
}

const STORAGE_KEY = 'recentTasks';

const DEFAULT_TASKS: RecentTask[] = [
  { id: '1', title: '审核 4/7 新增检测报告', status: 'done', time: '今天 14:30' },
  { id: '2', title: '汇总本周抗压异常并生成复核建议', status: 'processing', time: '今天 11:20' },
  { id: '3', title: '检索 GB/T 21149 烧结瓦标准相关条款', status: 'done', time: '昨天 16:45' },
  { id: '4', title: '扫描 4 月第 1 周合同风险', status: 'pending', time: '昨天 10:00' },
];

interface Props {
  onTaskClick: (task: RecentTask) => void;
}

export default function RecentTasks({ onTaskClick }: Props) {
  const [tasks, setTasks] = useState<RecentTask[]>(DEFAULT_TASKS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch {
      // use defaults
    }
  }, []);

  return (
    <div className="recent-list">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="recent-item"
          onClick={() => onTaskClick(task)}
        >
          <span className={`recent-status ${task.status}`}>
            {task.status === 'done' ? '已完成' : task.status === 'processing' ? '处理中' : '待确认'}
          </span>
          <span className="recent-title">{task.title}</span>
          <span className="recent-time">{task.time}</span>
        </div>
      ))}
    </div>
  );
}

export function addRecentTask(title: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const tasks: RecentTask[] = stored ? JSON.parse(stored) : DEFAULT_TASKS;
    const newTask: RecentTask = {
      id: Date.now().toString(),
      title,
      status: 'processing' as const,
      time: '刚刚',
    };
    tasks.unshift(newTask);
    // Keep only 10 most recent
    if (tasks.length > 10) tasks.length = 10;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Silently fail
  }
}
