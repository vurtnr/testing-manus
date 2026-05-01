'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveInspectionTaskReview,
  getInspectionTaskDetail,
  getInspectionTasks,
  rejectInspectionTaskReview,
  type InspectionTaskDetail,
  type InspectionTaskItem,
} from '@/lib/api';
import { InspectionTaskReadonlyPanel } from '@/components/InspectionTaskReadonlyPanel';
import {
  canApproveReviewTask,
  getReviewApprovalRedirect,
} from './review-actions';
import './review-tasks.css';

export default function ReviewTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<InspectionTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<InspectionTaskDetail | null>(null);
  const [comment, setComment] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    void loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setError(null);

    try {
      const items = await getInspectionTasks();
      const reviewTasks = items.filter((task) => task.taskStatus === 'awaiting_review');
      setTasks(reviewTasks);
      setSelectedTaskId((current) =>
        reviewTasks.some((task) => task.id === current) ? current : reviewTasks[0]?.id || ''
      );
    } catch (err: any) {
      setError(err.message || '加载审核任务失败');
    } finally {
      setLoading(false);
    }
  }

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  useEffect(() => {
    if (!selectedTaskId) {
      setSelectedTaskDetail(null);
      setComment('');
      return;
    }

    setComment('');
    void loadTaskDetail(selectedTaskId);
  }, [selectedTaskId]);

  async function loadTaskDetail(taskId: string) {
    setDetailLoading(true);
    setError(null);

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

  async function handleApprove() {
    if (!selectedTask || !canApproveReviewTask(selectedTask)) return;

    setApproving(true);
    setError(null);
    setFeedback(null);

    try {
      const updated = await approveInspectionTaskReview(selectedTask.id, comment);
      const nextUrl = getReviewApprovalRedirect(updated);
      if (nextUrl) {
        router.push(nextUrl);
        return;
      }

      setTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
      setSelectedTaskId('');
      setComment('');
      setFeedback(`任务 ${updated.orderNo} 已进入待签发。`);
    } catch (err: any) {
      setError(err.message || '审核通过失败');
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!selectedTask) return;

    setRejecting(true);
    setError(null);
    setFeedback(null);

    try {
      await rejectInspectionTaskReview(selectedTask.id);
    } catch (err: any) {
      setFeedback(err.message || '当前流程在建设中...');
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="review-tasks-layout">
      <header className="review-tasks-header">
        <div className="review-tasks-header-left">
          <button
            type="button"
            className="review-tasks-back"
            onClick={() => router.push('/')}
          >
            ← 首页 / 检测 / 审核
          </button>
          <div>
            <div className="review-tasks-title">审核工作台</div>
            <div className="review-tasks-subtitle">处理待审核任务，人工确认原始数据</div>
          </div>
        </div>
        <button type="button" className="review-tasks-filter" onClick={() => void loadTasks()}>
          刷新
        </button>
      </header>

      <div className="review-tasks-body">
        <section className="review-tasks-queue">
          <div className="review-tasks-kicker">Inspection / Review Queue</div>
          <h1>待审核任务</h1>
          <p>当前演示版不做权限控制，数据按流程流转后全部可见。</p>

          {feedback && <div className="review-tasks-feedback success">{feedback}</div>}
          {error && <div className="review-tasks-feedback error">{error}</div>}

          {loading ? (
            <div className="review-tasks-empty">正在加载审核任务...</div>
          ) : tasks.length == 0 ? (
            <div className="review-tasks-empty">当前没有待审核任务。</div>
          ) : (
            <div className="review-tasks-list">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={`review-tasks-card${selectedTaskId === task.id ? ' selected' : ''}`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="review-tasks-card-top">
                    <div className="review-tasks-card-title">{task.orderNo} · {task.sampleName}</div>
                    <span className="review-tasks-badge">待审核</span>
                  </div>
                  <div className="review-tasks-card-meta">
                    已上传原始记录图片。
                    <span className="review-tasks-ai-summary">
                      {task.aiReviewSummary || '可进入下一步签发。'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="review-tasks-decision">
          {!selectedTask ? (
            <div className="review-tasks-empty">选择一条待审核任务后，在这里填写备注并进行人工审核。</div>
          ) : detailLoading ? (
            <div className="review-tasks-empty">正在加载任务详情...</div>
          ) : !selectedTaskDetail ? (
            <div className="review-tasks-empty">任务详情加载失败，请重新选择或刷新。</div>
          ) : (
            <>
              <div className="review-tasks-card-title">{selectedTaskDetail.orderNo} · {selectedTaskDetail.sampleName}</div>
              <div className="review-tasks-card-meta">
                审核重点：确认表格还原值、AI 结论和现场记录是否一致。
              </div>

              <InspectionTaskReadonlyPanel
                detail={selectedTaskDetail}
                aiSummaryTitle="已有 AI 结论"
              />

              <label className="review-tasks-label" htmlFor="review-comment">审核意见</label>
              <textarea
                id="review-comment"
                className="review-tasks-textarea"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="备注框：审核人填写人工判断、补充说明或签发前提醒。"
              />

              <div className="review-tasks-actions">
                <button
                  type="button"
                  className="review-tasks-primary"
                  onClick={() => void handleApprove()}
                  disabled={!canApproveReviewTask(selectedTask) || approving}
                >
                  {approving ? '提交中...' : '通过'}
                </button>
                <button
                  type="button"
                  className="review-tasks-secondary"
                  onClick={() => void handleReject()}
                  disabled={rejecting}
                >
                  {rejecting ? '处理中...' : '退回'}
                </button>
              </div>

              <div className="review-tasks-note">
                通过后任务进入待签发。退回在当前演示版只提示“当前流程在建设中...”
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
