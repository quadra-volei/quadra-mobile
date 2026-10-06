import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import {
  type LiveGame,
  useAddPoint,
  useEndGame,
  useEndSet,
  useLiveGame,
  useStartSet,
  useUndoPoint,
} from '@/features/matches/api/liveGame';
import { getTeamBgColor } from '@/features/matches/lib/teamColors';
import { useScoreSubscription } from '@/features/matches/realtime/useScoreSubscription';
import { colors } from '@/theme/colors';

/**
 * S13.5 + S14 — Set Team Picker → Live Scoreboard.
 *
 * One route, driven by where the game is on the backend (`useLiveGame`):
 * - NOT_STARTED / PICK_NEXT — the organizer picks the two teams that go on
 *   court (S13.5); everyone else waits. With exactly two teams there is nothing
 *   to pick: the game is started from the teams screen and sets follow by
 *   themselves.
 * - PLAYING — the live scoreboard (S14): the organizer scores, undoes the last
 *   point and may end the set early; everyone else watches it update live.
 * - ENDED — on to the MVP vote.
 *
 * Route param: id (match id).
 */
export default function ScoreboardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const matchId = id ?? '';

  const gameQuery = useLiveGame(matchId);
  // Live updates for everyone on this screen (players watching, and the
  // organizer's other devices).
  useScoreSubscription(matchId);

  if (gameQuery.isPending) {
    return (
      <Centered>
        <Text className="text-body text-text-on-dark">Carregando...</Text>
      </Centered>
    );
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <Centered>
        <Text className="text-center text-body text-text-muted mb-6">
          Não foi possível carregar a partida
        </Text>
        <Button
          variant="outline"
          onPress={() => void gameQuery.refetch()}
          testID="retry-load"
        >
          Tentar novamente
        </Button>
      </Centered>
    );
  }

  const game = gameQuery.data;

  if (game.phase === 'ENDED') {
    return <GameOver matchId={matchId} game={game} />;
  }
  if (game.phase === 'PLAYING' && game.pair) {
    return <LiveScoreboard matchId={matchId} game={game} pair={game.pair} />;
  }
  if (game.isOrganizer && game.teams.length >= 2) {
    return <SetTeamPicker matchId={matchId} game={game} />;
  }
  return (
    <Centered>
      <Text
        className="text-center text-body text-text-muted mb-6"
        testID="waiting-game"
      >
        {game.phase === 'PICK_NEXT'
          ? 'Aguardando quem organiza escolher os times do próximo set.'
          : game.isOrganizer
            ? 'Monte os times antes de começar a partida.'
            : 'A partida ainda não começou.'}
      </Text>
      <Button variant="outline" onPress={() => router.back()}>
        Voltar
      </Button>
    </Centered>
  );
}

/** Full-screen centered dark container for the loading / error / waiting states. */
function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
        {children}
      </SafeAreaView>
    </View>
  );
}

function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      testID="scoreboard-back"
    >
      <ChevronLeft size={24} color={colors.textOnDark} />
    </Pressable>
  );
}

/**
 * S13.5 — the organizer picks the two teams of the next set. The winner of the
 * last set is flagged ("continua em quadra") but not forced.
 */
function SetTeamPicker({ matchId, game }: { matchId: string; game: LiveGame }) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const startSet = useStartSet(matchId);
  const endGame = useEndGame(matchId);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((selected) => selected !== teamId);
      }
      return prev.length < 2 ? [...prev, teamId] : prev;
    });
  };

  const teamName = (teamId: string | undefined) =>
    game.teams.find((team) => team.id === teamId)?.name ?? '';

  const handleStartSet = () => {
    const [first, second] = selectedTeamIds;
    if (!first || !second) return;
    startSet.mutate([first, second], {
      onError: (error) => Alert.alert('Não foi possível começar o set', error.message),
    });
  };

  const handleEndGame = () => {
    Alert.alert('Encerrar a partida?', 'Vence o time com mais sets.', [
      { text: 'Continuar jogando', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: () =>
          endGame.mutate(undefined, {
            onError: (error) => Alert.alert('Não foi possível encerrar', error.message),
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* ── Header bar ── */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-line/20">
          <BackButton />
          <Text className="text-eyebrow text-text-muted uppercase">
            SET {game.setNumber} - MELHOR DE {game.bestOf}
          </Text>
          <View className="w-6" />
        </View>

        {/* ── Hero section ── */}
        <View className="px-4 pt-6 pb-4">
          <Text className="font-display text-display text-text-on-dark uppercase">
            Quem joga este set?
          </Text>
          <Text className="text-body text-text-muted mt-2">
            Selecione os dois times que entram em quadra agora
          </Text>
        </View>

        {/* ── Team selection list ── */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerClassName="gap-3 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {game.teams.map((team, teamIndex) => {
            const isSelected = selectedTeamIds.includes(team.id);
            const selectionOrder = isSelected ? selectedTeamIds.indexOf(team.id) + 1 : null;
            const wonPreviousSet = game.lastSetWinnerId === team.id;
            const setsWon = game.setsWon[team.id] ?? 0;

            return (
              <Pressable
                key={team.id}
                onPress={() => toggleTeamSelection(team.id)}
                disabled={selectedTeamIds.length === 2 && !isSelected}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${team.name}${isSelected ? ` selecionado ${selectionOrder}` : ''}`}
                className={`rounded-card border px-4 py-3 flex-row items-center justify-between ${
                  isSelected
                    ? 'bg-surface-dark-alt border-primary'
                    : 'bg-surface-dark-alt border-line/20'
                }`}
                testID={`team-row-${team.number}`}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  {/* Team badge (color-coded) */}
                  <View
                    className={`h-10 w-10 rounded-full items-center justify-center ${getTeamBgColor(
                      teamIndex,
                    )}`}
                  >
                    <Text className="font-num text-sm font-bold text-text-on-dark">
                      {team.number}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-body-bold text-text-on-dark">{team.name}</Text>
                    {wonPreviousSet ? (
                      <Text className="text-caption text-accent mt-1">
                        Venceu o set e continua em quadra
                      </Text>
                    ) : (
                      <Text className="text-caption text-text-muted mt-1">
                        {team.players.length} jogadores
                        {setsWon > 0 ? ` · ${setsWon} set${setsWon === 1 ? '' : 's'}` : ''}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Selection indicator */}
                {isSelected ? (
                  <View className="h-6 w-6 rounded-full bg-primary items-center justify-center">
                    <Text className="text-mono text-xs font-bold text-text-on-dark">
                      {selectionOrder}
                    </Text>
                  </View>
                ) : (
                  <View className="h-6 w-6 rounded-full border-2 border-line/40" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Footer: pairing pill + CTA ── */}
        <View className="px-4 py-4 border-t border-line/20 gap-3">
          {selectedTeamIds.length === 2 ? (
            <View className="bg-surface-dark-alt rounded-pill px-4 py-3 items-center border border-line/20">
              <Text className="text-body-bold text-text-on-dark">
                {teamName(selectedTeamIds[0])} vs {teamName(selectedTeamIds[1])}
              </Text>
            </View>
          ) : (
            <Text className="text-caption text-text-muted text-center">
              Selecione {2 - selectedTeamIds.length} time{selectedTeamIds.length === 1 ? '' : 's'}
            </Text>
          )}

          <Button
            variant="grad"
            disabled={selectedTeamIds.length !== 2}
            loading={startSet.isPending}
            onPress={handleStartSet}
            testID="start-set-button"
          >
            {game.phase === 'PICK_NEXT' ? 'Começar set' : 'Começar partida'}
          </Button>

          {/* Between sets the organizer may call it a day. */}
          {game.phase === 'PICK_NEXT' ? (
            <Button
              variant="ghost"
              onPress={handleEndGame}
              loading={endGame.isPending}
              testID="end-game-button"
            >
              Encerrar partida
            </Button>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** "MM:SS" since `startedAt`, ticking every second. */
function useElapsed(startedAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = startedAt
    ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
    : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * S14 — the live scoreboard of the set on court.
 * Organizer: "+ ponto" per team, Desfazer (last point), Encerrar set (the team
 * ahead takes it). Everyone else: read-only, updated live.
 */
function LiveScoreboard({
  matchId,
  game,
  pair,
}: {
  matchId: string;
  game: LiveGame;
  pair: NonNullable<LiveGame['pair']>;
}) {
  const addPoint = useAddPoint(matchId);
  const undoPoint = useUndoPoint(matchId);
  const endSet = useEndSet(matchId);
  const elapsed = useElapsed(game.setStartedAt);

  const busy = addPoint.isPending || undoPoint.isPending || endSet.isPending;
  const { setNumber } = game;

  const handleEndSet = () => {
    Alert.alert('Encerrar o set agora?', 'Quem está na frente leva o set.', [
      { text: 'Continuar jogando', style: 'cancel' },
      {
        text: 'Encerrar set',
        onPress: () =>
          endSet.mutate(
            { setNumber },
            { onError: (error) => Alert.alert('Não foi possível encerrar o set', error.message) },
          ),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* ── Header bar: back, AO VIVO badge + timer ── */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-line/10">
          <BackButton />
          <View className="flex-col items-center">
            <View className="flex-row items-center gap-1 mb-1">
              <View className="h-2 w-2 rounded-full bg-danger" />
              <Text className="text-eyebrow text-danger uppercase">AO VIVO</Text>
              <Text className="text-caption text-text-muted ml-1">{elapsed}</Text>
            </View>
            <Text className="text-caption text-text-muted">
              {game.matchName} · Set {setNumber} melhor de {game.bestOf}
            </Text>
          </View>
          {/* Spacer to keep the AO VIVO block centered opposite the back button */}
          <View className="w-6" />
        </View>

        {/* ── Main score display: two teams side by side ── */}
        <View className="flex-1 flex-row gap-4 px-4 py-8">
          {pair.map((team, index) => (
            <View key={team.id} className="flex-1 flex-col items-center">
              <Text className="text-h1 text-text-on-dark uppercase mb-1">{team.name}</Text>
              <Text className="text-caption text-text-muted mb-4">
                {game.setsWon[team.id] ?? 0} sets
              </Text>

              <View className="h-24 w-24 bg-white rounded-card items-center justify-center mb-4">
                <Text
                  className="font-num text-display text-primary"
                  testID={`score-team${index + 1}`}
                >
                  {game.scores[index]}
                </Text>
              </View>

              {game.isOrganizer ? (
                <Pressable
                  onPress={() =>
                    addPoint.mutate(
                      { setNumber, teamId: team.id },
                      { onError: (error) => Alert.alert('Erro ao registrar ponto', error.message) },
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar ponto para ${team.name}`}
                  className="py-2"
                  disabled={busy}
                  testID={`add-point-team${index + 1}`}
                >
                  <Text className="text-body-bold text-accent">+ ponto</Text>
                </Pressable>
              ) : (
                <Text className="text-caption text-text-muted">ao vivo</Text>
              )}
            </View>
          ))}
        </View>

        {/* ── Footer action buttons (organizer only) ── */}
        {game.isOrganizer ? (
          <View className="flex-row gap-3 px-4 pb-4">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() =>
                  undoPoint.mutate(
                    { setNumber },
                    { onError: (error) => Alert.alert('Erro ao desfazer', error.message) },
                  )
                }
                disabled={!game.canUndo || busy}
                testID="undo-button"
              >
                Desfazer
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="grad"
                onPress={handleEndSet}
                loading={endSet.isPending}
                testID="end-set-button"
              >
                Encerrar set
              </Button>
            </View>
          </View>
        ) : null}

        {/* ── Thin progress bar ── */}
        <View className="h-1 bg-accent opacity-40" />
      </SafeAreaView>
    </View>
  );
}

/** The game is over: who won, and on to the MVP vote. */
function GameOver({ matchId, game }: { matchId: string; game: LiveGame }) {
  const winner = game.teams.find((team) => team.id === game.winnerTeamId);
  return (
    <Centered>
      <Text className="text-eyebrow text-accent uppercase">Fim de jogo</Text>
      <Text
        className="mt-2 mb-8 text-center font-display text-display text-text-on-dark uppercase"
        testID="game-over-winner"
      >
        {winner ? `${winner.name} venceu` : 'Partida encerrada'}
      </Text>
      <Button
        variant="grad"
        onPress={() =>
          router.replace({ pathname: '/matches/[id]/mvp-vote', params: { id: matchId } })
        }
        testID="go-mvp-vote"
      >
        Votar no MVP
      </Button>
    </Centered>
  );
}
