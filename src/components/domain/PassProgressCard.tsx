import { ChevronRight } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { CardPiecesMini } from '@/components/domain/CardPiecesMini';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { piecesWaiting, piecesWon, useSeasonPass } from '@/features/pass/api/seasonPass';
import { PIECE_COUNT } from '@/features/pass/lib/cardPieces';
import { seasonStatus } from '@/features/pass/lib/seasonText';
import { colors } from '@/theme/colors';

/**
 * The season pass on the Home (DECISIONS #194): the season card's outline with
 * the pieces won, how many, the points to the next one, and the way into the
 * pass. For a player without the paid track, the pieces reached show as
 * waiting ("8 pedaços esperando por você"). Nothing when no season is set up
 * or the pass cannot load: it is an extra, not something to retry.
 */
export function PassProgressCard({ onPress }: { onPress: () => void }) {
  const { data: pass, isPending } = useSeasonPass();

  if (isPending) {
    return <SkeletonBlock className="mx-4 mt-2 h-28" />;
  }
  if (!pass) {
    return null;
  }

  const won = piecesWon(pass);
  const waiting = piecesWaiting(pass);
  const toNext = (pass.level + 1) * pass.pointsPerLevel - pass.points;
  const line =
    pass.status === 'Upcoming'
      ? 'Seus pontos de partida montam a carta da temporada'
      : waiting > 0
        ? `${waiting} ${waiting === 1 ? 'pedaço esperando' : 'pedaços esperando'} por você`
        : won >= PIECE_COUNT
          ? 'Carta completa'
          : pass.status === 'Ended'
            ? 'Temporada encerrada'
            : `Faltam ${toNext} pts para o próximo pedaço`;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Passe da temporada: ${won} de ${PIECE_COUNT} pedaços. ${line}`}
      onPress={onPress}
      testID="pass-card"
      className="mx-4 mt-2 flex-row items-center gap-4 rounded-card bg-surface-dark p-4"
    >
      <CardPiecesMini collected={won} width={52} />
      <View className="flex-1">
        <Text className="font-body-bold text-caption text-accent-light">{`${pass.name} · ${seasonStatus(pass)}`}</Text>
        <Text className="font-num text-h1 text-text-on-dark mt-1">{`${won} de ${PIECE_COUNT} pedaços`}</Text>
        <Text className={`font-body text-caption mt-1 ${waiting > 0 ? 'text-accent-light' : 'text-white/60'}`}>{line}</Text>
        <View className="mt-3 flex-row gap-1">
          {Array.from({ length: PIECE_COUNT }, (_, i) => (
            <View
              key={i}
              className={`h-1 flex-1 rounded-full ${i < won ? 'bg-accent-light' : i < won + waiting ? 'bg-accent-light/40' : 'bg-white/15'}`}
            />
          ))}
        </View>
      </View>
      <ChevronRight size={20} color={colors.textOnDark} />
    </PressableScale>
  );
}
