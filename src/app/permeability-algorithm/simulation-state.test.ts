import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPermeabilityTimeline,
  getPermeabilityAlertCount,
  getPermeabilityStageById,
} from './simulation-state.ts';

test('buildPermeabilityTimeline returns the four simulation stages in order', () => {
  const timeline = buildPermeabilityTimeline();

  assert.deepEqual(
    timeline.map((stage) => stage.id),
    ['baseline', 'wet-1', 'wet-2', 'wet-3']
  );
  assert.equal(timeline[0]?.label, 'T0 基线');
  assert.equal(timeline[0]?.imagePath, '/origin.png');
  assert.equal(timeline[3]?.label, 'T3 最终判定');
});

test('getPermeabilityStageById finds the requested stage and keeps abnormal specimen progression', () => {
  const stage = getPermeabilityStageById('wet-3');

  assert.equal(stage?.abnormalSpecimenId, 'specimen-4');
  assert.equal(stage?.specimens.find((item) => item.id === 'specimen-4')?.status, 'alert');
  assert.equal(stage?.specimens.find((item) => item.id === 'specimen-1')?.status, 'normal');
});

test('getPermeabilityAlertCount counts only alert specimens on the active frame', () => {
  const wet1 = getPermeabilityStageById('wet-1')!;
  const wet3 = getPermeabilityStageById('wet-3')!;

  assert.equal(getPermeabilityAlertCount(wet1), 0);
  assert.equal(getPermeabilityAlertCount(wet3), 1);
});
