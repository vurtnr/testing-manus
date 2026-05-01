export interface HomeFinancePoint {
  label: string;
  isoDate: string;
  contractAmount: number;
  collectedAmount: number;
  receivableAmount: number;
  outputValue: number;
}

export interface HomeFinanceSnapshot {
  rangeLabel: string;
  series: HomeFinancePoint[];
  summary: {
    contractAmount: number;
    collectedAmount: number;
    receivableAmount: number;
    outputValue: number;
  };
}

const SERIES_BLUEPRINT = [
  { label: '01-03', contractAmount: 900_000, collectedAmount: 260_000, outputValue: 520_000 },
  { label: '01-10', contractAmount: 1_700_000, collectedAmount: 620_000, outputValue: 1_100_000 },
  { label: '01-17', contractAmount: 2_600_000, collectedAmount: 980_000, outputValue: 1_680_000 },
  { label: '01-24', contractAmount: 3_500_000, collectedAmount: 1_360_000, outputValue: 2_250_000 },
  { label: '01-31', contractAmount: 4_300_000, collectedAmount: 1_620_000, outputValue: 2_820_000 },
  { label: '02-07', contractAmount: 4_900_000, collectedAmount: 1_850_000, outputValue: 3_140_000 },
  { label: '02-14', contractAmount: 5_800_000, collectedAmount: 2_280_000, outputValue: 3_820_000 },
  { label: '02-21', contractAmount: 6_900_000, collectedAmount: 2_880_000, outputValue: 4_650_000 },
  { label: '02-28', contractAmount: 8_100_000, collectedAmount: 3_520_000, outputValue: 5_620_000 },
  { label: '03-07', contractAmount: 9_600_000, collectedAmount: 4_260_000, outputValue: 6_850_000 },
  { label: '03-14', contractAmount: 11_200_000, collectedAmount: 5_100_000, outputValue: 8_120_000 },
  { label: '03-21', contractAmount: 12_900_000, collectedAmount: 6_140_000, outputValue: 9_600_000 },
  { label: '03-28', contractAmount: 14_500_000, collectedAmount: 7_260_000, outputValue: 10_900_000 },
  { label: '04-04', contractAmount: 15_900_000, collectedAmount: 8_320_000, outputValue: 11_980_000 },
  { label: '04-11', contractAmount: 17_200_000, collectedAmount: 9_560_000, outputValue: 12_980_000 },
  { label: '04-22', contractAmount: 18_600_000, collectedAmount: 11_200_000, outputValue: 13_900_000 },
] as const;

function formatIsoDateFor2026(label: string) {
  return `2026-${label}`;
}

function formatDateRange(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-01-01 至 ${year}-${month}-${day}`;
}

export function buildHomeFinanceBandSnapshot(today: Date = new Date()): HomeFinanceSnapshot {
  const series = SERIES_BLUEPRINT.map((point) => ({
    ...point,
    isoDate: formatIsoDateFor2026(point.label),
    receivableAmount: point.contractAmount - point.collectedAmount,
  }));

  const latest = series.at(-1)!;

  return {
    rangeLabel: formatDateRange(today),
    series,
    summary: {
      contractAmount: latest.contractAmount,
      collectedAmount: latest.collectedAmount,
      receivableAmount: latest.receivableAmount,
      outputValue: latest.outputValue,
    },
  };
}

export function formatCompactCny(amount: number) {
  if (amount >= 1_000_000) {
    return `¥${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `¥${Math.round(amount / 1_000)}K`;
  }
  return `¥${amount}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
