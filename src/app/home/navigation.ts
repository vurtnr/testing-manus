export function getCapabilityDestination(id: string): string | null {
  if (id === 'inspection') return '/review-tasks';
  if (id === 'knowledge') return '/knowledge';
  return null;
}

export function getScenarioDestination(name: string): string | null {
  if (name === '报告审核场景') return '/review-tasks';
  if (name === '标准检索场景') return '/knowledge';
  return null;
}
