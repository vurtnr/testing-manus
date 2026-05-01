import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildHomeFinanceBandSnapshot,
  formatCompactCny,
} from './home-finance-band-data.ts';

test('buildHomeFinanceBandSnapshot returns a stable 2026 YTD finance summary', () => {
  const snapshot = buildHomeFinanceBandSnapshot(new Date('2026-04-22T09:00:00+08:00'));

  assert.equal(snapshot.rangeLabel, '2026-01-01 至 2026-04-22');
  assert.equal(snapshot.summary.contractAmount, 18_600_000);
  assert.equal(snapshot.summary.collectedAmount, 11_200_000);
  assert.equal(snapshot.summary.receivableAmount, 7_400_000);
  assert.equal(snapshot.summary.outputValue, 13_900_000);
  assert.equal(snapshot.series.length, 16);
  assert.equal(snapshot.series.at(-1)?.contractAmount, 18_600_000);
});

test('buildHomeFinanceBandSnapshot keeps receivables equal to contract minus collected at each point', () => {
  const snapshot = buildHomeFinanceBandSnapshot(new Date('2026-04-22T09:00:00+08:00'));

  snapshot.series.forEach((point) => {
    assert.equal(
      point.receivableAmount,
      point.contractAmount - point.collectedAmount
    );
  });
});

test('formatCompactCny formats million-level amounts for KPI display', () => {
  assert.equal(formatCompactCny(18_600_000), '¥18.6M');
  assert.equal(formatCompactCny(7_400_000), '¥7.4M');
  assert.equal(formatCompactCny(980_000), '¥980K');
});
