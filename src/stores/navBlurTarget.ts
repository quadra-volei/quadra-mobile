import { useFocusEffect } from 'expo-router';
import { type RefObject, useCallback } from 'react';
import type { View } from 'react-native';
import { create } from 'zustand';

/**
 * The floating tab bar (`app/(tabs)/_layout.tsx`) renders once over all four
 * tab screens, but Android's `dimezisBlurView` needs a `blurTarget` — the exact
 * view to sample and blur behind the glass. Each screen already wraps its scroll
 * content in a `<BlurTargetView>` (for `GlassHeader`); this store lets the
 * focused screen publish that same ref so the shared tab bar can blur it too.
 *
 * Not persisted — it holds a live component ref, meaningful only for the current
 * session/route. iOS ignores this entirely (it blurs natively).
 */
type NavBlurTargetState = {
  target: RefObject<View | null> | null;
  setTarget: (target: RefObject<View | null> | null) => void;
};

export const useNavBlurTargetStore = create<NavBlurTargetState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}));

/**
 * Publishes a screen's `BlurTargetView` ref as the active tab-bar blur target
 * while that screen is focused. Call once per tab screen with the same ref it
 * passes to `GlassHeader`.
 */
export function useRegisterNavBlurTarget(target: RefObject<View | null>) {
  const setTarget = useNavBlurTargetStore((s) => s.setTarget);
  useFocusEffect(
    useCallback(() => {
      setTarget(target);
    }, [setTarget, target]),
  );
}
