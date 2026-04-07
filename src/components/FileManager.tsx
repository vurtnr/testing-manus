'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadFile, getFiles, deleteFile, FileItem } from '@/lib/api';

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  docx: '📝',
  xlsx: '📊',
  image: '🖼️',
};

const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp';

interface Props {
  refreshKey: number;
  onUploadComplete: () => void;
}

export default function FileManager({ refreshKey, onUploadComplete }: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
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

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(file);
      }
      await loadFiles();
      onUploadComplete();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
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
        {uploading ? '上传中...' : '拖放文件到此处或点击上传'}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

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
