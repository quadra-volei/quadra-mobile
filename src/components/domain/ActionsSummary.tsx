import { Text, View } from 'react-native';

import { PLAYER_ACTIONS } from '@/features/matches/lib/playerActions';
import type { ProfileActions } from '@/features/profile/types/profile';

/** "1,5" — one decimal, Brazilian comma; "—" when the action was never recorded. */
export function formatPerMatch(value: number | null): string {
  return value == null ? '—' : value.toFixed(1).replace('.', ',');
}

/**
 * A player's recorded actions (API DECISIONS #85), the same numbers wherever
 * they show: per action the total (volume) and, below, the average per match.
 * With no stats sheet yet, one neutral line instead of zeros.
 */
export function ActionsSummary({
  actions,
  tone = 'light',
  testID,
}: {
  actions: ProfileActions;
  tone?: 'light' | 'dark';
  testID?: string;
}) {
  const muted = tone === 'dark' ? 'text-white/60' : 'text-text-muted';
  const ink = tone === 'dark' ? 'text-text-on-dark' : 'text-text-primary';

  if (actions.matches === 0) {
    return (
      <Text className={`font-body text-caption ${muted}`} testID={testID}>
        Nenhuma estatística registrada ainda.
      </Text>
    );
  }

  return (
    <View testID={testID}>
      <View className="flex-row">
        {PLAYER_ACTIONS.map(({ key, short, label }) => {
          const { total, perMatch } = actions.byAction[key];
          return (
            <View
              key={key}
              className="flex-1 items-center"
              accessible
              accessibilityLabel={`${label}: ${total}, ${formatPerMatch(perMatch)} por partida`}
            >
              <Text className={`font-mono text-mono uppercase ${muted}`}>{short}</Text>
              <Text className={`font-num text-h3 ${ink}`}>{total}</Text>
              <Text className={`font-body text-caption ${muted}`}>{formatPerMatch(perMatch)}</Text>
            </View>
          );
        })}
      </View>
      <Text className={`mt-2 text-center font-body text-caption ${muted}`}>
        Total e média por partida · {actions.matches} {actions.matches === 1 ? 'partida' : 'partidas'} com estatísticas
      </Text>
    </View>
  );
}
