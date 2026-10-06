import { ChevronRight, Volleyball } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { RecentMatch } from '@/features/profile/types/profile';
import { colors } from '@/theme/colors';

export type MatchHistoryRowProps = {
  match: RecentMatch;
  onPress: (id: string) => void;
  testID?: string;
};

const RESULT_LABEL: Record<RecentMatch['result'], string> = {
  VITORIA: 'VITÓRIA',
  DERROTA: 'DERROTA',
};

// Win → success (green), Loss → danger (red). NativeWind tokens, no inline hex.
const RESULT_CLASS: Record<RecentMatch['result'], string> = {
  VITORIA: 'text-success',
  DERROTA: 'text-danger',
};

/**
 * Formats an ISO timestamp relative to today as "Hoje · 19h30" / "Ontem · 19h30"
 * / "20/06". Pure, no external date lib (mirrors MatchCardCompact's formatter).
 */
function formatPlayedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
  );

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}h${mm}`;

  if (dayDiff === 0) return `Hoje · ${time}`;
  if (dayDiff === 1) return `Ontem · ${time}`;

  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo}`;
}

/**
 * Slim recent-match result row for the S8 "MINHAS PARTIDAS" list: a small icon,
 * the match name + "date · format" subtitle, a right-aligned Vitória/Derrota
 * label (success/danger) over the set score (`font-num`), and a chevron. Single
 * `accessibilityRole="button"` target. Receives plain data via props; never
 * fetches. No hardcoded hex — the icon colors come from `src/theme/colors.ts`.
 */
export function MatchHistoryRow({ match, onPress, testID }: MatchHistoryRowProps) {
  const subtitle = `${formatPlayedAt(match.playedAt)} · ${match.format}`;

  return (
    <Pressable
      onPress={() => onPress(match.id)}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${match.name}, ${RESULT_LABEL[match.result]} ${match.setScore}`}
      className="flex-row items-center px-4 py-3"
    >
      <View className="h-10 w-10 rounded-full bg-bg-light-alt items-center justify-center">
        <Volleyball size={20} color={colors.surfaceDark} />
      </View>

      <View className="flex-1 ml-3">
        <Text className="font-body text-body-bold text-text-primary" numberOfLines={1}>
          {match.name}
        </Text>
        <Text className="font-body text-caption text-text-muted">{subtitle}</Text>
      </View>

      <View className="items-end mr-2">
        <Text className={`font-mono text-mono uppercase ${RESULT_CLASS[match.result]}`}>
          {RESULT_LABEL[match.result]}
        </Text>
        <Text className="font-num text-text-primary text-body">{match.setScore}</Text>
      </View>

      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}
