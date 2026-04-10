'use client';

import { useEffect, useRef, useCallback } from 'react';

interface CalibrationDevice {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  location: string;
  certificateNo: string;
  calibrationOrg: string;
  calibratedAt: string;
  expiresAt: string;
  status: 'expired' | 'critical' | 'warning' | 'caution' | 'normal';
}

interface Props {
  device: CalibrationDevice;
  onClose: () => void;
}

const STATUS_LABELS: Record<CalibrationDevice['status'], string> = {
  expired: '已过期',
  critical: '即将到期',
  warning: '临近到期',
  caution: '需关注',
  normal: '正常',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(expiresAt: string): number {
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CalibrationDetailModal({ device, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap + Escape key
  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const days = daysUntil(device.expiresAt);
  const daysText =
    device.status === 'expired'
      ? `已过期 ${Math.abs(days)} 天`
      : `剩余 ${days} 天`;

  return (
    <div
      className="cal-modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cal-modal-title"
    >
      <div className="cal-modal" ref={dialogRef}>
        <div className="cal-modal-header">
          <span className="cal-modal-title" id="cal-modal-title">
            {device.name}
          </span>
          <button
            className="cal-modal-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="cal-modal-body">
          <div className="cal-detail-group">
            <div className="cal-detail-group-title">设备信息</div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">设备名称</span>
              <span className="cal-detail-value">{device.name}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">型号</span>
              <span className="cal-detail-value">{device.model}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">出厂编号</span>
              <span className="cal-detail-value">{device.serialNumber}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">存放位置</span>
              <span className="cal-detail-value">{device.location}</span>
            </div>
          </div>

          <div className="cal-detail-group">
            <div className="cal-detail-group-title">校准证书</div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">证书编号</span>
              <span className="cal-detail-value">{device.certificateNo}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">校准机构</span>
              <span className="cal-detail-value">{device.calibrationOrg}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">校准日期</span>
              <span className="cal-detail-value">{formatDate(device.calibratedAt)}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">到期日期</span>
              <span className="cal-detail-value">{formatDate(device.expiresAt)}</span>
            </div>
            <div className="cal-detail-row">
              <span className="cal-detail-label">校准状态</span>
              <span className={`cal-detail-status ${device.status}`}>
                {STATUS_LABELS[device.status]} ({daysText})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
