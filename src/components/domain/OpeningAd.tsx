import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { IconDivulgar, IconFechar } from '@/components/icons/quadra';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { adLinkUrl, openAd, recordAdView, useServedAd } from '@/features/ads/api/ads';
import { useDeviceCoords } from '@/features/matches/lib/useDeviceCoords';
import { useTourStore } from '@/features/tour/tourStore';
import { HARD_SHADOW, colors } from '@/theme/colors';

/** The same opening ad shows again only after a week. */
export const OPENING_AD_EVERY_MS = 7 * 24 * 60 * 60_000;
/** Wait for the first-access tour to open, if it is going to, before deciding. */
const SETTLE_MS = 4000;

type OpeningAdState = {
  shownAt: Record<string, number>;
  markShown: (adId: string, at: number) => void;
};

// Persisted to AsyncStorage: a non-secret UI preference (CLAUDE.md).
export const useOpeningAdStore = create<OpeningAdState>()(
  persist(
    (set) => ({
      shownAt: {},
      markShown: (adId, at) => set((s) => ({ shownAt: { ...s.shownAt, [adId]: at } })),
    }),
    { name: 'quadra.prefs.openingAd', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Whether the ad may show now: never shown, or shown more than a week ago. */
export function openingAdDue(shownAt: Record<string, number>, adId: string, now: number): boolean {
  const last = shownAt[adId];
  return last == null || now - last >= OPENING_AD_EVERY_MS;
}

/**
 * The opening card (DECISIONS #200): an ad on the air around the player, shown over the tabs when
 * the app opens, at most once a week per ad, never while the location prompt or the tour is up.
 */
export function OpeningAd({ ready }: { ready: boolean }) {
  const ad = useServedAd('Opening', useDeviceCoords());
  const tourPhase = useTourStore((s) => s.phase);
  const { shownAt, markShown } = useOpeningAdStore();
  const [settled, setSettled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  const data = ad.data;
  useEffect(() => {
    if (!settled || !data || tourPhase !== 'closed' || visible) return;
    const now = Date.now();
    if (!openingAdDue(shownAt, data.id, now)) return;
    markShown(data.id, now);
    void recordAdView(data.id, 'Impression');
    setVisible(true);
  }, [settled, data, tourPhase, shownAt, markShown, visible]);

  if (!data || !visible) return null;

  const close = () => setVisible(false);
  const hasLink = adLinkUrl(data) != null || data.linkKind === 'Arena';

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View className="flex-1 items-center justify-center bg-surface-dark/70 px-6" testID="opening-ad">
        <View className="w-full overflow-hidden rounded-card border-2 border-surface-dark bg-white" style={HARD_SHADOW}>
          {data.photoUrl ? (
            <Image source={{ uri: data.photoUrl }} style={{ width: '100%', height: 180 }} contentFit="cover" />
          ) : (
            <View className="h-32 items-center justify-center bg-surface-dark">
              <IconDivulgar size={40} color={colors.accent} />
            </View>
          )}
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Fechar anúncio"
            testID="opening-ad-close"
            className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-white"
          >
            <IconFechar size={18} color={colors.surfaceDark} />
          </Pressable>
          <View className="p-4">
            <View className="flex-row">
              <Tag bg={colors.bgLightAlt} color={colors.textMuted}>
                Patrocinado
              </Tag>
            </View>
            <Text className="mt-2 font-body-extrabold text-h3 text-text-primary">{data.title}</Text>
            {data.body ? <Text className="mt-1 font-body text-body text-text-muted">{data.body}</Text> : null}
            <View className="mt-4 gap-2">
              {hasLink ? (
                <Button
                  variant="grad"
                  onPress={() => {
                    close();
                    openAd(data);
                  }}
                  testID="opening-ad-open"
                >
                  Quero saber mais
                </Button>
              ) : null}
              <Button variant="ghost" onPress={close}>
                Agora não
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
