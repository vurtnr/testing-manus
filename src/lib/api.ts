export interface FileItem {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadStatus: string;
  createdAt: string;
  standardNumber?: string | null;
  errorMessage?: string | null;
}

export interface Citation {
  index: number;
  chunkId: string;
  fileId: string;
  filename: string;
  fileType: string;
  sourceLocation: Record<string, any>;
  textExcerpt: string;
  confidenceScore: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

export interface UploadFileOptions {
  onProgress?: (progress: number) => void;
}

export interface ReviewSection {
  id: string;
  title: string;
  description: string;
}

export interface ReviewIssue {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  location: string;
  recommendation: string;
  sectionId: string;
  evidenceTitle: string;
  evidenceText: string;
  sourceType: '规则' | '语义检索' | '历史案例';
}

export interface ReportReviewPreview {
  fileId: string;
  filename: string;
  fileType: string;
  documentTitle: string | null;
  standardNumber: string | null;
  chunkCount: number;
  sections: ReviewSection[];
  issues: ReviewIssue[];
  summary: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface EntrustOcrResult {
  sourceName: string;
  confidence: number;
  rawText?: string;
  fields: {
    paperEntrustNo: string;
    contractNo: string;
    clientName: string;
    constructionUnit: string;
    supervisionUnit: string;
    contractorUnit: string;
    projectName: string;
    projectLocation: string;
    witnessName: string;
    witnessPhone: string;
    samplerName: string;
    samplerPhone: string;
    sampleName: string;
    sampleCount: number;
    sampleSpec: string;
    sampleBatch: string;
    engineeringPart: string;
    manufacturer: string;
    representativeQuantity: string;
    productionDate: string;
    testItems: string;
    testStandard: string;
    sampleCode: string;
    contactName: string;
    contactPhone: string;
    receivedAt: string;
    note: string;
    ocrSourceName: string;
    sourceImageName: string;
    sourceImagePath: string;
  };
}

import type { InspectionTaskStatus } from './entrust';
import type { InspectionAiReviewTraceItem } from './inspection-ai-review';
import type { InspectionRawDataIssueCell, InspectionRawDataTable } from './inspection-raw-data';

export interface EntrustOrder {
  id: string;
  orderNo: string;
  paperEntrustNo: string;
  contractNo: string;
  clientName: string;
  constructionUnit: string;
  supervisionUnit: string;
  contractorUnit: string;
  projectName: string;
  projectLocation: string;
  witnessName: string;
  witnessPhone: string;
  samplerName: string;
  samplerPhone: string;
  sampleName: string;
  sampleCount: number;
  sampleSpec: string;
  sampleBatch: string;
  engineeringPart: string;
  manufacturer: string;
  representativeQuantity: string;
  productionDate: string;
  testItems: string;
  testStandard: string;
  sampleCode: string;
  contactName: string;
  contactPhone: string;
  receivedAt: string;
  note: string;
  status: 'pending_acceptance' | 'queued';
  taskStatus: InspectionTaskStatus;
  experimenterName: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  rawDataImagePath: string;
  rawDataImageName: string;
  rawDataPreviewJson: Record<string, unknown> | null;
  aiReviewTraceJson: Array<Record<string, unknown>> | null;
  aiReviewSummary: string;
  aiReviewPassed: boolean;
  reviewComment: string;
  reviewedAt: string;
  issuedDocumentName: string;
  issuedDocumentUrl: string;
  ocrSourceName: string;
  sourceImageName: string;
  sourceImagePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTaskItem {
  id: string;
  orderNo: string;
  title: string;
  status: 'pending' | 'processing' | 'completed';
  taskStatus: InspectionTaskStatus;
  experimenterName: string;
  assigneeLabel: string;
  dueLabel: string;
  summary: string;
  createdAt: string;
  sampleName: string;
  sampleCount: number;
  testItems: string;
  testStandard: string;
  assignedEquipmentId: string;
  assignedEquipmentName: string;
  pickupDepartment: string;
  aiReviewSummary: string;
  aiReviewPassed: boolean;
  issuedDocumentName?: string;
  issuedDocumentUrl?: string;
}

export interface InspectionTaskDetail extends InspectionTaskItem {
  paperEntrustNo: string;
  contractNo: string;
  clientName: string;
  constructionUnit: string;
  supervisionUnit: string;
  contractorUnit: string;
  projectName: string;
  projectLocation: string;
  witnessName: string;
  witnessPhone: string;
  samplerName: string;
  samplerPhone: string;
  sampleSpec: string;
  sampleBatch: string;
  engineeringPart: string;
  manufacturer: string;
  representativeQuantity: string;
  productionDate: string;
  sampleCode: string;
  contactName: string;
  contactPhone: string;
  receivedAt: string;
  note: string;
  rawDataImagePath: string;
  rawDataImageName: string;
  rawDataPreview: InspectionRawDataPreview['preview'] | null;
  aiReviewTrace: InspectionAiReviewTraceItem[] | null;
  reviewComment: string;
  reviewedAt: string;
  issuedDocumentName: string;
  issuedDocumentUrl: string;
}

export interface IssueDocumentPreview {
  html: string;
  filename: string;
  downloadUrl: string;
}

export interface InspectionRawDataPreview {
  preview: InspectionRawDataTable;
  imageName?: string;
}

export interface InspectionAiReviewResult {
  trace: Array<{
    id: string;
    label: string;
    detail: string;
  }>;
  summary: string;
  passed: boolean;
  issueCell?: InspectionRawDataIssueCell | null;
}

export interface LabEquipmentItem {
  id: string;
  equipmentName: string;
  status: 'idle' | 'busy' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

// Auth-aware fetch: handles 401 by refreshing token and retrying
export async function authFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status !== 401) return res;

  // Try refreshing the access token
  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (refreshRes.ok) {
    return fetch(url, options); // retry original request
  }

  // Refresh failed, redirect to login
  window.location.href = '/login';
  throw new Error('Session expired');
}

export async function uploadFile(
  file: File,
  options: UploadFileOptions = {}
): Promise<{ fileId: string; status: string }> {
  async function sendUpload(canRetry: boolean): Promise<{ fileId: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await new Promise<{ status: number; body: any }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.responseType = 'text';

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
        options.onProgress?.(progress);
      };

      xhr.onload = () => {
        let body: any = null;
        try {
          body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          body = null;
        }
        resolve({ status: xhr.status, body });
      };

      xhr.onerror = () => reject(new Error('网络连接失败，请重试'));
      xhr.send(formData);
    });

    if (response.status === 401 && canRetry) {
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
      if (refreshRes.ok) {
        return sendUpload(false);
      }
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(response.body?.error || 'Upload failed');
    }

    options.onProgress?.(100);
    return response.body;
  }

  return sendUpload(true);
}

// Shared SSE stream parser
async function* parseSSEStream(
  res: Response
): AsyncGenerator<{ type: string; data: any }> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}

export async function* streamChat(
  message: string,
  conversationId?: string
): AsyncGenerator<{ type: string; data: any }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat failed');
  }

  yield* parseSSEStream(res);
}

export async function* streamAgentChat(
  message: string,
  messages: ChatMessage[]
): AsyncGenerator<{ type: string; data: any }> {
  const res = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, messages }),
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat failed');
  }

  yield* parseSSEStream(res);
}

export async function getFiles(): Promise<FileItem[]> {
  const res = await authFetch('/api/files');
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export async function deleteFile(fileId: string): Promise<void> {
  await authFetch(`/api/files/${fileId}`, { method: 'DELETE' });
}

export async function getEvidence(chunkId: string): Promise<any> {
  const res = await authFetch(`/api/evidence?chunkId=${chunkId}`);
  if (!res.ok) throw new Error('Failed to fetch evidence');
  return res.json();
}

export async function getReportReviewPreview(fileId: string): Promise<ReportReviewPreview> {
  const res = await authFetch(`/api/report-review/preview?fileId=${fileId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch review preview');
  }
  return res.json();
}

export async function runEntrustOcr(image: File): Promise<EntrustOcrResult> {
  const formData = new FormData();
  formData.append('image', image);
  const res = await authFetch('/api/entrust/ocr', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to run entrust OCR');
  }
  return res.json();
}

export async function createEntrustOrder(image: File, ocrResult: EntrustOcrResult): Promise<EntrustOrder> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('ocrResult', JSON.stringify(ocrResult));
  const res = await authFetch('/api/entrust-orders', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create entrust order');
  }
  return res.json();
}

export async function getEntrustOrders(): Promise<EntrustOrder[]> {
  const res = await authFetch('/api/entrust-orders');
  if (!res.ok) throw new Error('Failed to fetch entrust orders');
  return res.json();
}

export async function getInspectionTasks(): Promise<InspectionTaskItem[]> {
  const res = await authFetch('/api/inspection-tasks');
  if (!res.ok) throw new Error('Failed to fetch inspection tasks');
  return res.json();
}

export async function getInspectionTaskByOrderNo(orderNo: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/by-order-no?orderNo=${encodeURIComponent(orderNo)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch inspection task');
  }
  return res.json();
}

export async function getInspectionTaskDetail(taskId: string): Promise<InspectionTaskDetail> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch inspection task detail');
  }
  return res.json();
}

export async function getLabEquipment(status?: 'idle' | 'busy' | 'maintenance'): Promise<LabEquipmentItem[]> {
  const query = status ? `?status=${status}` : '';
  const res = await authFetch(`/api/lab-equipment${query}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch lab equipment');
  }
  return res.json();
}

export async function startInspectionExperiment(
  taskId: string,
  equipmentId: string
): Promise<{ task: InspectionTaskItem; equipment: LabEquipmentItem }> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/start-experiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipmentId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to start experiment');
  }
  return res.json();
}

export async function completeInspectionExperiment(taskId: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/complete-experiment`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to complete experiment');
  }
  return res.json();
}

export async function getInspectionRawDataPreview(
  taskId: string,
  image: File
): Promise<InspectionRawDataPreview> {
  const formData = new FormData();
  formData.append('image', image);
  const res = await authFetch(`/api/inspection-tasks/${taskId}/raw-data-preview`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate raw data preview');
  }
  return res.json();
}

export async function updateInspectionRawDataPreview(
  taskId: string,
  preview: InspectionRawDataTable
): Promise<InspectionRawDataPreview> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/raw-data-preview`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preview }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update raw data preview');
  }
  return res.json();
}

export async function runInspectionAiReview(taskId: string): Promise<InspectionAiReviewResult> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/ai-review`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to run AI review');
  }
  return res.json();
}

export async function submitInspectionTaskForReview(taskId: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/submit-for-review`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit inspection task for review');
  }
  return res.json();
}

export async function approveInspectionTaskReview(taskId: string, comment: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/approve-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to approve inspection review');
  }
  return res.json();
}

export async function runInspectionIssueReview(taskId: string): Promise<InspectionAiReviewResult> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/issue-review`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to run issue review');
  }
  return res.json();
}

export async function completeInspectionIssue(taskId: string): Promise<InspectionTaskItem> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/issue-complete`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to complete issue task');
  }
  return res.json();
}

export async function getInspectionIssueDocumentPreview(taskId: string): Promise<IssueDocumentPreview> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/issue-document-preview`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to fetch issue document preview');
  }
  return res.json();
}

export function getInspectionIssueDocumentFileUrl(taskId: string) {
  return `/api/inspection-tasks/${taskId}/issue-document-file`;
}

export async function rejectInspectionTaskReview(taskId: string): Promise<void> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}/reject-review`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to reject inspection review');
  }
}

export async function deleteInspectionTask(taskId: string): Promise<void> {
  const res = await authFetch(`/api/inspection-tasks/${taskId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete inspection task');
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}
