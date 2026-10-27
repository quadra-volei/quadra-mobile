import { useCallback } from 'react';
import type { View } from 'react-native';

import type { TourTargetId } from '@/features/tour/tourSteps';

export type TourRect = { x: number; y: number; width: number; height: number };

// The mounted view of each target. The tab bar remounts with the tabs
// (location granted, DECISIONS #188), so the latest view wins.
const targets = new Map<TourTargetId, View>();

/**
 * Marks a view as a tour target: pass the returned ref to a plain `View`
 * (`collapsable={false}`, so Android keeps it to measure). No id, no target.
 */
export function useTourTarget(id: TourTargetId | undefined) {
  return useCallback(
    (view: View | null) => {
      if (!id) return;
      if (view) {
        targets.set(id, view);
      } else if (targets.get(id) === view) {
        targets.delete(id);
      }
    },
    [id],
  );
}

// How long a measure may take before the target counts as not on screen.
const MEASURE_TIMEOUT_MS = 500;

function measureInWindow(view: View): Promise<TourRect | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), MEASURE_TIMEOUT_MS);
    view.measureInWindow((x, y, width, height) => {
      clearTimeout(timer);
      resolve({ x, y, width, height });
    });
  });
}

/**
 * Where the target is, relative to `origin` (the overlay drawing the hole):
 * both are measured in the same window and subtracted, so the bars and insets
 * cancel out. Null when the target is not mounted, has no size, or does not answer.
 */
export async function measureTourTarget(id: TourTargetId, origin: View | null): Promise<TourRect | null> {
  const view = targets.get(id);
  if (!view) return null;
  const [target, base] = await Promise.all([
    measureInWindow(view),
    origin ? measureInWindow(origin) : Promise.resolve({ x: 0, y: 0, width: 0, height: 0 }),
  ]);
  if (!target || !base || target.width <= 0 || target.height <= 0) return null;
  return { x: target.x - base.x, y: target.y - base.y, width: target.width, height: target.height };
}
