import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCapabilityDestination,
  getScenarioDestination,
} from './navigation.ts';

test('inspection capability routes to review queue workspace', () => {
  assert.equal(getCapabilityDestination('inspection'), '/review-tasks');
  assert.equal(getCapabilityDestination('knowledge'), '/knowledge');
  assert.equal(getCapabilityDestination('monitoring'), null);
});

test('report review scenario routes to review queue workspace', () => {
  assert.equal(getScenarioDestination('报告审核场景'), '/review-tasks');
  assert.equal(getScenarioDestination('标准检索场景'), '/knowledge');
  assert.equal(getScenarioDestination('合同评审场景'), null);
});
