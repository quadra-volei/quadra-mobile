import { Text, View } from 'react-native';

export type LevelBarProps = {
  /** Player level ("Level 15"). */
  level: number;
  /** Current XP toward the next level. */
  xp: number;
  /** XP needed to reach the next level. */
  xpToNext: number;
  testID?: string;
};

/** Formats an integer with thousands separators (pt-BR dot): 2450 -> "2.450". */
function formatXp(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Labeled XP progress bar: "Level N" + a track/fill bar + an "XP a / b" caption.
 * Track is `bg-bg-light-alt`; fill is lime `bg-accent` per the S8 mockup. The
 * fill width is the only inline style (a runtime percentage NativeWind can't
 * express) — no colors are inlined. Receives plain data via props.
 *
 * First needed by S8 ("Seu progresso" card); reused on profile/ranking surfaces.
 */
export function LevelBar({ level, xp, xpToNext, testID }: LevelBarProps) {
  const ratio = xpToNext > 0 ? Math.min(Math.max(xp / xpToNext, 0), 1) : 0;
  const widthPct = `${Math.round(ratio * 100)}%` as const;

  return (
    <View testID={testID}>
      <View className="flex-row items-center justify-between">
        <Text className="font-num text-text-primary text-body">Level {level}</Text>
        <Text className="font-body text-caption text-text-muted">
          XP: {formatXp(xp)} / {formatXp(xpToNext)}
        </Text>
      </View>
      <View className="h-2 rounded-pill bg-bg-light-alt mt-2 overflow-hidden">
        <View className="h-2 rounded-pill bg-accent" style={{ width: widthPct }} />
      </View>
    </View>
  );
}
