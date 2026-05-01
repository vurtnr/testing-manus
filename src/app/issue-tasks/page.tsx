'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeInspectionIssue,
  getInspectionIssueDocumentFileUrl,
  getInspectionTaskDetail,
  getInspectionTasks,
  runInspectionIssueReview,
  type InspectionAiReviewResult,
  type InspectionTaskDetail,
  type InspectionTaskItem,
} from '@/lib/api';
import {
  buildInspectionIssueReviewNarrative,
  buildInspectionIssueReviewQuestion,
  getInspectionIssueReviewTotalDuration,
  hydrateInspectionIssueReviewNarrative,
  type InspectionIssueReviewNarrativeStep,
} from '@/lib/inspection-issue-review';
import {
  canConfirmIssueTask,
  getDefaultIssueTaskId,
  getIssueDocumentZoom,
  getIssuedQueue,
  getIssueQueue,
  isIssuedIssueTask,
  shouldShowIssuedDownload,
} from './issue-tasks-helpers';
import { InspectionTaskReadonlyPanel } from '@/components/InspectionTaskReadonlyPanel';
import './issue-tasks.css';

export default function IssueTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<InspectionTaskItem[]>([]);
  const [activeListTab, setActiveListTab] = useState<'pending' | 'issued'>('pending');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<InspectionTaskDetail | null>(null);
  const [issueReviewResult, setIssueReviewResult] = useState<InspectionAiReviewResult | null>(null);
  const [showIssueDocumentModal, setShowIssueDocumentModal] = useState(false);
  const [issueDocumentLoading, setIssueDocumentLoading] = useState(false);
  const [issueDocumentError, setIssueDocumentError] = useState<string | null>(null);
  const [issueReviewNarrative, setIssueReviewNarrative] = useState<InspectionIssueReviewNarrativeStep[]>([]);
  const [visibleIssueReviewSteps, setVisibleIssueReviewSteps] = useState(0);
  const [activeIssueReviewStepId, setActiveIssueReviewStepId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [issueReviewLoading, setIssueReviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const issueReviewAnimationTimerIds = useRef<number[]>([]);
  const issueDocViewerRef = useRef<HTMLDivElement | null>(null);
  const issueDocStylesRef = useRef<HTMLDivElement | null>(null);

  const issueTasks = useMemo(() => getIssueQueue(tasks), [tasks]);
  const issuedTasks = useMemo(() => getIssuedQueue(tasks), [tasks]);
  const visibleTasks = activeListTab === 'pending' ? issueTasks : issuedTasks;
  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === selectedTaskId) ?? null,
    [visibleTasks, selectedTaskId]
  );
  const issueQuestion = useMemo(() => {
    if (!selectedTaskDetail) return '';

    return buildInspectionIssueReviewQuestion({
      sampleName: selectedTaskDetail.sampleName,
      sampleCount: selectedTaskDetail.sampleCount,
      testItems: selectedTaskDetail.testItems,
      testStandard: selectedTaskDetail.testStandard,
      assignedEquipmentName: selectedTaskDetail.assignedEquipmentName,
    });
  }, [selectedTaskDetail]);

  const displayIssueReviewTrace = useMemo(() => {
    if (issueReviewLoading) {
      return issueReviewNarrative.slice(0, visibleIssueReviewSteps);
    }

    if (!selectedTaskDetail || !issueReviewResult) return [];

    return hydrateInspectionIssueReviewNarrative(
      {
        sampleName: selectedTaskDetail.sampleName,
        sampleCount: selectedTaskDetail.sampleCount,
        testItems: selectedTaskDetail.testItems,
        testStandard: selectedTaskDetail.testStandard,
        assignedEquipmentName: selectedTaskDetail.assignedEquipmentName,
      },
      issueReviewResult.trace
    );
  }, [issueReviewLoading, issueReviewNarrative, visibleIssueReviewSteps, selectedTaskDetail, issueReviewResult]);

  const issueReviewProgress = issueReviewNarrative.length
    ? Math.max(8, Math.round((visibleIssueReviewSteps / issueReviewNarrative.length) * 100))
    : 0;

  function clearIssueReviewAnimation() {
    issueReviewAnimationTimerIds.current.forEach((timerId) => window.clearTimeout(timerId));
    issueReviewAnimationTimerIds.current = [];
  }

  function resetIssueReviewState() {
    clearIssueReviewAnimation();
    setIssueReviewResult(null);
    setIssueReviewNarrative([]);
    setVisibleIssueReviewSteps(0);
    setActiveIssueReviewStepId(null);
  }

  async function runIssueReviewNarrative(task: InspectionTaskDetail) {
    clearIssueReviewAnimation();

    const narrative = buildInspectionIssueReviewNarrative({
      sampleName: task.sampleName,
      sampleCount: task.sampleCount,
      testItems: task.testItems,
      testStandard: task.testStandard,
      assignedEquipmentName: task.assignedEquipmentName,
    });

    setIssueReviewNarrative(narrative);
    setVisibleIssueReviewSteps(0);
    setActiveIssueReviewStepId(null);

    let elapsed = 140;
    narrative.forEach((step, index) => {
      issueReviewAnimationTimerIds.current.push(
        window.setTimeout(() => {
          setVisibleIssueReviewSteps(index + 1);
          setActiveIssueReviewStepId(step.id);
        }, elapsed)
      );
      elapsed += step.durationMs;
    });

    issueReviewAnimationTimerIds.current.push(
      window.setTimeout(() => {
        setActiveIssueReviewStepId(null);
      }, elapsed)
    );

    const totalDuration = getInspectionIssueReviewTotalDuration(narrative) + 140;

    await new Promise<void>((resolve) => {
      issueReviewAnimationTimerIds.current.push(
        window.setTimeout(() => resolve(), totalDuration)
      );
    });
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => () => {
    clearIssueReviewAnimation();
  }, []);

  useEffect(() => {
    setSelectedTaskId((current) => getDefaultIssueTaskId(visibleTasks, current));
  }, [visibleTasks]);

  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTaskDetail(null);
      resetIssueReviewState();
      setShowIssueDocumentModal(false);
      setIssueDocumentError(null);
      return;
    }

    void loadTaskDetail(selectedTaskId);
  }, [selectedTaskId]);

  async function loadTasks() {
    setLoading(true);
    setError(null);

    try {
      const items = await getInspectionTasks();
      setTasks(items);
    } catch (err: any) {
      setError(err.message || '加载待签发任务失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadTaskDetail(taskId: string) {
    setDetailLoading(true);
    setError(null);
    resetIssueReviewState();

    try {
      const detail = await getInspectionTaskDetail(taskId);
      setSelectedTaskDetail(detail);
    } catch (err: any) {
      setSelectedTaskDetail(null);
      setError(err.message || '加载任务详情失败');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleIssueReview() {
    if (!selectedTask || !selectedTaskDetail) return;

    const task = selectedTask;
    const taskDetail = selectedTaskDetail;
    setIssueReviewLoading(true);
    setError(null);
    setFeedback(null);
    setIssueReviewResult(null);

    try {
      const [result] = await Promise.all([
        runInspectionIssueReview(task.id),
        runIssueReviewNarrative(taskDetail),
      ]);
      setIssueReviewResult(result);
      setFeedback('签发 AI复核已完成。');
    } catch (err: any) {
      resetIssueReviewState();
      setError(err.message || '签发 AI复核失败');
    } finally {
      clearIssueReviewAnimation();
      setIssueReviewLoading(false);
    }
  }

  async function handleConfirmIssue() {
    if (!selectedTask || !canConfirmIssueTask(selectedTask, issueReviewResult)) return;

    setConfirmLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await completeInspectionIssue(selectedTask.id);
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setSelectedTaskDetail(null);
      resetIssueReviewState();
      setShowIssueDocumentModal(false);
      setFeedback(`任务 ${updated.orderNo} 已完成签发。`);
      router.push('/?inspectionSignal=issue');
    } catch (err: any) {
      setError(err.message || '确认签发失败');
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleOpenIssueDocumentModal() {
    if (!selectedTask) return;

    setIssueDocumentError(null);
    setShowIssueDocumentModal(true);
  }

  function handleDownloadDocument(url: string) {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank');
    setFeedback('文档已开始下载。');
  }

  useEffect(() => {
    if (!showIssueDocumentModal || !selectedTask || typeof window === 'undefined') return;

    const activeTask = selectedTask;
    const viewer = issueDocViewerRef.current;
    const styles = issueDocStylesRef.current;
    if (!viewer || !styles) return;
    const viewerEl = viewer;
    const stylesEl = styles;

    let cancelled = false;
    let resizeHandler: (() => void) | null = null;

    async function renderDocxPreview() {
      setIssueDocumentLoading(true);
      setIssueDocumentError(null);
      viewerEl.innerHTML = '';
      stylesEl.innerHTML = '';

      try {
        const documentUrl = getInspectionIssueDocumentFileUrl(activeTask.id);
        const [{ renderAsync }, response] = await Promise.all([
          import('docx-preview'),
          fetch(documentUrl),
        ]);

        if (!response.ok) {
          throw new Error('签发文档加载失败');
        }

        const blob = await response.blob();
        if (cancelled) return;

        await renderAsync(blob, viewerEl, stylesEl, {
          className: 'issue-docx',
          inWrapper: true,
          breakPages: true,
          ignoreWidth: true,
          ignoreHeight: true,
          renderHeaders: true,
          renderFooters: true,
        });

        const fitDocumentPages = () => {
          const pages = viewerEl.querySelectorAll<HTMLElement>('.docx-wrapper > section');
          pages.forEach((page) => {
            page.style.zoom = '';
            const pageWidth = page.getBoundingClientRect().width || page.scrollWidth;
            const zoom = getIssueDocumentZoom(pageWidth, viewerEl.clientWidth);
            page.style.zoom = `${zoom}`;
          });
        };

        fitDocumentPages();
        resizeHandler = () => fitDocumentPages();
        window.addEventListener('resize', resizeHandler);
      } catch (err: any) {
        if (!cancelled) {
          setIssueDocumentError(err.message || '签发文档预览失败');
        }
      } finally {
        if (!cancelled) {
          setIssueDocumentLoading(false);
        }
      }
    }

    void renderDocxPreview();

    return () => {
      cancelled = true;
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, [showIssueDocumentModal, selectedTask]);

  return (
    <div className="issue-tasks-layout">
      <header className="issue-tasks-header">
        <div className="issue-tasks-header-left">
          <button
            type="button"
            className="issue-tasks-back"
            onClick={() => router.push('/')}
          >
            ← 首页 / 检测 / 签发
          </button>
          <div>
            <div className="issue-tasks-title">签发工作台</div>
            <div className="issue-tasks-subtitle">对待签发任务做最终复核并完成放行</div>
          </div>
        </div>
        <button type="button" className="issue-tasks-filter" onClick={() => void loadTasks()}>
          刷新
        </button>
      </header>

      <div className="issue-tasks-body">
        <section className="issue-tasks-queue">
          <div className="issue-tasks-kicker">Inspection / Issue Queue</div>
          <h1>待签发任务</h1>
          <p>左侧现在同时承接待签发任务和已签发记录。前者用于放行，后者用于回看与下载。</p>

          {feedback && <div className="issue-tasks-feedback success">{feedback}</div>}
          {error && !selectedTaskDetail && <div className="issue-tasks-feedback error">{error}</div>}

          <div className="issue-tasks-tabs">
            <button
              type="button"
              className={`issue-tasks-tab${activeListTab === 'pending' ? ' active' : ''}`}
              onClick={() => setActiveListTab('pending')}
            >
              待签发
            </button>
            <button
              type="button"
              className={`issue-tasks-tab${activeListTab === 'issued' ? ' active' : ''}`}
              onClick={() => setActiveListTab('issued')}
            >
              已签发
            </button>
          </div>

          {loading ? (
            <div className="issue-tasks-empty">正在加载待签发任务...</div>
          ) : visibleTasks.length === 0 ? (
            <div className="issue-tasks-empty">
              {activeListTab === 'pending' ? '当前没有待签发任务。' : '当前没有已签发记录。'}
            </div>
          ) : (
            <div className="issue-tasks-list">
              {visibleTasks.map((task) => (
                <div
                  key={task.id}
                  className={`issue-tasks-card${selectedTaskId === task.id ? ' selected' : ''}`}
                >
                  <button
                    type="button"
                    className="issue-tasks-card-hit"
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <div className="issue-tasks-card-top">
                      <div className="issue-tasks-card-title">{task.orderNo} · {task.sampleName}</div>
                      <span className="issue-tasks-badge">{task.taskStatus === 'issued' ? '已签发' : '待签发'}</span>
                    </div>
                    <div className="issue-tasks-card-meta">
                      样品 {task.sampleCount} 组 · 检测项目 {task.testItems} · 当前设备 {task.assignedEquipmentName || '待补录'}
                    </div>
                    <div className="issue-tasks-ai-summary">
                      {task.aiReviewSummary || '等待签发复核。'}
                    </div>
                  </button>

                  {shouldShowIssuedDownload(task) && (
                    <div className="issue-tasks-card-actions">
                      <button
                        type="button"
                        className="issue-tasks-secondary"
                        onClick={() => handleDownloadDocument(task.issuedDocumentUrl!)}
                      >
                        下载文档
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="issue-tasks-detail">
          {!selectedTask ? (
            <div className="issue-tasks-empty">选择一条待签发任务后，在这里查看全量数据并完成签发。</div>
          ) : detailLoading ? (
            <div className="issue-tasks-empty">正在加载任务详情...</div>
          ) : !selectedTaskDetail ? (
            <div className="issue-tasks-empty">任务详情加载失败，请重新选择或刷新。</div>
          ) : (
            <>
              {error && <div className="issue-tasks-feedback error">{error}</div>}

              <div className="issue-tasks-card-title">{selectedTaskDetail.orderNo} · {selectedTaskDetail.sampleName}</div>
              <div className="issue-tasks-card-meta">
                右侧集中展示任务单详情、原始数据和签发 AI复核，不再让签发动作靠备注框推进。
              </div>

              <InspectionTaskReadonlyPanel detail={selectedTaskDetail} />

              {isIssuedIssueTask(selectedTask) ? (
                <div className="issue-tasks-section">
                  <div className="issue-tasks-section-title">已签发记录</div>
                  <div className="issue-tasks-card-meta">
                    当前任务已完成签发，这里只保留只读回看与文档下载入口，不再显示 AI复核或确认签发动作。
                  </div>
                  {shouldShowIssuedDownload(selectedTask) && (
                    <div className="issue-tasks-actions">
                      <button
                        type="button"
                        className="issue-tasks-secondary"
                        onClick={() => handleDownloadDocument(selectedTask.issuedDocumentUrl!)}
                      >
                        下载已签发文档
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="issue-tasks-section">
                  <div className="issue-tasks-section-title">签发 AI复核</div>
                  <div className="issue-tasks-actions">
                    <button
                      type="button"
                      className="issue-tasks-primary"
                      onClick={() => void handleIssueReview()}
                      disabled={issueReviewLoading}
                    >
                      {issueReviewLoading ? '复核中...' : 'AI复核'}
                    </button>
                    <button
                      type="button"
                      className="issue-tasks-primary muted"
                      onClick={() => void handleOpenIssueDocumentModal()}
                      disabled={!canConfirmIssueTask(selectedTask, issueReviewResult) || issueDocumentLoading}
                    >
                      {issueDocumentLoading ? '加载文档中...' : '确认签发'}
                    </button>
                  </div>

                  {!issueReviewLoading && !issueReviewResult && (
                    <div className="issue-tasks-empty">签发前需要完成一次更严格的 AI复核，确认数量、设备和标准引用都没有问题。</div>
                  )}

                  {(issueReviewLoading || issueReviewResult) && (
                    <>
                      <div className="issue-tasks-review-flow">
                        <div className="issue-tasks-review-top">
                          <div>
                            <div className="issue-tasks-review-eyebrow">本次问题</div>
                            <div className="issue-tasks-question">{issueQuestion}</div>
                          </div>
                          <span className={`issue-tasks-review-status${issueReviewLoading ? ' loading' : ' done'}`}>
                            {issueReviewLoading ? '思考中' : '已完成'}
                          </span>
                        </div>

                        {issueReviewLoading && (
                          <div className="issue-tasks-review-progress">
                            <div
                              className="issue-tasks-review-progress-bar"
                              style={{ width: `${issueReviewProgress}%` }}
                            />
                          </div>
                        )}

                        <div className="issue-tasks-trace">
                          {displayIssueReviewTrace.map((item) => (
                            <div
                              key={item.id}
                              className={`issue-tasks-trace-item phase-${item.phase}${activeIssueReviewStepId === item.id ? ' active' : ''}`}
                            >
                              <span className="issue-tasks-trace-label">{item.label}</span>
                              <span>{item.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {issueReviewResult && (
                        <div className="issue-tasks-summary">{issueReviewResult.summary}</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {showIssueDocumentModal && (
        <div className="issue-doc-modal-overlay" onClick={() => setShowIssueDocumentModal(false)}>
          <div className="issue-doc-modal" onClick={(event) => event.stopPropagation()}>
            <div className="issue-doc-modal-head">
              <div>
                <div className="issue-tasks-kicker">Issue Document</div>
                <h3>签发文档预览</h3>
                <p>请先在线阅读本次签发文档，再决定是否导出或确认签发。</p>
              </div>
              <button
                type="button"
                className="issue-doc-modal-close"
                onClick={() => setShowIssueDocumentModal(false)}
              >
                ×
              </button>
            </div>

            <div className="issue-doc-modal-body">
              {issueDocumentLoading && <div className="issue-doc-modal-loading">正在加载 Word 文档预览...</div>}
              {issueDocumentError && <div className="issue-tasks-feedback error">{issueDocumentError}</div>}
              <div className="issue-doc-modal-style-host" ref={issueDocStylesRef} />
              <div className="issue-doc-modal-content" ref={issueDocViewerRef} />
            </div>

            <div className="issue-doc-modal-actions">
              <button
                type="button"
                className="issue-tasks-secondary"
                onClick={() => handleDownloadDocument(getInspectionIssueDocumentFileUrl(selectedTaskId))}
              >
                导出
              </button>
              <button
                type="button"
                className="issue-tasks-primary"
                onClick={() => void handleConfirmIssue()}
                disabled={confirmLoading}
              >
                {confirmLoading ? '签发中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
