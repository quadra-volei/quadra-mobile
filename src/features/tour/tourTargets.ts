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

/** Where the target is on the screen; null when it is not mounted. */
export function measureTourTarget(id: TourTargetId): Promise<TourRect | null> {
  const view = targets.get(id);
  if (!view) return Promise.resolve(null);
  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) =>
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
    );
  });
}
