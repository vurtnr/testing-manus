import test from 'node:test';
import assert from 'node:assert/strict';

import { runPromisePool } from './promise-pool.ts';

test('runPromisePool respects concurrency limit while completing all tasks', async () => {
  let active = 0;
  let maxActive = 0;

  const items = [1, 2, 3, 4, 5];
  const results = await runPromisePool(items, 2, async (item) => {
    active += 1;
    maxActive = Math.max(maxActive, active);

    await new Promise((resolve) => setTimeout(resolve, 20));

    active -= 1;
    return item * 10;
  });

  assert.deepEqual(results, [10, 20, 30, 40, 50]);
  assert.equal(maxActive, 2);
});
