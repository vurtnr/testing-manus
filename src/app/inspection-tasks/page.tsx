'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeInspectionExperiment,
  getInspectionTaskDetail,
  getInspectionRawDataPreview,
  getInspectionTasks,
  getLabEquipment,
  type InspectionAiReviewResult,
  type InspectionRawDataPreview,
  type InspectionTaskItem,
  type LabEquipmentItem,
  rejectInspectionTaskReview,
  runInspectionAiReview,
  startInspectionExperiment,
  submitInspectionTaskForReview,
  updateInspectionRawDataPreview,
} from '@/lib/api';
import {
  buildInspectionAiReviewNarrative,
  buildInspectionAiReviewQuestion,
  getInspectionAiReviewTotalDuration,
  hydrateInspectionAiReviewNarrative,
  type InspectionAiReviewNarrativeStep,
} from '@/lib/inspection-ai-review';
import {
  getDefaultWorkbenchTab,
  groupInspectionTasksForWorkbench,
  type InspectionTaskWorkbenchGroups,
  type WorkbenchTab,
} from './workbench-groups';
import {
  canSubmitInspectionRawData,
  hasPendingInspectionRawDataIssue,
  updateInspectionRawDataCell,
} from '@/lib/inspection-raw-data';
import './inspection-workbench.css';

const TAB_LABELS: Record<WorkbenchTab, string> = {
  pending_claim: '待领取',
  in_experiment: '实验中',
  awaiting_raw_data: '待录入原始数据',
  awaiting_review: '待审核',
  awaiting_issue: '待签发',
};

const TAB_ORDER: WorkbenchTab[] = [
  'pending_claim',
  'in_experiment',
  'awaiting_raw_data',
  'awaiting_review',
  'awaiting_issue',
];

function getTasksForTab(groups: InspectionTaskWorkbenchGroups, tab: WorkbenchTab) {
  if (tab === 'pending_claim') return groups.pendingClaim;
  if (tab === 'in_experiment') return groups.inExperiment;
  if (tab === 'awaiting_raw_data') return groups.awaitingRawData;
  if (tab === 'awaiting_review') return groups.awaitingReview;
  return groups.awaitingIssue;
}

function getTaskNextActionLabel(taskStatus: InspectionTaskItem['taskStatus']) {
  if (taskStatus === 'pending_claim') return '选择设备并开始实验';
  if (taskStatus === 'in_experiment') return '标记实验完成';
  if (taskStatus === 'awaiting_raw_data') return '录入原始数据';
  if (taskStatus === 'awaiting_review') return '进入审核工作台';
  return '等待签发';
}

function getTaskChipLabel(taskStatus: InspectionTaskItem['taskStatus']) {
  if (taskStatus === 'pending_claim') return '领取任务';
  if (taskStatus === 'in_experiment') return '实验推进';
  if (taskStatus === 'awaiting_raw_data') return '录入原始数据';
  if (taskStatus === 'awaiting_review') return '审核处理中';
  return '等待签发';
}

export default function InspectionTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<InspectionTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('awaiting_raw_data');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<InspectionRawDataPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<InspectionAiReviewResult | null>(null);
  const [aiReviewNarrative, setAiReviewNarrative] = useState<InspectionAiReviewNarrativeStep[]>([]);
  const [visibleAiReviewSteps, setVisibleAiReviewSteps] = useState(0);
  const [activeAiReviewStepId, setActiveAiReviewStepId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [idleEquipment, setIdleEquipment] = useState<LabEquipmentItem[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const aiReviewAnimationTimerIds = useRef<number[]>([]);
  const selectedTaskIdRef = useRef('');

  const grouped = useMemo(() => groupInspectionTasksForWorkbench(tasks), [tasks]);

  const visibleTasks = useMemo(
    () => getTasksForTab(grouped, activeTab),
    [activeTab, grouped]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const aiReviewQuestion = useMemo(() => {
    if (!selectedTask) return '';

    return buildInspectionAiReviewQuestion({
      sampleName: selectedTask.sampleName,
      testItems: selectedTask.testItems,
      testStandard: selectedTask.testStandard,
    });
  }, [selectedTask]);

  const displayAiReviewTrace = useMemo(() => {
    if (aiReviewLoading) {
      return aiReviewNarrative.slice(0, visibleAiReviewSteps);
    }

    if (!selectedTask || !aiReviewResult) return [];

    return hydrateInspectionAiReviewNarrative(
      {
        sampleName: selectedTask.sampleName,
        testItems: selectedTask.testItems,
        testStandard: selectedTask.testStandard,
      },
      aiReviewResult.trace
    );
  }, [aiReviewLoading, aiReviewNarrative, visibleAiReviewSteps, selectedTask, aiReviewResult]);

  const aiReviewProgress = aiReviewNarrative.length
    ? Math.max(8, Math.round((visibleAiReviewSteps / aiReviewNarrative.length) * 100))
    : 0;
  const reviewCompleted = Boolean(aiReviewResult?.passed || selectedTask?.aiReviewPassed);
  const flaggedIssueCell = preview?.preview.issueCell ?? null;
  const hasPendingIssue = hasPendingInspectionRawDataIssue(preview?.preview);
  const canSubmitCurrentPreview = canSubmitInspectionRawData(preview?.preview, reviewCompleted);

  function clearAiReviewAnimation() {
    aiReviewAnimationTimerIds.current.forEach((timerId) => window.clearTimeout(timerId));
    aiReviewAnimationTimerIds.current = [];
  }

  function resetDetailState() {
    clearAiReviewAnimation();
    setSelectedImage(null);
    setPreview(null);
    setDetailLoading(false);
    setPreviewDirty(false);
    setPreviewSaving(false);
    setAiReviewResult(null);
    setAiReviewNarrative([]);
    setVisibleAiReviewSteps(0);
    setActiveAiReviewStepId(null);
  }

  async function runAiReviewNarrative(task: InspectionTaskItem) {
    clearAiReviewAnimation();

    const narrative = buildInspectionAiReviewNarrative({
      sampleName: task.sampleName,
      testItems: task.testItems,
      testStandard: task.testStandard,
    });

    setAiReviewNarrative(narrative);
    setVisibleAiReviewSteps(0);
    setActiveAiReviewStepId(null);

    let elapsed = 140;
    narrative.forEach((step, index) => {
      aiReviewAnimationTimerIds.current.push(
        window.setTimeout(() => {
          setVisibleAiReviewSteps(index + 1);
          setActiveAiReviewStepId(step.id);
        }, elapsed)
      );
      elapsed += step.durationMs;
    });

    aiReviewAnimationTimerIds.current.push(
      window.setTimeout(() => {
        setActiveAiReviewStepId(null);
      }, elapsed)
    );

    const totalDuration = getInspectionAiReviewTotalDuration(narrative) + 140;

    await new Promise<void>((resolve) => {
      aiReviewAnimationTimerIds.current.push(
        window.setTimeout(() => resolve(), totalDuration)
      );
    });
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
  }, [selectedTaskId]);

  useEffect(() => () => {
    clearAiReviewAnimation();
  }, []);

  useEffect(() => {
    const defaultTab = getDefaultWorkbenchTab(grouped);
    const currentTasks = getTasksForTab(grouped, activeTab);
    const hasAnyTasks = TAB_ORDER.some((tab) => getTasksForTab(grouped, tab).length > 0);

    if (hasAnyTasks && currentTasks.length === 0) {
      setActiveTab(defaultTab);
    }
  }, [activeTab, grouped]);

  useEffect(() => {
    const currentVisibleIds = new Set(visibleTasks.map((task) => task.id));
    if (selectedTaskId && !currentVisibleIds.has(selectedTaskId)) {
      setSelectedTaskId('');
      resetDetailState();
    }
  }, [selectedTaskId, visibleTasks]);

  useEffect(() => {
    if (grouped.pendingClaim.length === 0) {
      setIdleEquipment([]);
      setSelectedEquipmentId('');
      return;
    }

    void loadIdleEquipment();
  }, [grouped.pendingClaim.length]);

  useEffect(() => {
    if (selectedTask?.taskStatus !== 'pending_claim') {
      setSelectedEquipmentId('');
      return;
    }

    if (idleEquipment.length === 0) {
      setSelectedEquipmentId('');
      return;
    }

    if (!idleEquipment.some((equipment) => equipment.id === selectedEquipmentId)) {
      setSelectedEquipmentId(idleEquipment[0].id);
    }
  }, [idleEquipment, selectedEquipmentId, selectedTask?.id, selectedTask?.taskStatus]);

  async function loadTasks() {
    setLoading(true);
    setError(null);

    try {
      const items = await getInspectionTasks();
      setTasks(items);
    } catch (err: any) {
      setError(err.message || '加载实验任务失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadIdleEquipment() {
    setEquipmentLoading(true);

    try {
      const items = await getLabEquipment('idle');
      setIdleEquipment(items);
    } catch (err: any) {
      setError(err.message || '加载空闲设备失败');
    } finally {
      setEquipmentLoading(false);
    }
  }

  async function loadSelectedTaskDetail(taskId: string) {
    setDetailLoading(true);

    try {
      const detail = await getInspectionTaskDetail(taskId);
      if (selectedTaskIdRef.current !== taskId) return;

      setPreview(
        detail.rawDataPreview
          ? {
              preview: detail.rawDataPreview,
              imageName: detail.rawDataImageName || undefined,
            }
          : null
      );
      setAiReviewResult(
        detail.aiReviewPassed
          ? {
              trace: detail.aiReviewTrace ?? [],
              summary: detail.aiReviewSummary,
              passed: detail.aiReviewPassed,
              issueCell: detail.rawDataPreview?.issueCell ?? null,
            }
          : null
      );
      setPreviewDirty(false);
    } catch (err: any) {
      if (selectedTaskIdRef.current !== taskId) return;
      setError(err.message || '加载任务详情失败');
    } finally {
      if (selectedTaskIdRef.current === taskId) {
        setDetailLoading(false);
      }
    }
  }

  function handleSelectTask(task: InspectionTaskItem) {
    setSelectedTaskId(task.id);
    resetDetailState();
    setFeedback(null);
    setError(null);

    if (task.taskStatus === 'awaiting_raw_data') {
      void loadSelectedTaskDetail(task.id);
    }
  }

  async function persistPreview(nextPreview = preview?.preview) {
    if (!selectedTask || selectedTask.taskStatus !== 'awaiting_raw_data' || !nextPreview) {
      return false;
    }

    setPreviewSaving(true);

    try {
      const updated = await updateInspectionRawDataPreview(selectedTask.id, nextPreview);
      if (selectedTaskIdRef.current !== selectedTask.id) return false;
      setPreview(updated);
      setPreviewDirty(false);
      return true;
    } catch (err: any) {
      if (selectedTaskIdRef.current === selectedTask.id) {
        setError(err.message || '保存原始数据修改失败');
      }
      return false;
    } finally {
      if (selectedTaskIdRef.current === selectedTask.id) {
        setPreviewSaving(false);
      }
    }
  }

  function handlePreviewCellChange(rowIndex: number, cellIndex: number, value: string) {
    setPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        preview: updateInspectionRawDataCell(current.preview, rowIndex, cellIndex, value),
      };
    });
    setPreviewDirty(true);
    setFeedback(null);
    setError(null);
  }

  async function handleStartExperiment() {
    if (!selectedTask || selectedTask.taskStatus !== 'pending_claim' || !selectedEquipmentId) return;

    setClaimLoading(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await startInspectionExperiment(selectedTask.id, selectedEquipmentId);
      setTasks((prev) => prev.map((task) => (task.id === result.task.id ? result.task : task)));
      setActiveTab('in_experiment');
      setSelectedTaskId(result.task.id);
      setFeedback(`任务 ${result.task.orderNo} 已领取，当前设备 ${result.equipment.equipmentName}。`);
      await loadIdleEquipment();
    } catch (err: any) {
      setError(err.message || '领取任务失败');
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleCompleteExperiment() {
    if (!selectedTask || selectedTask.taskStatus !== 'in_experiment') return;

    setCompleteLoading(true);
    setFeedback(null);
    setError(null);

    try {
      const updated = await completeInspectionExperiment(selectedTask.id);
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setActiveTab('awaiting_raw_data');
      setSelectedTaskId(updated.id);
      setFeedback(`任务 ${updated.orderNo} 已完成实验，等待录入原始数据。`);
      await loadIdleEquipment();
    } catch (err: any) {
      setError(err.message || '标记实验完成失败');
    } finally {
      setCompleteLoading(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file || !selectedTask || selectedTask.taskStatus !== 'awaiting_raw_data') return;

    setSelectedImage(file);
    setPreview(null);
    setPreviewDirty(false);
    setAiReviewResult(null);
    setFeedback(null);
    setError(null);
    setPreviewLoading(true);

    try {
      const result = await getInspectionRawDataPreview(selectedTask.id, file);
      setPreview(result);
      setPreviewDirty(false);
      setFeedback('原始记录图片识别完成，已还原表格。');
    } catch (err: any) {
      setError(err.message || '生成原始数据预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleAiReview() {
    if (!selectedTask || selectedTask.taskStatus !== 'awaiting_raw_data' || !preview) return;

    const task = selectedTask;
    setAiReviewLoading(true);
    setFeedback(null);
    setError(null);
    setAiReviewResult(null);

    try {
      if (previewDirty) {
        const saved = await persistPreview(preview.preview);
        if (!saved) return;
      }

      const [result] = await Promise.all([
        runInspectionAiReview(task.id),
        runAiReviewNarrative(task),
      ]);
      setAiReviewResult(result);
      setPreview((current) =>
        current
          ? {
              ...current,
              preview: {
                ...current.preview,
                issueCell: result.issueCell ?? null,
              },
            }
          : current
      );
      setFeedback('AI复核已完成。');
      await loadTasks();
    } catch (err: any) {
      clearAiReviewAnimation();
      setAiReviewNarrative([]);
      setVisibleAiReviewSteps(0);
      setActiveAiReviewStepId(null);
      setError(err.message || 'AI复核失败');
    } finally {
      clearAiReviewAnimation();
      setAiReviewLoading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!selectedTask || selectedTask.taskStatus !== 'awaiting_raw_data' || !preview) return;

    setSubmitLoading(true);
    setFeedback(null);
    setError(null);

    try {
      if (previewDirty) {
        const saved = await persistPreview(preview.preview);
        if (!saved) return;
      }

      const updated = await submitInspectionTaskForReview(selectedTask.id);
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      router.push('/?inspectionSignal=review');
    } catch (err: any) {
      setError(err.message || '提交审核失败');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleReviewRejectPreview() {
    if (!selectedTask || selectedTask.taskStatus !== 'awaiting_raw_data') return;

    try {
      await rejectInspectionTaskReview(selectedTask.id);
    } catch (err: any) {
      setFeedback(err.message || '当前流程在建设中...');
    }
  }

  return (
    <div className="inspection-workbench-layout">
      <header className="inspection-workbench-header">
        <div className="inspection-workbench-header-left">
          <button
            type="button"
            className="inspection-workbench-back"
            onClick={() => router.push('/')}
          >
            ← 返回首页
          </button>
          <div className="inspection-workbench-header-copy">
            <div className="inspection-workbench-title">实验任务工作台</div>
            <div className="inspection-workbench-subtitle">按状态推进领取、实验、录入与后续流转</div>
          </div>
        </div>
        <button
          type="button"
          className="inspection-workbench-filter"
          onClick={() => void loadTasks()}
        >
          刷新 / 筛选
        </button>
      </header>

      <div className="inspection-workbench-body">
        <section className="inspection-workbench-main">
          <div className="inspection-workbench-hero">
            <div className="inspection-workbench-panel">
              <div className="inspection-workbench-kicker">Inspection / Task Board</div>
              <h1>先找到当前该推进的任务</h1>
              <p>这里承接待领取、实验中和原始数据录入，也保留后续审核与签发状态，避免首页角标有任务但列表为空。</p>
              <div className="inspection-workbench-tabs">
                {TAB_ORDER.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`inspection-workbench-tab${activeTab === tab ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABELS[tab]}
                  </button>
                ))}
              </div>
            </div>

            <div className="inspection-workbench-panel inspection-workbench-summary">
              <div className="inspection-workbench-kicker">Current Focus</div>
              <p>
                待领取任务先分配设备。实验完成后再进入原始数据录入。审核动作有独立工作台，但状态会继续回写到这里。
              </p>
            </div>
          </div>

          {feedback && <div className="inspection-workbench-feedback success">{feedback}</div>}
          {error && <div className="inspection-workbench-feedback error">{error}</div>}

          {loading ? (
            <div className="inspection-workbench-empty">正在加载实验任务...</div>
          ) : visibleTasks.length === 0 ? (
            <div className="inspection-workbench-empty">当前分组暂无任务。</div>
          ) : (
            <div className="inspection-workbench-task-list">
              {visibleTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`inspection-workbench-task-card${selectedTaskId === task.id ? ' selected' : ''}`}
                  onClick={() => handleSelectTask(task)}
                >
                  <div className="inspection-workbench-task-top">
                    <div className="inspection-workbench-task-title">{task.orderNo} · {task.sampleName}</div>
                    <span className={`inspection-workbench-badge status-${task.taskStatus}`}>
                      {TAB_LABELS[task.taskStatus as WorkbenchTab] ?? task.dueLabel}
                    </span>
                  </div>
                  <div className="inspection-workbench-task-meta">
                    样品 {task.sampleCount} 组 · 检测项目 {task.testItems} · 当前设备 {task.assignedEquipmentName || '待分配'}
                  </div>
                  <div className="inspection-workbench-task-next">
                    下一步动作：{getTaskNextActionLabel(task.taskStatus)}
                  </div>
                  <div className="inspection-workbench-actions">
                    <span className="inspection-workbench-primary-chip">{getTaskChipLabel(task.taskStatus)}</span>
                  </div>
                  {task.aiReviewSummary && (
                    <div className="inspection-workbench-task-summary">{task.aiReviewSummary}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="inspection-workbench-drawer">
          {!selectedTask ? (
            <div className="inspection-workbench-placeholder">
              <div className="inspection-workbench-kicker">Current Drawer</div>
              <h2>选择一条任务继续处理</h2>
              <p>右侧抽屉会根据任务状态展示领取、实验完成、原始数据录入或状态查看，不再混用错误操作区。</p>
            </div>
          ) : selectedTask.taskStatus === 'pending_claim' ? (
            <>
              <div className="inspection-workbench-kicker">任务领取</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务还未被实验人员领取。先分配空闲设备，再正式开始实验。
              </p>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">任务信息</div>
                <div className="inspection-workbench-task-summary">
                  待领取部门：{selectedTask.pickupDepartment || '材料所'}。样品 {selectedTask.sampleCount} 组，检测项目 {selectedTask.testItems}。
                </div>
              </div>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">选择空闲设备</div>
                {equipmentLoading ? (
                  <div className="inspection-workbench-muted">正在加载空闲设备...</div>
                ) : idleEquipment.length === 0 ? (
                  <div className="inspection-workbench-muted">当前没有空闲设备，请稍后再试。</div>
                ) : (
                  <>
                    <label className="inspection-workbench-field">
                      <span>空闲设备</span>
                      <select
                        className="inspection-workbench-select"
                        value={selectedEquipmentId}
                        onChange={(event) => setSelectedEquipmentId(event.target.value)}
                      >
                        {idleEquipment.map((equipment) => (
                          <option key={equipment.id} value={equipment.id}>
                            {equipment.equipmentName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inspection-workbench-actions">
                      <button
                        type="button"
                        className="inspection-workbench-primary"
                        onClick={() => void handleStartExperiment()}
                        disabled={!selectedEquipmentId || claimLoading}
                      >
                        {claimLoading ? '领取中...' : '领取并开始实验'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : selectedTask.taskStatus === 'in_experiment' ? (
            <>
              <div className="inspection-workbench-kicker">实验推进</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务正在实验中。实验完成后，在这里把任务推进到原始数据录入阶段。
              </p>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">当前实验状态</div>
                <div className="inspection-workbench-task-summary">
                  当前设备：{selectedTask.assignedEquipmentName || '待补录'}。实验人员：{selectedTask.experimenterName || '实验人员A'}。
                </div>
                <div className="inspection-workbench-actions">
                  <button
                    type="button"
                    className="inspection-workbench-primary"
                    onClick={() => void handleCompleteExperiment()}
                    disabled={completeLoading}
                  >
                    {completeLoading ? '处理中...' : '标记实验完成'}
                  </button>
                </div>
                <div className="inspection-workbench-muted">
                  完成后任务会自动进入“待录入原始数据”，设备也会同步释放。
                </div>
              </div>
            </>
          ) : selectedTask.taskStatus === 'awaiting_raw_data' ? (
            <>
              <div className="inspection-workbench-kicker">原始数据录入抽屉</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务：{selectedTask.sampleName}。上传原始记录图片后，系统先还原表格，再由用户主动点击 AI复核。
              </p>

              <label className="inspection-workbench-dropzone">
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <span>上传原始记录图片</span>
                <small>支持 JPG / PNG，上传后自动识别并还原纸面原始记录表格样式。</small>
                {(selectedImage?.name || preview?.imageName) && (
                  <em>{selectedImage?.name ?? preview?.imageName}</em>
                )}
              </label>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">原始记录还原</div>
                {!preview && !previewLoading && !detailLoading && (
                  <div className="inspection-workbench-muted">上传图片后，这里会还原样本图风格的表格。</div>
                )}
                {detailLoading && <div className="inspection-workbench-muted">正在加载已保存的原始数据...</div>}
                {previewLoading && <div className="inspection-workbench-muted">正在识别并还原表格...</div>}
                {preview && (
                  <div className="inspection-workbench-table-wrap">
                    <table className="inspection-workbench-table">
                      <thead>
                        <tr>
                          {preview.preview.headers.map((header) => (
                            <th key={header}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.rows.map((row, index) => (
                          <tr key={`${row[0]}-${index}`}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${index}-${cellIndex}`}
                                className={
                                  flaggedIssueCell?.rowIndex === index &&
                                  flaggedIssueCell?.cellIndex === cellIndex
                                    ? flaggedIssueCell.resolved
                                      ? 'inspection-workbench-cell resolved'
                                      : 'inspection-workbench-cell flagged'
                                    : 'inspection-workbench-cell'
                                }
                              >
                                {cellIndex === 0 ? (
                                  cell
                                ) : (
                                  <input
                                    className="inspection-workbench-table-input"
                                    value={cell}
                                    onChange={(event) =>
                                      handlePreviewCellChange(index, cellIndex, event.target.value)
                                    }
                                    onBlur={() => {
                                      void persistPreview();
                                    }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {previewSaving && (
                  <div className="inspection-workbench-muted">正在保存表格修改...</div>
                )}
                {flaggedIssueCell && (
                  <div
                    className={`inspection-workbench-cell-hint${
                      flaggedIssueCell.resolved ? ' resolved' : ' flagged'
                    }`}
                  >
                    {flaggedIssueCell.resolved
                      ? `第 ${flaggedIssueCell.rowIndex + 1} 组红框值已修改，可以继续提交。`
                      : `第 ${flaggedIssueCell.rowIndex + 1} 组红框值待人工核查，请先修改后再提交。`}
                  </div>
                )}
              </div>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">AI复核</div>
                <div className="inspection-workbench-actions">
                  <button
                    type="button"
                    className="inspection-workbench-primary"
                    onClick={() => void handleAiReview()}
                    disabled={!preview || aiReviewLoading || previewSaving}
                  >
                    {aiReviewLoading ? '复核中...' : 'AI复核'}
                  </button>
                  <button
                    type="button"
                    className="inspection-workbench-primary muted"
                    onClick={() => void handleSubmitForReview()}
                    disabled={!canSubmitCurrentPreview || submitLoading || previewSaving}
                  >
                    {submitLoading ? '提交中...' : '提交'}
                  </button>
                </div>

                {!aiReviewLoading && !aiReviewResult && (
                  <div className="inspection-workbench-muted">完成表格还原后，由用户显式触发 AI复核，提交按钮才会解锁。</div>
                )}

                {!aiReviewLoading && aiReviewResult && hasPendingIssue && (
                  <div className="inspection-workbench-muted">AI 已用红框标出一个待核查数值。人工修改后，提交按钮才会解锁。</div>
                )}

                {!aiReviewLoading && aiReviewResult && !hasPendingIssue && canSubmitCurrentPreview && (
                  <div className="inspection-workbench-muted">红框值已修改完成，当前可以提交审核。</div>
                )}

                {(aiReviewLoading || aiReviewResult) && (
                  <>
                    <div className="inspection-workbench-review-flow">
                      <div className="inspection-workbench-review-top">
                        <div>
                          <div className="inspection-workbench-review-eyebrow">本次问题</div>
                          <div className="inspection-workbench-review-question">{aiReviewQuestion}</div>
                        </div>
                        <span className={`inspection-workbench-review-status${aiReviewLoading ? ' loading' : ' done'}`}>
                          {aiReviewLoading ? '思考中' : '已完成'}
                        </span>
                      </div>

                      {aiReviewLoading && (
                        <div className="inspection-workbench-review-progress">
                          <div
                            className="inspection-workbench-review-progress-bar"
                            style={{ width: `${aiReviewProgress}%` }}
                          />
                        </div>
                      )}

                      <div className="inspection-workbench-trace">
                        {displayAiReviewTrace.map((item) => (
                          <div
                            key={item.id}
                            className={`inspection-workbench-trace-item phase-${item.phase}${activeAiReviewStepId === item.id ? ' active' : ''}`}
                          >
                            <span className="inspection-workbench-trace-label">{item.label}</span>
                            <span>{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {aiReviewResult && (
                      <>
                        <div className="inspection-workbench-ai-summary">{aiReviewResult.summary}</div>
                        <div className="inspection-workbench-secondary-actions">
                          <button
                            type="button"
                            className="inspection-workbench-secondary"
                            onClick={() => void handleReviewRejectPreview()}
                          >
                            退回
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          ) : selectedTask.taskStatus === 'awaiting_review' ? (
            <>
              <div className="inspection-workbench-kicker">审核状态</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务已提交审核。人工审核动作在独立工作台处理，这里只保留状态查看和跳转入口。
              </p>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">状态摘要</div>
                <div className="inspection-workbench-task-summary">
                  {selectedTask.aiReviewSummary || 'AI复核已完成，等待审核人员确认原始数据。'}
                </div>
                <div className="inspection-workbench-actions">
                  <button
                    type="button"
                    className="inspection-workbench-primary"
                    onClick={() => router.push('/review-tasks')}
                  >
                    前往审核工作台
                  </button>
                </div>
              </div>
            </>
          ) : selectedTask.taskStatus === 'awaiting_issue' ? (
            <>
              <div className="inspection-workbench-kicker">签发状态</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务已经通过审核，正在等待签发。签发动作用独立工作台承接，这里只保留状态查看和跳转入口。
              </p>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">状态摘要</div>
                <div className="inspection-workbench-task-summary">
                  {selectedTask.aiReviewSummary || '审核通过，等待签发。'}
                </div>
                <div className="inspection-workbench-actions">
                  <button
                    type="button"
                    className="inspection-workbench-primary"
                    onClick={() => router.push('/issue-tasks')}
                  >
                    前往签发工作台
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inspection-workbench-kicker">签发状态</div>
              <h2>{selectedTask.orderNo}</h2>
              <p className="inspection-workbench-drawer-copy">
                当前任务已经通过审核，正在等待签发。这里展示只读状态，签发动作仍在后续流程中完成。
              </p>

              <div className="inspection-workbench-card">
                <div className="inspection-workbench-card-title">状态摘要</div>
                <div className="inspection-workbench-task-summary">
                  {selectedTask.aiReviewSummary || '审核通过，等待签发。'}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
