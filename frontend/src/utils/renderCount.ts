export type RenderProbeId = 'comparison-cell' | 'notification-row' | 'weather-display' | 'tab-nav';

const counts = new Map<RenderProbeId, number>();

/**
 * Dev-only render counter that makes the memoisation tests observable. The production build replaces
 * `import.meta.env.PROD` with `true`, so the body is reduced to an empty return and Rollup drops the map.
 */
export function recordRender(id: RenderProbeId): void {
  if (import.meta.env.PROD) {
    return;
  }
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

export function renderCount(id: RenderProbeId): number {
  return counts.get(id) ?? 0;
}

export function resetRenderCounts(): void {
  counts.clear();
}
