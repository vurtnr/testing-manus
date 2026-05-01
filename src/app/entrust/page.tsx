'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createEntrustOrder,
  EntrustOcrResult,
  runEntrustOcr,
} from '@/lib/api';
import { buildInspectionTask } from '@/lib/entrust';
import {
  buildEntrustOcrProgressSteps,
  getEntrustSubmitHint,
} from './entrust-ocr-progress';
import './entrust.css';

const INSPECTION_RETURN_SIGNAL = '/?inspectionSignal=created';

function buildSummaryItems(result: EntrustOcrResult | null) {
  if (!result) return [];
  const { fields } = result;
  return [
    ['委托单编号', fields.paperEntrustNo],
    ['合同编号', fields.contractNo],
    ['委托单位', fields.clientName],
    ['建设单位', fields.constructionUnit],
    ['监理单位', fields.supervisionUnit],
    ['施工单位', fields.contractorUnit],
    ['工程名称', fields.projectName],
    ['工程地址', fields.projectLocation],
    ['见证人', fields.witnessName],
    ['取样人', fields.samplerName],
    ['样品名称', fields.sampleName],
    ['规格型号', fields.sampleSpec],
    ['批号', fields.sampleBatch],
    ['工程部位', fields.engineeringPart],
    ['生产厂家', fields.manufacturer],
    ['代表数量/值', fields.representativeQuantity],
    ['成型/生产日期', fields.productionDate],
    ['检测参数', fields.testItems],
    ['检测标准', fields.testStandard],
    ['样品编号', fields.sampleCode],
    ['联系人', fields.contactName],
    ['联系电话', fields.contactPhone],
    ['收样时间', fields.receivedAt],
    ['备注', fields.note],
  ].filter(([, value]) => value);
}

export default function EntrustPage() {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<EntrustOcrResult | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summaryItems = useMemo(() => buildSummaryItems(ocrResult), [ocrResult]);
  const progressSteps = useMemo(() => buildEntrustOcrProgressSteps(), []);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedImage(file);
    setOcrResult(null);
    setFeedback(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const handleRecognize = async () => {
    if (!selectedImage) return;
    setRecognizing(true);
    setError(null);
    setFeedback(null);

    try {
      const result = await runEntrustOcr(selectedImage);
      setOcrResult(result);
      setFeedback('OCR 识别完成。系统将以当前照片和识别结果作为委托记录入库。');
    } catch (err: any) {
      setError(err.message || 'OCR 识别失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedImage || !ocrResult) return;
    setSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const order = await createEntrustOrder(selectedImage, ocrResult);
      try {
        const storageKey = 'inspectionTaskDrafts';
        const drafts = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        drafts.unshift(buildInspectionTask(order));
        sessionStorage.setItem(storageKey, JSON.stringify(drafts.slice(0, 10)));
      } catch {
        // Ignore storage errors and rely on DB-backed list.
      }
      setFeedback(`委托单 ${order.orderNo} 已按照片原件入库，正在返回首页。`);
      router.push(INSPECTION_RETURN_SIGNAL);
    } catch (err: any) {
      setError(err.message || '委托单提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="entrust-layout">
      <div className="entrust-header">
        <button type="button" className="entrust-back" onClick={() => router.push('/')}>
          ← 返回首页
        </button>
        <div>
          <div className="entrust-kicker">检测 / 委托受理</div>
          <h1>纸质委托单识别入库</h1>
          <p>系统只做真实 OCR 识别和归档，入库记录以前台上传的纸质委托单照片为准，不再生成系统内表单。</p>
        </div>
      </div>

      <div className="entrust-grid">
        <section className="entrust-panel entrust-panel-fixed">
          <div className="entrust-panel-title">Step 1 · 上传纸质委托单照片</div>
          <label className="entrust-dropzone">
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <span>{selectedImage ? selectedImage.name : '选择前台拍摄的委托单照片'}</span>
            <small>建议拍摄完整委托单首页，确保表格内容、手写编号和盖章区域清晰可见。</small>
          </label>

          {previewUrl && (
            <div className="entrust-image-preview">
              <img src={previewUrl} alt="委托单预览" />
            </div>
          )}

          <div className="entrust-actions">
            <button type="button" className="entrust-primary" disabled={!selectedImage || recognizing} onClick={handleRecognize}>
              {recognizing ? '识别中…' : '开始 OCR 识别'}
            </button>
            <button type="button" className="entrust-secondary" onClick={() => router.push('/inspection-tasks')}>
              查看我的任务
            </button>
          </div>

          <div className="entrust-timeline">
            <div className={`entrust-timeline-item${selectedImage ? ' done' : ''}`}>拍照上传</div>
            <div className={`entrust-timeline-item${ocrResult ? ' done' : ''}`}>结构化识别</div>
            <div className={`entrust-timeline-item${feedback?.includes('已按照片原件入库') ? ' done' : ''}`}>按原件归档入库</div>
          </div>
        </section>

        <section className="entrust-panel entrust-panel-scroll">
          <div className="entrust-panel-title">Step 2 · OCR 识别摘要</div>
          <div className="entrust-panel-scroll-body">
            <div className="entrust-confidence">
              识别置信度：{ocrResult ? `${Math.round(ocrResult.confidence * 100)}%` : '待识别'}
            </div>

            {recognizing && (
              <div className="entrust-ocr-progress">
                <div className="entrust-ocr-progress-top">
                  <div>
                    <div className="entrust-progress-eyebrow">LLM OCR Pipeline</div>
                    <div className="entrust-progress-title">正在识别纸质委托单并分析字段关系</div>
                  </div>
                  <span className="entrust-progress-status">识别中</span>
                </div>
                <div className="entrust-progress-bar">
                  <div className="entrust-progress-bar-fill" />
                </div>
                <div className="entrust-progress-trace">
                  {progressSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`entrust-progress-trace-item entrust-progress-trace-item-${index + 1}`}
                    >
                      <span className="entrust-progress-trace-label">{step.label}</span>
                      <span>{step.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!recognizing && !ocrResult && (
              <div className="entrust-confidence entrust-empty-note">
                上传照片并执行 OCR 后，这里会展示委托单上的关键信息摘要。入库时以原始照片和 OCR 结果一起归档。
              </div>
            )}

            {ocrResult && (
              <>
                <div className="entrust-summary-grid">
                  {summaryItems.map(([label, value]) => (
                    <div key={label} className="entrust-summary-item">
                      <div className="entrust-summary-label">{label}</div>
                      <div className="entrust-summary-value">{value}</div>
                    </div>
                  ))}
                </div>

                {ocrResult.rawText && (
                  <div className="entrust-raw-text">
                    <div className="entrust-summary-label">OCR 原文</div>
                    <pre>{ocrResult.rawText}</pre>
                  </div>
                )}
              </>
            )}

            {error && <div className="entrust-error">{error}</div>}
            {feedback && <div className="entrust-success">{feedback}</div>}
          </div>

          <div className="entrust-submit-bar entrust-submit-bar-sticky">
            <div className="entrust-submit-hint">{getEntrustSubmitHint(Boolean(ocrResult))}</div>
            <button type="button" className="entrust-primary" disabled={!selectedImage || !ocrResult || submitting} onClick={handleSubmit}>
              {submitting ? '入库中…' : '确认按照片原件入库'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
