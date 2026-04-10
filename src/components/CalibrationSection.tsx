'use client';

import { useState, useEffect, useCallback } from 'react';
import CalibrationDetailModal from './CalibrationDetailModal';
import './calibration.css';

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

function computeStatus(expiresAt: string): CalibrationDevice['status'] {
  const now = new Date();
  const exp = new Date(expiresAt);
  const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days < 30) return 'critical';
  if (days < 60) return 'warning';
  if (days < 90) return 'caution';
  return 'normal';
}

function daysUntil(expiresAt: string): number {
  const now = new Date();
  const exp = new Date(expiresAt);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function progressPercent(device: CalibrationDevice): number {
  const cal = new Date(device.calibratedAt);
  const exp = new Date(device.expiresAt);
  const now = new Date();
  const total = exp.getTime() - cal.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - cal.getTime();
  return Math.min(100, Math.max(0, (elapsed / total) * 100));
}

// Mock data: 2 expired, 1 critical, 2 warning, 5 normal
const MOCK_DEVICES: Omit<CalibrationDevice, 'status'>[] = [
  {
    id: '1',
    name: '万能试验机 WDW-100',
    model: 'WDW-100',
    serialNumber: 'SN-2023-001',
    location: '力学实验室 A101',
    certificateNo: 'JZ-2025-0138',
    calibrationOrg: '省计量科学研究院',
    calibratedAt: '2025-04-10',
    expiresAt: '2026-04-10',
  },
  {
    id: '2',
    name: '压力试验机 YAW-300',
    model: 'YAW-300',
    serialNumber: 'SN-2022-015',
    location: '力学实验室 A102',
    certificateNo: 'JZ-2025-0142',
    calibrationOrg: '国家建材检测中心',
    calibratedAt: '2025-03-15',
    expiresAt: '2026-03-15',
  },
  {
    id: '3',
    name: '水泥胶砂搅拌机',
    model: 'JJ-5',
    serialNumber: 'SN-2024-008',
    location: '水泥实验室 B201',
    certificateNo: 'JZ-2025-0201',
    calibrationOrg: '市计量所',
    calibratedAt: '2025-05-01',
    expiresAt: '2026-05-01',
  },
  {
    id: '4',
    name: '混凝土抗压机',
    model: 'YAW-2000',
    serialNumber: 'SN-2021-003',
    location: '力学实验室 A103',
    certificateNo: 'JZ-2025-0089',
    calibrationOrg: '省计量科学研究院',
    calibratedAt: '2025-08-20',
    expiresAt: '2026-08-20',
  },
  {
    id: '5',
    name: '电子天平 ME204',
    model: 'ME204',
    serialNumber: 'SN-2023-042',
    location: '化学实验室 C301',
    certificateNo: 'JZ-2025-0312',
    calibrationOrg: '市计量所',
    calibratedAt: '2025-06-15',
    expiresAt: '2026-06-15',
  },
  {
    id: '6',
    name: '混凝土坍落度筒',
    model: '标准型',
    serialNumber: 'SN-2024-019',
    location: '混凝土实验室 B102',
    certificateNo: 'JZ-2025-0178',
    calibrationOrg: '省计量科学研究院',
    calibratedAt: '2025-11-01',
    expiresAt: '2026-11-01',
  },
  {
    id: '7',
    name: '钢筋扫描仪',
    model: 'ZBL-R660',
    serialNumber: 'SN-2024-031',
    location: '结构实验室 D201',
    certificateNo: 'JZ-2025-0265',
    calibrationOrg: '国家建材检测中心',
    calibratedAt: '2025-09-10',
    expiresAt: '2026-09-10',
  },
  {
    id: '8',
    name: '水泥净浆搅拌机',
    model: 'NJ-160',
    serialNumber: 'SN-2023-055',
    location: '水泥实验室 B202',
    certificateNo: 'JZ-2025-0199',
    calibrationOrg: '市计量所',
    calibratedAt: '2025-07-20',
    expiresAt: '2026-07-20',
  },
  {
    id: '9',
    name: '养护室温湿度计',
    model: 'WS-2000',
    serialNumber: 'SN-2024-009',
    location: '养护室 E101',
    certificateNo: 'JZ-2025-0401',
    calibrationOrg: '省计量科学研究院',
    calibratedAt: '2025-10-05',
    expiresAt: '2026-10-05',
  },
  {
    id: '10',
    name: '回弹仪 ZC3-A',
    model: 'ZC3-A',
    serialNumber: 'SN-2022-078',
    location: '结构实验室 D202',
    certificateNo: 'JZ-2025-0334',
    calibrationOrg: '国家建材检测中心',
    calibratedAt: '2025-12-01',
    expiresAt: '2026-12-01',
  },
];

function useAnimatedCounter(target: number, duration: number = 800): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    let raf: number;
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return count;
}

function StatCard({
  icon,
  label,
  count,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  variant: 'expired' | 'critical' | 'normal';
}) {
  const animated = useAnimatedCounter(count);
  return (
    <div className={`cal-stat-card ${variant}`}>
      <div className="cal-stat-icon">{icon}</div>
      <div className="cal-stat-info">
        <div className="cal-stat-number">{animated}</div>
        <div className="cal-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function CalibrationSection() {
  const [selectedDevice, setSelectedDevice] = useState<CalibrationDevice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const devices: CalibrationDevice[] = MOCK_DEVICES.map((d) => ({
    ...d,
    status: mounted ? computeStatus(d.expiresAt) : 'normal',
  }));

  // Sort: expired first, then critical, then warning, then caution, then normal
  // Within same status, sort by days remaining ascending
  const statusOrder: Record<string, number> = {
    expired: 0,
    critical: 1,
    warning: 2,
    caution: 3,
    normal: 4,
  };
  const sorted = [...devices].sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return daysUntil(a.expiresAt) - daysUntil(b.expiresAt);
  });

  const expiredCount = devices.filter((d) => d.status === 'expired').length;
  const criticalCount = devices.filter(
    (d) => d.status === 'critical' || d.status === 'warning'
  ).length;
  const normalCount = devices.filter(
    (d) => d.status === 'caution' || d.status === 'normal'
  ).length;

  const closeModal = useCallback(() => setSelectedDevice(null), []);

  // Hide section if zero devices
  if (devices.length === 0) return null;

  const daysLabel = (d: CalibrationDevice) => {
    const days = daysUntil(d.expiresAt);
    if (d.status === 'expired') return `过期 ${Math.abs(days)} 天`;
    return `剩余 ${days} 天`;
  };

  const expiresLabel = (d: CalibrationDevice) => {
    const exp = new Date(d.expiresAt);
    return `${exp.getFullYear()}-${String(exp.getMonth() + 1).padStart(2, '0')}-${String(exp.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="cal-section">
      <div className="cal-section-header">
        <div className="cal-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          校准管理
        </div>
        <span className="cal-view-all" title="即将上线">
          查看全部 →
        </span>
      </div>

      <div className="cal-stats">
        <StatCard
          variant="expired"
          count={expiredCount}
          label="已过期设备"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
        <StatCard
          variant="critical"
          count={criticalCount}
          label="30天内到期"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          variant="normal"
          count={normalCount}
          label="状态正常"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
      </div>

      <div className="cal-timeline">
        {sorted.map((device) => (
          <div
            key={device.id}
            className={`cal-timeline-row ${device.status}`}
            onClick={() => setSelectedDevice(device)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedDevice(device);
              }
            }}
          >
            <span className="cal-device-name">{device.name}</span>
            <div className="cal-progress-bar">
              <div
                className="cal-progress-fill"
                style={{ width: `${mounted ? progressPercent(device) : 0}%` }}
              />
            </div>
            <span className="cal-expires-date">{expiresLabel(device)}</span>
            <span className="cal-days-badge">{daysLabel(device)}</span>
          </div>
        ))}
      </div>

      {selectedDevice && (
        <CalibrationDetailModal
          device={selectedDevice}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
