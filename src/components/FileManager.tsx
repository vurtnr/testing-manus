'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, getFiles, deleteFile, FileItem } from '@/lib/api';
import { findDuplicateStandardFile } from '@/lib/standard-file';
import { runPromisePool } from '@/lib/promise-pool';

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  xlsx: '📊',
  image: '🖼️',
};

const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp';
const MAX_CONCURRENT_UPLOADS = 3;

type UploadTaskStatus =
  | 'uploading'
  | 'processing'
  | 'success'
  | 'error'
  | 'skipped';

interface UploadTask {
  id: string;
  filename: string;
  fileSize: number;
  progress: number;
  status: UploadTaskStatus;
  message: string;
  fileId?: string;
}

interface Props {
  refreshKey: number;
  onUploadComplete: () => void;
}

export default function FileManager({ refreshKey, onUploadComplete }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch {
      // Ignore errors on load
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, refreshKey]);

  // Poll for status updates on processing files
  useEffect(() => {
    const hasProcessing = files.some((f) => f.uploadStatus === 'processing');
    if (!hasProcessing) return;

    const timer = setInterval(loadFiles, 3000);
    return () => clearInterval(timer);
  }, [files, loadFiles]);

  useEffect(() => {
    if (files.length === 0) return;

    setUploadTasks((prev) => {
      let changed = false;

      const next = prev.flatMap((task) => {
        if (!task.fileId) return task;

        const matchedFile = files.find((file) => file.id === task.fileId);
        if (!matchedFile) return task;

        if (matchedFile.uploadStatus === 'ready') {
          changed = true;
          return [];
        }

        if (matchedFile.uploadStatus === 'failed' && task.status !== 'error') {
          changed = true;
          return {
            ...task,
            progress: 100,
            status: 'error' as const,
            message: matchedFile.errorMessage || '上传成功，但文件解析失败',
          };
        }

        if (
          matchedFile.uploadStatus === 'processing' &&
          task.status === 'uploading'
        ) {
          changed = true;
          return {
            ...task,
            progress: 100,
            status: 'processing' as const,
            message: '上传完成，正在解析内容…',
          };
        }

        return task;
      });

      return changed ? next : prev;
    });
  }, [files]);

  const updateTask = useCallback((taskId: string, patch: Partial<UploadTask>) => {
    setUploadTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, ...patch } : task
    )));
  }, []);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const incomingFiles = Array.from(fileList);
    const uploadableFiles: Array<{ file: File; taskId: string }> = [];
    const createdTasks: UploadTask[] = [];
    const knownFiles = [...files];

    for (const file of incomingFiles) {
      const duplicate = findDuplicateStandardFile(file.name, knownFiles);
      if (duplicate) {
        createdTasks.push({
          id: crypto.randomUUID(),
          filename: file.name,
          fileSize: file.size,
          progress: 100,
          status: 'skipped',
          message: `已跳过，标准文件已存在：${duplicate.filename}`,
        });
        continue;
      }

      const taskId = crypto.randomUUID();
      uploadableFiles.push({ file, taskId });
      createdTasks.push({
        id: taskId,
        filename: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'uploading',
        message: '准备上传…',
      });
      knownFiles.push({
        id: `pending-${file.name}`,
        filename: file.name,
        fileType: '',
        fileSize: file.size,
        uploadStatus: 'pending',
        createdAt: new Date().toISOString(),
        standardNumber: null,
      });
    }

    if (createdTasks.length > 0) {
      setUploadTasks((prev) => [...createdTasks, ...prev].slice(0, 12));
    }

    if (uploadableFiles.length === 0) {
      return;
    }

    setUploading(true);

    try {
      await runPromisePool(uploadableFiles, MAX_CONCURRENT_UPLOADS, async ({ file, taskId }) => {
        try {
          updateTask(taskId, { message: '正在上传…' });
          const result = await uploadFile(file, {
            onProgress: (progress) => {
              updateTask(taskId, {
                progress,
                status: 'uploading',
                message: progress >= 100 ? '上传完成，正在排队解析…' : `正在上传… ${progress}%`,
              });
            },
          });

          updateTask(taskId, {
            fileId: result.fileId,
            progress: 100,
            status: 'processing',
            message: '上传完成，正在解析内容…',
          });
        } catch (err: any) {
          updateTask(taskId, {
            status: 'error',
            message: err.message || '上传失败，请重试',
          });
        }
      });

      await loadFiles();
      onUploadComplete();
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个文件吗？')) return;
    await deleteFile(fileId);
    await loadFiles();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const activeUploadTasks = uploadTasks.filter((task) => task.status === 'uploading');
  const averageUploadProgress = activeUploadTasks.length > 0
    ? Math.round(
      activeUploadTasks.reduce((sum, task) => sum + task.progress, 0) / activeUploadTasks.length
    )
    : 0;
  const processingCount = uploadTasks.filter((task) => task.status === 'processing').length;

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        📁 文件管理
      </div>

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="upload-zone-title">
          {uploading
            ? `正在上传 ${activeUploadTasks.length} 个文件 · ${averageUploadProgress}%`
            : '拖放文件到此处或点击上传'}
        </div>
        <div className="upload-zone-subtitle">
          {processingCount > 0
            ? `${processingCount} 个文件已上传，正在解析入库`
            : '支持 PDF、Word、Excel 与图片，上传后自动解析'}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {uploadTasks.length > 0 && (
        <div className="upload-task-list">
          {uploadTasks.map((task) => (
            <div key={task.id} className={`upload-task upload-task-${task.status}`}>
              <div className="upload-task-top">
                <span className="upload-task-name" title={task.filename}>{task.filename}</span>
                <span className={`upload-task-badge upload-task-badge-${task.status}`}>
                  {task.status === 'uploading' && `${task.progress}%`}
                  {task.status === 'processing' && '解析中'}
                  {task.status === 'success' && '成功'}
                  {task.status === 'error' && '失败'}
                  {task.status === 'skipped' && '已跳过'}
                </span>
              </div>
              <div className="upload-task-message">{task.message}</div>
              <div className="upload-task-meta">{formatSize(task.fileSize)}</div>
              <div className="upload-task-progress">
                <div
                  className={`upload-task-progress-bar upload-task-progress-bar-${task.status}`}
                  style={{ width: `${task.status === 'processing' ? 100 : task.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="file-list">
        {files.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: 20 }}>
            暂无文件
          </div>
        ) : (
          files.map((file) => (
            <div key={file.id} className="file-item">
              <span className="file-icon">
                {FILE_ICONS[file.fileType] || '📎'}
              </span>
              <div className="file-info">
                <div className="file-name">{file.filename}</div>
                <div className={`file-status ${file.uploadStatus}`}>
                  {file.uploadStatus === 'processing' && '处理中...'}
                  {file.uploadStatus === 'ready' && `就绪 · ${formatSize(file.fileSize)}`}
                  {file.uploadStatus === 'failed' && '处理失败'}
                  {file.uploadStatus === 'pending' && '等待处理'}
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, file.id)}
                title="删除"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
