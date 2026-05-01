export type PermeabilitySpecimenStatus = 'normal' | 'watch' | 'alert';

export interface PermeabilitySpecimenState {
  id: string;
  label: string;
  status: PermeabilitySpecimenStatus;
  confidence: number;
}

export interface PermeabilityStage {
  id: string;
  label: string;
  timestamp: string;
  imagePath: string;
  abnormalSpecimenId: string | null;
  summary: string;
  specimens: PermeabilitySpecimenState[];
}

const BASE_SPECIMENS = [
  { id: 'specimen-1', label: '1 号试块' },
  { id: 'specimen-2', label: '2 号试块' },
  { id: 'specimen-3', label: '3 号试块' },
  { id: 'specimen-4', label: '4 号试块' },
  { id: 'specimen-5', label: '5 号试块' },
  { id: 'specimen-6', label: '6 号试块' },
] as const;

function buildSpecimens(activeId: string | null, mode: PermeabilitySpecimenStatus) {
  return BASE_SPECIMENS.map((specimen) => {
    if (specimen.id !== activeId) {
      return {
        ...specimen,
        status: 'normal' as const,
        confidence: 0.08,
      };
    }

    return {
      ...specimen,
      status: mode,
      confidence: mode === 'watch' ? 0.68 : mode === 'alert' ? 0.92 : 0.08,
    };
  });
}

const TIMELINE: PermeabilityStage[] = [
  {
    id: 'baseline',
    label: 'T0 基线',
    timestamp: '实验开始前',
    imagePath: '/origin.png',
    abnormalSpecimenId: null,
    summary: '6 组试块处于初始干态，边缘无可疑渗水带，系统完成 ROI 建立。',
    specimens: buildSpecimens(null, 'normal'),
  },
  {
    id: 'wet-1',
    label: 'T1 识别启始',
    timestamp: '09:03',
    imagePath: '/wet1.jpg',
    abnormalSpecimenId: 'specimen-4',
    summary: '算法在 4 号试块边缘检测到微弱湿痕，进入持续观察。',
    specimens: buildSpecimens('specimen-4', 'watch'),
  },
  {
    id: 'wet-2',
    label: 'T2 异常升级',
    timestamp: '09:04',
    imagePath: '/wet2.jpg',
    abnormalSpecimenId: 'specimen-4',
    summary: '4 号试块边缘渗水范围扩大，连续帧一致，预警等级上调。',
    specimens: buildSpecimens('specimen-4', 'watch'),
  },
  {
    id: 'wet-3',
    label: 'T3 最终判定',
    timestamp: '09:07',
    imagePath: '/wet3.jpg',
    abnormalSpecimenId: 'specimen-4',
    summary: '4 号试块边缘连续渗水成立，建议判定异常并复核样品密实度。',
    specimens: buildSpecimens('specimen-4', 'alert'),
  },
];

export function buildPermeabilityTimeline() {
  return TIMELINE;
}

export function getPermeabilityStageById(id: string) {
  return TIMELINE.find((stage) => stage.id === id) ?? TIMELINE[0];
}

export function getPermeabilityAlertCount(stage: PermeabilityStage) {
  return stage.specimens.filter((specimen) => specimen.status === 'alert').length;
}
