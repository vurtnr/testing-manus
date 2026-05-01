'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgentInput from '@/components/AgentInput';
import CalibrationSection from '@/components/CalibrationSection';
import CapabilityCards, { type CapabilityId } from '@/components/CapabilityCards';
import HomeFinanceBand from '@/components/HomeFinanceBand';
import PermeabilityAlgorithmCard from '@/components/PermeabilityAlgorithmCard';
import RecentTasks from '@/components/RecentTasks';
import ScenarioEntries from '@/components/ScenarioEntries';
import TodayFocus from '@/components/TodayFocus';
import { getInspectionTasks, type InspectionTaskItem } from '@/lib/api';
import { getInspectionTaskReminder } from './inspection-task-reminder';

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
  const [expandedCapability, setExpandedCapability] = useState<CapabilityId | null>(null);
  const [inspectionTasks, setInspectionTasks] = useState<InspectionTaskItem[]>([]);

  const reminder = useMemo(
    () => getInspectionTaskReminder(inspectionTasks),
    [inspectionTasks]
  );

  useEffect(() => {
    getInspectionTasks()
      .then(setInspectionTasks)
      .catch(() => setInspectionTasks([]));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const signal = params.get('inspectionSignal');
    if (signal !== 'created' && signal !== 'review' && signal !== 'issue') return;

    setExpandedCapability('inspection');

    params.delete('inspectionSignal');
    const query = params.toString();
    const nextUrl = query ? `/?${query}` : '/';
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const navigateToKnowledge = () => {
    router.push('/knowledge');
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

  const handleModuleClick = (moduleId: string) => {
    const moduleTaskMap: Record<string, string> = {
      'sales-contract': '扫描合同风险并整理关键条款',
      'sales-finance': '汇总本月检测收入并生成财务分析',
      'sales-bid': '梳理投标资料并生成招投标待办',
      'inspection-review': '审核今天新增的检测报告',
      'inspection-issue': '整理待签发报告并确认签发顺序',
      'management-oa': '汇总今日OA审批与通知',
      'management-performance': '生成本周人员绩效概览',
    };
    const task = moduleTaskMap[moduleId];
    if (moduleId === 'inspection-entrust') {
      router.push('/entrust');
      return;
    }
    if (moduleId === 'inspection-task') {
      router.push('/inspection-tasks');
      return;
    }
    if (moduleId === 'inspection-review') {
      router.push('/review-tasks');
      return;
    }
    if (moduleId === 'inspection-issue') {
      router.push('/issue-tasks');
      return;
    }
    if (task) {
      onQuickTask(task);
    }
  };

  return (
    <div className="welcome-state">
      <div className="hero">
        <div className="hero-title">建设工程检测智能 Agent 工作台</div>
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
        <CapabilityCards
          onKnowledgeClick={navigateToKnowledge}
          onModuleClick={handleModuleClick}
          expandedId={expandedCapability}
          onExpandedChange={setExpandedCapability}
          inspectionBadge={
            reminder.inspectionBadge.visible
              ? {
                  count: reminder.inspectionBadge.count,
                  statusLabel: '待处理',
                }
              : null
          }
          inspectionTaskBadge={
            reminder.taskBadge.visible
              ? {
                  count: reminder.taskBadge.count,
                  statusLabel: reminder.taskBadge.statusLabel,
                }
              : null
          }
          inspectionReviewBadge={
            reminder.reviewBadge.visible
              ? {
                  count: reminder.reviewBadge.count,
                  statusLabel: reminder.reviewBadge.statusLabel,
                }
              : null
          }
          inspectionIssueBadge={
            reminder.issueBadge.visible
              ? {
                  count: reminder.issueBadge.count,
                  statusLabel: reminder.issueBadge.statusLabel,
                }
              : null
          }
        />

        {expandedCapability === 'inspection' && reminder.taskBadge.visible && reminder.taskBadge.latestTask && (
          <div className="inspection-home-reminder-card">
            <div className="inspection-home-reminder-top">
              <strong>{reminder.taskBadge.latestTask.orderNo}</strong>
              <span className="inspection-home-reminder-status">{reminder.taskBadge.statusLabel}</span>
            </div>
            <div className="inspection-home-reminder-body">
              {reminder.taskBadge.statusLabel === '待领取'
                ? `待领取部门：${reminder.taskBadge.latestTask.pickupDepartment || '材料所'}`
                : '当前状态：待录入原始数据'}
            </div>
          </div>
        )}

        <PermeabilityAlgorithmCard onOpen={() => router.push('/permeability-algorithm')} />

        <HomeFinanceBand />

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
