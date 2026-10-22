import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Trophy } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { dialog } from '@/components/ui/Dialog';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  gameLabel,
  type LiveGame,
  useAddPoint,
  useEndGame,
  useEndSet,
  useLiveGame,
  useStartSet,
  useUndoPoint,
} from '@/features/matches/api/liveGame';
import { getTeamBgColor, getTeamTextOnColor } from '@/features/matches/lib/teamColors';
import { useScoreSubscription } from '@/features/matches/realtime/useScoreSubscription';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

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
 * The whole route is navy: secondary text is `text-white/70` (never
 * `text-text-muted`, which is the muted tone for light surfaces) and buttons
 * are the on-dark variants (`outlineW` / `outlineLime`).
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
    // Shaped like the live board: header, two score panels, the buttons.
    return (
      <View className="flex-1 bg-surface-dark" testID="scoreboard-skeleton">
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 px-4 pt-4 gap-4">
          <SkeletonBlock tone="dark" className="h-6 w-48 self-center" />
          <View className="flex-1 flex-row gap-3">
            <SkeletonBlock tone="dark" className="flex-1" />
            <SkeletonBlock tone="dark" className="flex-1" />
          </View>
          <SkeletonBlock tone="dark" className="h-12" />
        </SafeAreaView>
      </View>
    );
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <Centered>
        <Text className="text-center font-body text-body text-white/70 mb-6">
          Não foi possível carregar a partida
        </Text>
        <Button
          variant="outlineW"
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
        className="text-center font-body text-body text-white/70 mb-6"
        testID="waiting-game"
      >
        {game.phase === 'PICK_NEXT'
          ? 'Aguardando quem organiza escolher os times do próximo jogo.'
          : game.isOrganizer
            ? 'Monte os times antes de começar a partida.'
            : 'A partida ainda não começou.'}
      </Text>
      <Button variant="outlineW" onPress={() => router.back()}>
        Voltar
      </Button>
    </Centered>
  );
}

/** Full-screen centered dark container for the loading / error / waiting states. */
function Centered({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 items-center justify-center px-6">
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
      hitSlop={ICON_HIT_SLOP}
      testID="scoreboard-back"
    >
      <ChevronLeft size={24} color={colors.textOnDark} />
    </Pressable>
  );
}

/** A team keeps the color of its position in the draw through the whole game. */
function teamColorIndex(game: LiveGame, teamId: string): number {
  return Math.max(0, game.teams.findIndex((team) => team.id === teamId));
}

function setsLabel(setsWon: number): string {
  // "vitórias" reads right both for the games of a session and the sets of an old best-of.
  return `${setsWon} ${setsWon === 1 ? 'vitória' : 'vitórias'}`;
}

/**
 * S13.5 — the organizer picks the two teams of the next set. The winner of the
 * last set is flagged ("continua em quadra") but not forced.
 */
function SetTeamPicker({ matchId, game }: { matchId: string; game: LiveGame }) {
  // With two teams the next game is always the same pair: both come selected.
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    game.teams.length === 2 ? game.teams.map((team) => team.id) : [],
  );
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
      onError: (error) => dialog.alert('Não foi possível começar o jogo', error.message),
    });
  };

  const handleEndGame = () => {
    dialog.alert('Encerrar a partida?', 'Vence o time que ganhou mais jogos. Um jogo em andamento não conta.', [
      { text: 'Continuar jogando', style: 'cancel' },
      {
        text: 'Encerrar',
        style: 'destructive',
        onPress: () =>
          endGame.mutate(undefined, {
            onError: (error) => dialog.alert('Não foi possível encerrar', error.message),
          }),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        {/* ── Header bar ── */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <BackButton />
          <Text className="font-body-bold text-eyebrow text-white/70 uppercase">
            {gameLabel(game, game.setNumber)}
          </Text>
          <View className="w-6" />
        </View>

        {/* ── Hero section ── */}
        <View className="px-4 pt-6 pb-4">
          <Text className="font-display text-display text-text-on-dark uppercase">
            Quem joga agora?
          </Text>
          <Text className="font-body text-body text-white/70 mt-2">
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
              <PressableScale
                key={team.id}
                onPress={() => toggleTeamSelection(team.id)}
                disabled={selectedTeamIds.length === 2 && !isSelected}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${team.name}${isSelected ? ` selecionado ${selectionOrder}` : ''}`}
                className={`rounded-card border-2 px-4 py-4 flex-row items-center justify-between overflow-hidden ${
                  isSelected
                    ? 'bg-white/10 border-accent'
                    : 'bg-surface-dark-alt border-white/10'
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
                    <Text className={`font-num text-body ${getTeamTextOnColor(teamIndex)}`}>
                      {team.number}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="font-body-extrabold text-h3 text-text-on-dark">{team.name}</Text>
                    {wonPreviousSet ? (
                      <Text className="font-body-semibold text-caption text-accent mt-1">
                        Venceu o último jogo e continua em quadra
                      </Text>
                    ) : (
                      <Text className="font-body text-caption text-white/70 mt-1">
                        {team.players.length} jogadores
                        {setsWon > 0 ? ` · ${setsLabel(setsWon)}` : ''}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Selection indicator */}
                {isSelected ? (
                  <View className="h-6 w-6 rounded-full bg-accent items-center justify-center">
                    <Text className="font-num text-caption text-surface-dark">
                      {selectionOrder}
                    </Text>
                  </View>
                ) : (
                  <View className="h-6 w-6 rounded-full border-2 border-white/40" />
                )}
              </PressableScale>
            );
          })}
        </ScrollView>

        {/* ── Footer: pairing pill + CTA ── */}
        <View className="px-4 py-4 border-t border-white/10 gap-3">
          {selectedTeamIds.length === 2 ? (
            <View className="bg-surface-dark-alt rounded-pill px-4 py-3 items-center border border-white/10">
              <Text className="font-body-semibold text-body-bold text-text-on-dark">
                {teamName(selectedTeamIds[0])} vs {teamName(selectedTeamIds[1])}
              </Text>
            </View>
          ) : (
            <Text className="font-body text-caption text-white/70 text-center">
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
            {game.phase === 'PICK_NEXT' ? 'Começar próximo jogo' : 'Começar partida'}
          </Button>

          {/* Between sets the organizer may call it a day. */}
          {game.phase === 'PICK_NEXT' ? (
            <Button
              variant="outlineW"
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
 * Organizer: each team's whole panel is the "+1" button (it is tapped from the
 * side of the court, barely looking), plus Desfazer (last point) and Encerrar
 * set (the team ahead takes it). Everyone else: read-only, updated live.
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

  // Points are optimistic (useAddPoint): the panels stay tappable while earlier
  // taps are on their way. Undo and end-set wait for them, so they act on the
  // score the server really has.
  const correcting = undoPoint.isPending || endSet.isPending;
  const busy = addPoint.isPending || correcting;
  const { setNumber } = game;

  const handleEndSet = () => {
    dialog.alert('Encerrar este jogo agora?', 'Quem está na frente ganha o jogo.', [
      { text: 'Continuar jogando', style: 'cancel' },
      {
        text: 'Encerrar jogo',
        onPress: () =>
          endSet.mutate(
            { setNumber },
            { onError: (error) => dialog.alert('Não foi possível encerrar o jogo', error.message) },
          ),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        {/* ── Header bar: back, AO VIVO badge + timer ── */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/10">
          <BackButton />
          <View className="flex-1 items-center px-3">
            <View className="flex-row items-center gap-1 mb-1">
              <View className="h-2 w-2 rounded-full bg-danger" />
              <Text className="font-body-bold text-eyebrow text-text-on-dark uppercase">AO VIVO</Text>
              <Text className="font-mono text-mono text-white/70 ml-1">{elapsed}</Text>
            </View>
            <Text className="font-body text-caption text-white/70 text-center" numberOfLines={1}>
              {game.matchName} · {gameLabel(game, setNumber)}
            </Text>
          </View>
          {/* Spacer to keep the AO VIVO block centered opposite the back button */}
          <View className="w-6" />
        </View>

        {/* ── The two teams on court, side by side ── */}
        <View className="flex-1 flex-row gap-3 px-4 py-4">
          {pair.map((team, index) => {
            const colorIndex = teamColorIndex(game, team.id);
            const panel = (
              <>
                <View className={`h-2 ${getTeamBgColor(colorIndex)}`} />
                <View className="flex-1 items-center justify-between px-3 py-6">
                  <View className="items-center">
                    <Text
                      className="font-display text-h1 text-text-on-dark uppercase text-center"
                      numberOfLines={2}
                    >
                      {team.name}
                    </Text>
                    <Text className="font-body-semibold text-caption text-white/70 mt-1">
                      {setsLabel(game.setsWon[team.id] ?? 0)}
                    </Text>
                  </View>

                  <Text
                    className="font-num text-score text-text-on-dark"
                    testID={`score-team${index + 1}`}
                  >
                    {game.scores[index]}
                  </Text>

                  {game.isOrganizer ? (
                    <View
                      className={`h-16 self-stretch rounded-btn items-center justify-center ${getTeamBgColor(
                        colorIndex,
                      )}`}
                    >
                      <Text className={`font-num text-num ${getTeamTextOnColor(colorIndex)}`}>
                        +1
                      </Text>
                    </View>
                  ) : (
                    <View className="h-16" />
                  )}
                </View>
              </>
            );
            const panelClass =
              'flex-1 overflow-hidden rounded-card border border-white/10 bg-surface-dark-alt';

            return game.isOrganizer ? (
              <PressableScale
                key={team.id}
                onPress={() =>
                  addPoint.mutate(
                    { setNumber, teamId: team.id },
                    { onError: (error) => dialog.alert('Erro ao registrar ponto', error.message) },
                  )
                }
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ponto para ${team.name}`}
                className={panelClass}
                disabled={correcting}
                testID={`add-point-team${index + 1}`}
              >
                {panel}
              </PressableScale>
            ) : (
              <View key={team.id} className={panelClass}>
                {panel}
              </View>
            );
          })}
        </View>

        {/* ── Footer: the organizer's corrections, or why nothing is tappable ── */}
        {game.isOrganizer ? (
          <View className="px-4 pb-4 gap-3">
            <Text className="font-body text-caption text-white/70 text-center">
              Toque no time para marcar o ponto
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="outlineW"
                  onPress={() =>
                    undoPoint.mutate(
                      { setNumber },
                      { onError: (error) => dialog.alert('Erro ao desfazer', error.message) },
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
                  variant="outlineLime"
                  onPress={handleEndSet}
                  loading={endSet.isPending}
                  testID="end-set-button"
                >
                  Encerrar jogo
                </Button>
              </View>
            </View>
          </View>
        ) : (
          <Text className="font-body text-caption text-white/70 text-center px-4 pb-4">
            Quem organiza marca os pontos. O placar atualiza sozinho.
          </Text>
        )}
      </SafeAreaView>
    </View>
  );
}

/** The game is over: who won, the sets of each team, and on to the MVP vote. */
function GameOver({ matchId, game }: { matchId: string; game: LiveGame }) {
  const winner = game.teams.find((team) => team.id === game.winnerTeamId);
  return (
    <Centered>
      <Text className="font-body-bold text-eyebrow text-accent uppercase">Fim da partida</Text>
      <Text
        className="mt-2 mb-6 text-center font-display text-display text-text-on-dark uppercase"
        testID="game-over-winner"
      >
        {winner ? `${winner.name} venceu` : 'Partida encerrada'}
      </Text>

      <View className="mb-8 self-stretch gap-2" testID="game-over-sets">
        {game.teams.map((team, index) => (
          <View
            key={team.id}
            className={`flex-row items-center gap-3 rounded-card bg-surface-dark-alt px-4 py-3 ${
              team.id === winner?.id ? 'border-2 border-accent' : 'border border-white/10'
            }`}
          >
            <View className={`h-3 w-3 rounded-full ${getTeamBgColor(index)}`} />
            <Text className="flex-1 font-body-semibold text-body-bold text-text-on-dark">
              {team.name}
            </Text>
            {team.id === winner?.id ? <Trophy size={16} color={colors.accent} /> : null}
            <Text className={`font-num text-body ${team.id === winner?.id ? 'text-accent' : 'text-text-on-dark'}`}>
              {setsLabel(game.setsWon[team.id] ?? 0)}
            </Text>
          </View>
        ))}
      </View>

      <View className="self-stretch">
        <Button
          variant="grad"
          onPress={() =>
            router.replace({ pathname: '/matches/[id]/mvp-vote', params: { id: matchId } })
          }
          testID="go-mvp-vote"
        >
          Votar no <Text className="font-num">MVP</Text>
        </Button>
      </View>
    </Centered>
  );
}
