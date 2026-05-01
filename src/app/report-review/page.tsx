'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteFile,
  FileItem,
  getCurrentUser,
  getFiles,
  getReportReviewPreview,
  logout,
  ReportReviewPreview,
  UserInfo,
  uploadFile,
} from '@/lib/api';
import { canSubmitDecision, ReviewDecision } from './review-decision';
import { findReviewHistory, isDuplicateReviewUploadError } from './review-history';
import './report-review.css';

type StageStatus = 'waiting' | 'running' | 'done';

interface Stage {
  id: string;
  title: string;
  detail: string;
  status: StageStatus;
  metric?: string;
}

const INITIAL_STAGES: Stage[] = [
  { id: 'upload', title: '文件上传', detail: '接收报告与附件，校验格式和完整性', status: 'waiting' },
  { id: 'extract', title: '结构化提取', detail: '抽取报告结构、字段、结论与签章信息', status: 'waiting' },
  { id: 'rules', title: '规则引擎审核', detail: '执行确定性规则，识别缺项与冲突', status: 'waiting' },
  { id: 'retrieve', title: '标准依据检索', detail: '匹配标准条款、相似案例与历史数据', status: 'waiting' },
  { id: 'agent', title: 'Agent 复核', detail: '聚合规则结果与依据，输出复核意见', status: 'waiting' },
  { id: 'decision', title: '结论生成', detail: '生成通过 / 需补正 / 不通过草案', status: 'waiting' },
];

export default function ReportReviewPage() {
  const router = useRouter();
  const workbenchRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reviewFileId, setReviewFileId] = useState<string | null>(null);
  const [reviewFile, setReviewFile] = useState<FileItem | null>(null);
  const [reviewPreview, setReviewPreview] = useState<ReportReviewPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [historyMatches, setHistoryMatches] = useState<FileItem[]>([]);
  const [historyActionFileId, setHistoryActionFileId] = useState<string | null>(null);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [activeIssueId, setActiveIssueId] = useState<string>('');
  const [selectedDecision, setSelectedDecision] = useState<ReviewDecision>('revise');
  const [reviewerComment, setReviewerComment] = useState('');
  const [showExportSheet, setShowExportSheet] = useState(false);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  useEffect(() => {
    if (!reviewStarted || !reviewFileId) return;

    let cancelled = false;

    const syncStatus = async () => {
      try {
        const files = await getFiles();
        if (cancelled) return;

        const matchedFile = files.find((file) => file.id === reviewFileId) ?? null;
        setReviewFile(matchedFile);

        if (!matchedFile) return;

        if (matchedFile.uploadStatus === 'processing') {
          setStages((prev) => prev.map((stage, index) => {
            if (index === 0) return { ...stage, status: 'done', metric: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB` : '1 个文件' };
            if (index === 1) return { ...stage, status: 'running', metric: '已上传，正在解析与生成审核依据' };
            return stage;
          }));
        }

        if (matchedFile.uploadStatus === 'ready') {
          setStages([
            { ...INITIAL_STAGES[0], status: 'done', metric: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB` : '1 个文件' },
            { ...INITIAL_STAGES[1], status: 'done', metric: '解析完成' },
            { ...INITIAL_STAGES[2], status: 'done', metric: '已生成首轮问题列表' },
            { ...INITIAL_STAGES[3], status: 'done', metric: '已匹配标准依据' },
            { ...INITIAL_STAGES[4], status: 'done', metric: '已生成复核建议' },
            { ...INITIAL_STAGES[5], status: 'done', metric: '等待人工确认' },
          ]);

          if (!reviewPreview) {
            const preview = await getReportReviewPreview(reviewFileId);
            if (cancelled) return;
            setReviewPreview(preview);
            setActiveSectionId(preview.sections[0]?.id ?? '');
            setActiveIssueId(preview.issues[0]?.id ?? '');
          }
        }

        if (matchedFile.uploadStatus === 'failed') {
          setPreviewError(matchedFile.errorMessage || '解析失败，请重新上传文件');
          setStages((prev) => prev.map((stage, index) => (
            index === 1 ? { ...stage, status: 'running', metric: '解析失败，请重试' } : stage
          )));
        }
      } catch (error: any) {
        if (!cancelled) {
          setPreviewError(error.message || '加载审核结果失败');
        }
      }
    };

    syncStatus();
    const timer = setInterval(syncStatus, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [reviewStarted, reviewFileId, selectedFile, reviewPreview]);

  const currentStage = useMemo(
    () => stages.find((stage) => stage.status === 'running') ?? stages[stages.length - 1],
    [stages]
  );
  const reviewReady = Boolean(reviewPreview);
  const activeIssue = useMemo(
    () => reviewPreview?.issues.find((issue) => issue.id === activeIssueId) ?? reviewPreview?.issues[0] ?? null,
    [activeIssueId, reviewPreview]
  );
  const visibleIssues = useMemo(
    () => reviewPreview?.issues.filter((issue) => issue.sectionId === activeSectionId) ?? [],
    [activeSectionId, reviewPreview]
  );
  const issueSummary = reviewPreview?.summary ?? { high: 0, medium: 0, low: 0 };
  const canSubmit = canSubmitDecision(selectedDecision, issueSummary, reviewerComment);

  const loadHistoryMatches = async (file: File) => {
    const files = await getFiles();
    setHistoryMatches(findReviewHistory(files, file.name));
  };

  const openReviewHistory = async (file: FileItem) => {
    setHistoryActionFileId(file.id);
    setPreviewError(null);
    setHistoryMessage(null);
    setReviewFileId(file.id);
    setReviewFile(file);
    setReviewPreview(null);
    setSelectedDecision('revise');
    setReviewerComment('');
    setShowExportSheet(false);

    try {
      const preview = await getReportReviewPreview(file.id);
      setReviewStarted(true);
      setStages([
        { ...INITIAL_STAGES[0], status: 'done', metric: `${(file.fileSize / (1024 * 1024)).toFixed(1)}MB` },
        { ...INITIAL_STAGES[1], status: 'done', metric: '已读取历史解析结果' },
        { ...INITIAL_STAGES[2], status: 'done', metric: '已载入历史问题列表' },
        { ...INITIAL_STAGES[3], status: 'done', metric: '已载入历史依据' },
        { ...INITIAL_STAGES[4], status: 'done', metric: '已载入历史复核建议' },
        { ...INITIAL_STAGES[5], status: 'done', metric: '可继续人工审核' },
      ]);
      setReviewPreview(preview);
      setActiveSectionId(preview.sections[0]?.id ?? '');
      setActiveIssueId(preview.issues[0]?.id ?? '');
      setHistoryMessage(`已打开 ${file.filename} 的审核历史`);
    } catch (error: any) {
      setPreviewError(error.message || '加载审核历史失败');
    } finally {
      setHistoryActionFileId(null);
    }
  };

  const handleDeleteHistory = async (file: FileItem) => {
    setHistoryActionFileId(file.id);
    setHistoryMessage(null);

    try {
      await deleteFile(file.id);
      const remaining = historyMatches.filter((item) => item.id !== file.id);
      setHistoryMatches(remaining);
      setHistoryMessage(`已删除 ${file.filename}`);

      if (reviewFileId === file.id) {
        setReviewStarted(false);
        setReviewFileId(null);
        setReviewFile(null);
        setReviewPreview(null);
        setActiveSectionId('');
        setActiveIssueId('');
        setStages(INITIAL_STAGES);
      }

      if (remaining.length === 0) {
        setPreviewError(null);
      }
    } catch (error: any) {
      setPreviewError(error.message || '删除审核历史失败');
    } finally {
      setHistoryActionFileId(null);
    }
  };

  useEffect(() => {
    if (!reviewReady) return;
    workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [reviewReady]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setReviewStarted(false);
    setUploadProgress(0);
    setReviewFileId(null);
    setReviewFile(null);
    setReviewPreview(null);
    setPreviewError(null);
    setHistoryMessage(null);
    setHistoryMatches([]);
    setActiveSectionId('');
    setActiveIssueId('');
    setStages(INITIAL_STAGES);
  };

  const handleStartReview = async () => {
    if (!selectedFile) return;
    setPreviewError(null);
    setReviewStarted(true);
    setReviewPreview(null);
    setReviewFile(null);
    setSelectedDecision('revise');
    setReviewerComment('');
    setShowExportSheet(false);
    setHistoryMessage(null);
    setHistoryMatches([]);
    setStages((prev) => prev.map((stage, index) => (
      index === 0 ? { ...stage, status: 'running', metric: '上传中…' } : stage
    )));

    try {
      const result = await uploadFile(selectedFile, {
        onProgress: (progress) => {
          setUploadProgress(progress);
          setStages((prev) => prev.map((stage, index) => (
            index === 0 ? { ...stage, status: 'running', metric: `${progress}%` } : stage
          )));
        },
      });

      setReviewFileId(result.fileId);
      setStages((prev) => prev.map((stage, index) => {
        if (index === 0) {
          return {
            ...stage,
            status: 'done',
            metric: selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB` : '1 个文件',
          };
        }
        if (index === 1) {
          return { ...stage, status: 'running', metric: '已上传，等待解析任务启动' };
        }
        return stage;
      }));
    } catch (error: any) {
      const message = error.message || '上传失败，请重试';
      setPreviewError(message);
      setReviewStarted(false);
      setStages(INITIAL_STAGES);

      if (selectedFile && isDuplicateReviewUploadError(message)) {
        try {
          await loadHistoryMatches(selectedFile);
        } catch (historyError: any) {
          setPreviewError(historyError.message || message);
        }
      }
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const historyTitle = useMemo(() => {
    if (!selectedFile) return '审核历史';
    return `${selectedFile.name} 的审核历史`;
  }, [selectedFile]);

  return (
    <div className="review-layout">
      <div className="review-header">
        <div className="review-header-left">
          <button className="review-header-back" onClick={() => router.push('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>工作台</span>
          </button>
          <svg className="review-header-sep" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className="review-header-title">报告审核</span>
          <span className="review-header-subtitle">检测软件 / 交互原型</span>
        </div>
        <div className="review-header-right">
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

      <div className={`review-main${reviewReady ? ' review-main-ready' : ''}`}>
        <div className={`review-body${reviewReady ? ' review-body-collapsed' : ''}`}>
          <section className={`review-upload-panel${reviewReady ? ' review-panel-compact' : ''}`}>
          <div className="review-panel-head">
            <span className="review-kicker">Step 1</span>
            <h1>上传检测报告</h1>
            <p>上传报告后，系统将自动提取结构、匹配标准依据，并生成首轮审核意见。</p>
          </div>

          <label className="review-dropzone">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="review-file-input"
              onChange={handleFileChange}
            />
            <div className="review-dropzone-icon">🧾</div>
            <div className="review-dropzone-title">
              {selectedFile ? selectedFile.name : '拖拽报告到此处或点击选择文件'}
            </div>
            <div className="review-dropzone-subtitle">
              支持 PDF / Word，后续可追加原始记录与附件
            </div>
          </label>

          <div className="review-upload-actions">
            <button
              type="button"
              className="review-primary-btn"
              onClick={handleStartReview}
              disabled={!selectedFile}
            >
              开始审核
            </button>
            <button type="button" className="review-secondary-btn">
              导入样例报告
            </button>
          </div>

          <div className="review-preview-card">
            <div className="review-preview-label">当前上传</div>
            <div className="review-preview-name">{selectedFile?.name || '尚未选择文件'}</div>
            <div className="review-preview-meta">
              {selectedFile
                ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB · 将进入结构化审核流程`
                : '建议先上传一份完整报告进行体验'}
            </div>
            {reviewStarted && (
              <div className="review-preview-meta">
                上传进度：{uploadProgress}% {reviewFile ? `· 当前状态 ${reviewFile.uploadStatus}` : ''}
              </div>
            )}
            {previewError && (
              <div className="review-preview-error">{previewError}</div>
            )}
            {historyMessage && (
              <div className="review-preview-note">{historyMessage}</div>
            )}
          </div>

          {historyMatches.length > 0 && (
            <div className="review-history-card">
              <div className="review-history-head">
                <div>
                  <div className="review-preview-label">发现重复报告</div>
                  <div className="review-history-title">{historyTitle}</div>
                </div>
                <span className="review-history-count">{historyMatches.length} 条历史</span>
              </div>
              <div className="review-history-copy">
                这份报告已经有历史审核记录。你可以直接打开上次结果继续审核，或先删除旧记录后重新上传。
              </div>
              <div className="review-history-list">
                {historyMatches.map((item) => {
                  const isBusy = historyActionFileId === item.id;
                  const canOpen = item.uploadStatus === 'ready';

                  return (
                    <div key={item.id} className="review-history-item">
                      <div className="review-history-item-main">
                        <div className="review-history-item-top">
                          <div className="review-history-item-name">{item.filename}</div>
                          <span className={`review-history-status status-${item.uploadStatus}`}>
                            {item.uploadStatus === 'ready' && '已完成'}
                            {item.uploadStatus === 'processing' && '处理中'}
                            {item.uploadStatus === 'failed' && '失败'}
                          </span>
                        </div>
                        <div className="review-history-item-meta">
                          {new Intl.DateTimeFormat('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(item.createdAt))}
                          {' · '}
                          {(item.fileSize / (1024 * 1024)).toFixed(1)}MB
                          {item.errorMessage ? ` · ${item.errorMessage}` : ''}
                        </div>
                      </div>
                      <div className="review-history-actions">
                        <button
                          type="button"
                          className="review-secondary-btn"
                          onClick={() => openReviewHistory(item)}
                          disabled={!canOpen || isBusy}
                        >
                          {canOpen ? '查看审核历史' : '暂无可查看结果'}
                        </button>
                        <button
                          type="button"
                          className="review-history-delete"
                          onClick={() => handleDeleteHistory(item)}
                          disabled={isBusy}
                        >
                          删除记录
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </section>

          <section className={`review-progress-panel${reviewReady ? ' review-panel-compact' : ''}`}>
          <div className="review-panel-head">
            <span className="review-kicker">Step 2</span>
            <h2>审核阶段进度</h2>
            <p>这里显示的是业务审核阶段，不只是上传百分比。</p>
          </div>

          <div className="review-stage-list">
            {stages.map((stage) => (
              <div key={stage.id} className={`review-stage review-stage-${stage.status}`}>
                <div className="review-stage-marker" />
                <div className="review-stage-content">
                  <div className="review-stage-top">
                    <div className="review-stage-title">{stage.title}</div>
                    <div className={`review-stage-badge review-stage-badge-${stage.status}`}>
                      {stage.status === 'done' && '已完成'}
                      {stage.status === 'running' && '进行中'}
                      {stage.status === 'waiting' && '等待中'}
                    </div>
                  </div>
                  <div className="review-stage-detail">{stage.detail}</div>
                  {stage.metric && <div className="review-stage-metric">{stage.metric}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="review-status-card">
            <div className="review-status-title">当前状态</div>
            <div className="review-status-highlight">{currentStage.title}</div>
            <div className="review-status-copy">
              {reviewStarted
                ? reviewReady
                  ? '当前工作台已经接入真实文件上传与解析状态，问题列表来自首轮 preview 结果。'
                  : '当前正根据真实上传文件推进解析流程，完成后将自动进入审核工作台。'
                : '选择文件后即可进入阶段进度体验。'}
            </div>
          </div>
          </section>

          <aside className={`review-side-panel${reviewReady ? ' review-side-panel-compact' : ''}`}>
            <div className="review-side-card">
            <div className="review-side-title">本次交付范围</div>
            <ul className="review-side-list">
              <li>首页可一键进入报告审核</li>
              <li>上传与阶段进度骨架可体验</li>
              <li>为后续三栏审核工作台预留入口</li>
            </ul>
            </div>

            <div className="review-side-card">
            <div className="review-side-title">后续阶段</div>
            <ul className="review-side-list">
              <li>规则引擎命中列表</li>
              <li>标准依据与历史案例抽屉</li>
              <li>人工决策与导出审核报告</li>
            </ul>
            </div>
          </aside>
        </div>

        {reviewReady && activeIssue && reviewPreview && (
        <div ref={workbenchRef} className="review-workbench-shell">
          <div className="review-workbench-head">
            <div>
              <div className="review-kicker">Step 3</div>
              <h2 className="review-workbench-title">审核工作台</h2>
              <p className="review-workbench-subtitle">
                先用 mock 审核结果验证三栏交互。后续接入真实规则命中与依据抽屉。
              </p>
            </div>
            <div className="review-summary-chips">
              <span className="review-summary-chip high">高风险 {issueSummary.high}</span>
              <span className="review-summary-chip medium">需补正 {issueSummary.medium}</span>
              <span className="review-summary-chip low">建议 {issueSummary.low}</span>
            </div>
          </div>

          <div className="review-workbench-grid">
            <section className="review-workbench-pane">
              <div className="review-pane-title">报告结构</div>
              <div className="review-section-list">
                {reviewPreview.sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={`review-section-item${section.id === activeSectionId ? ' active' : ''}`}
                    onClick={() => {
                      setActiveSectionId(section.id);
                      const firstIssue = reviewPreview.issues.find((issue) => issue.sectionId === section.id);
                      if (firstIssue) setActiveIssueId(firstIssue.id);
                    }}
                  >
                    <span className="review-section-name">{section.title}</span>
                    <span className="review-section-desc">{section.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="review-workbench-pane">
              <div className="review-pane-title">审核问题</div>
              <div className="review-issue-list">
                {visibleIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    className={`review-issue-card severity-${issue.severity}${issue.id === activeIssue.id ? ' active' : ''}`}
                    onClick={() => setActiveIssueId(issue.id)}
                  >
                    <div className="review-issue-top">
                      <span className={`review-issue-severity severity-${issue.severity}`}>
                        {issue.severity === 'high' && '高风险'}
                        {issue.severity === 'medium' && '需补正'}
                        {issue.severity === 'low' && '建议'}
                      </span>
                      <span className="review-issue-location">{issue.location}</span>
                    </div>
                    <div className="review-issue-title">{issue.title}</div>
                    <div className="review-issue-recommendation">{issue.recommendation}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="review-workbench-pane">
              <div className="review-pane-title">依据与解释</div>
              <div className="review-evidence-card">
                <div className="review-evidence-label">当前问题</div>
                <div className="review-evidence-title">{activeIssue.title}</div>
                <div className="review-evidence-meta">{activeIssue.location}</div>

                  <div className="review-evidence-block">
                    <div className="review-evidence-block-title">匹配依据</div>
                    <div className="review-evidence-block-head">
                    <span>{activeIssue.evidenceTitle}</span>
                    <span className="review-evidence-source">{activeIssue.sourceType}</span>
                  </div>
                  <p>{activeIssue.evidenceText}</p>
                </div>

                <div className="review-evidence-block">
                  <div className="review-evidence-block-title">建议动作</div>
                  <p>{activeIssue.recommendation}</p>
                </div>

                <div className="review-decision-bar">
                  <button type="button" className="review-secondary-btn">忽略本条</button>
                  <button type="button" className="review-secondary-btn">转人工复核</button>
                  <button type="button" className="review-primary-btn">接受问题</button>
                </div>
              </div>
            </section>
          </div>

          <div className="review-final-bar">
            <div className="review-final-summary">
              <div className="review-final-label">最终审核结论</div>
              <div className="review-final-counts">
                <span>高风险 {issueSummary.high}</span>
                <span>需补正 {issueSummary.medium}</span>
                <span>建议 {issueSummary.low}</span>
              </div>
            </div>

            <div className="review-decision-group">
              <button
                type="button"
                className={`review-decision-btn approve${selectedDecision === 'approve' ? ' active' : ''}`}
                onClick={() => setSelectedDecision('approve')}
              >
                通过
              </button>
              <button
                type="button"
                className={`review-decision-btn revise${selectedDecision === 'revise' ? ' active' : ''}`}
                onClick={() => setSelectedDecision('revise')}
              >
                需补正
              </button>
              <button
                type="button"
                className={`review-decision-btn reject${selectedDecision === 'reject' ? ' active' : ''}`}
                onClick={() => setSelectedDecision('reject')}
              >
                不通过
              </button>
            </div>

            <div className="review-comment-box">
              <label className="review-comment-label">审核意见</label>
              <textarea
                className="review-comment-input"
                value={reviewerComment}
                onChange={(event) => setReviewerComment(event.target.value)}
                placeholder={
                  selectedDecision === 'approve'
                    ? '可选：补充通过说明'
                    : selectedDecision === 'revise'
                      ? '必填：说明需补正的关键项'
                      : '必填：说明不通过的核心原因'
                }
              />
            </div>

            <div className="review-final-actions">
              <button type="button" className="review-secondary-btn">
                保存草稿
              </button>
              <button
                type="button"
                className="review-primary-btn"
                disabled={!canSubmit}
                onClick={() => setShowExportSheet(true)}
              >
                导出审核报告
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {showExportSheet && (
        <div className="review-export-overlay" onClick={() => setShowExportSheet(false)}>
          <div className="review-export-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="review-export-head">
              <div>
                <div className="review-kicker">Export</div>
                <h3>导出审核报告</h3>
              </div>
              <button
                type="button"
                className="review-export-close"
                onClick={() => setShowExportSheet(false)}
              >
                ×
              </button>
            </div>

            <div className="review-export-grid">
              <div className="review-export-card">
                <div className="review-export-label">最终结论</div>
                <div className="review-export-value">
                  {selectedDecision === 'approve' && '通过'}
                  {selectedDecision === 'revise' && '需补正'}
                  {selectedDecision === 'reject' && '不通过'}
                </div>
              </div>
              <div className="review-export-card">
                <div className="review-export-label">问题统计</div>
                <div className="review-export-value">
                  {issueSummary.high} / {issueSummary.medium} / {issueSummary.low}
                </div>
                <div className="review-export-meta">高风险 / 需补正 / 建议</div>
              </div>
              <div className="review-export-card">
                <div className="review-export-label">依据条款</div>
                <div className="review-export-value">14 条</div>
              </div>
              <div className="review-export-card">
                <div className="review-export-label">审核备注</div>
                <div className="review-export-comment">
                  {reviewerComment.trim() || '无补充说明'}
                </div>
              </div>
            </div>

            <div className="review-export-actions">
              <button type="button" className="review-secondary-btn" onClick={() => setShowExportSheet(false)}>
                返回修改
              </button>
              <button type="button" className="review-primary-btn">
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
