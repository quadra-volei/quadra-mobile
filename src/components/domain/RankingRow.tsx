import { ArrowDown, ArrowUp, Minus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import type { RankingRow as RankingRowData } from '@/features/ranking/types/ranking';
import { colors } from '@/theme/colors';

export type RankingRowProps = {
  /** A ranking row (incl. the optional `trend`) from the shared ranking types. */
  row: RankingRowData;
  /** Derived by the screen from `useAuthStore().userId === row.playerId`. */
  isMe: boolean;
  testID?: string;
};

const ICON_SIZE = 14;

/** Maps the trend direction to its lucide arrow, semantic color, and a11y word. */
function TrendBadge({ trend }: { trend: RankingRowData['trend'] }) {
  const direction = trend?.direction ?? 'flat';

  if (direction === 'up') {
    return (
      <View className="flex-row items-center gap-1">
        <ArrowUp size={ICON_SIZE} color={colors.success} />
        <Text className="font-num text-success text-caption">{trend?.delta ?? 0}</Text>
      </View>
    );
  }
  if (direction === 'down') {
    return (
      <View className="flex-row items-center gap-1">
        <ArrowDown size={ICON_SIZE} color={colors.danger} />
        <Text className="font-num text-danger text-caption">{trend?.delta ?? 0}</Text>
      </View>
    );
  }
  return <Minus size={ICON_SIZE} color={colors.textMuted} />;
}

function trendLabel(trend: RankingRowData['trend']): string {
  if (!trend || trend.direction === 'flat') return 'estável';
  if (trend.direction === 'up') return `subiu ${trend.delta}`;
  return `caiu ${trend.delta}`;
}

/**
 * Single non-navigable row of the S9 full group ranking: position number,
 * avatar, name (appends "· você" when `isMe`), `@handle · Posição` subtitle,
 * score, and a trend indicator (↑ success / ↓ danger / — muted).
 *
 * The current-user row gets a subtle `bg-primary/10` highlight + rounded
 * container. Rows are display-only here (no `accessibilityRole="button"`); a
 * single `accessibilityLabel` announces position/name/score/trend (+ "você").
 * Receives plain data via props; never fetches.
 */
export function RankingRow({ row, isMe, testID }: RankingRowProps) {
  return (
    <View
      testID={testID}
      accessibilityLabel={`${row.position}º, ${row.name}${
        isMe ? ', você' : ''
      }, ${row.score} pontos, ${trendLabel(row.trend)}`}
      className={`flex-row items-center px-4 py-3 ${
        isMe ? 'bg-primary/10 rounded-card' : ''
      }`}
    >
      <Text className="font-num text-primary text-body w-8">{row.position}</Text>
      <Avatar name={row.name} size="sm" />
      <View className="flex-1 ml-3">
        <Text className="font-body text-body-bold text-text-primary">
          {row.name}
          {isMe ? <Text className="text-primary"> · você</Text> : null}
        </Text>
        <Text className="font-body text-caption text-text-muted">{row.subtitle}</Text>
      </View>
      <View className="items-end">
        <Text className="font-num text-primary text-body">{row.score}</Text>
        <View className="mt-1">
          <TrendBadge trend={row.trend} />
        </View>
      </View>
    </View>
  );
}
