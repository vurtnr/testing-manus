'use client';

import { useRouter } from 'next/navigation';
import AgentInput from '@/components/AgentInput';
import CapabilityCards from '@/components/CapabilityCards';
import TodayFocus from '@/components/TodayFocus';
import CalibrationSection from '@/components/CalibrationSection';
import RecentTasks from '@/components/RecentTasks';
import ScenarioEntries from '@/components/ScenarioEntries';

interface Props {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendTask: () => void;
  onQuickTask: (text: string) => void;
}

const QUICK_TASKS = ['审核报告', '查看实时异常', '查询标准', '汇总财务', '扫描合同风险', '生成周报'];

// Knowledge-oriented quick tasks that should navigate to /knowledge
const KNOWLEDGE_QUICK_TASKS = new Set(['查询标准']);

// Knowledge-oriented scenarios that should navigate to /knowledge
const KNOWLEDGE_SCENARIOS: Record<string, string> = {
  '标准检索场景': '检索相关标准条款',
};

export default function HomeWelcome({
  inputValue,
  onInputChange,
  onSendTask,
  onQuickTask,
}: Props) {
  const router = useRouter();

  const navigateToKnowledge = () => {
    router.push('/knowledge');
  };

  const handleCapabilityClick = (id: string) => {
    if (id === 'knowledge') {
      navigateToKnowledge();
    } else {
      alert(`${id === 'inspection' ? '检测软件' : '实时监控'}功能即将上线，敬请期待`);
    }
  };

  const handleQuickTaskClick = (text: string) => {
    if (KNOWLEDGE_QUICK_TASKS.has(text)) {
      navigateToKnowledge();
    } else {
      onQuickTask(text);
    }
  };

  const handleScenarioClick = (name: string) => {
    if (name in KNOWLEDGE_SCENARIOS) {
      navigateToKnowledge();
      return;
    }
    const taskMap: Record<string, string> = {
      '报告审核场景': '审核今天新增的检测报告',
      '异常复核场景': '汇总本周异常并生成复核建议',
      '合同评审场景': '扫描合同风险',
      '财务分析场景': '汇总本月检测收入',
    };
    onQuickTask(taskMap[name] || name);
  };

  return (
    <div className="welcome-state">
      <div className="hero">
        <div className="hero-title">材料检测智能 Agent 工作台</div>
        <div className="hero-subtitle">
          围绕检测、监控、审核、分析与知识检索，帮助你更快完成关键业务任务
        </div>
        <AgentInput
          variant="hero"
          value={inputValue}
          onChange={onInputChange}
          onSend={onSendTask}
        />
        <div className="hero-hint">直接告诉我你的任务，我会自动调用相关能力完成处理</div>
        <div className="quick-tasks">
          {QUICK_TASKS.map((text) => (
            <button key={text} className="quick-task" onClick={() => handleQuickTaskClick(text)}>
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="content-area">
        <div className="section-title">🎯 系统能力</div>
        <CapabilityCards onCardClick={handleCapabilityClick} />

        <div className="section-title">📌 今日关注</div>
        <TodayFocus />

        <CalibrationSection />

        <div className="section-title">🕐 最近任务</div>
        <RecentTasks onTaskClick={(task) => onQuickTask(task.title)} />

        <div className="section-title">🚀 推荐业务场景</div>
        <ScenarioEntries onScenarioClick={handleScenarioClick} />
      </div>
    </div>
  );
}
