import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, Scale, Shuffle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamRoster } from '@/components/domain/TeamRoster';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { FilterChip } from '@/components/ui/FilterChip';
import { StepperField } from '@/components/ui/StepperField';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useDrawTeams, useMovePlayer } from '@/features/matches/api/drawTeams';
import type { DrawMode, PresencePlayer } from '@/features/matches/types/matchDetail';
import type { Team } from '@/features/matches/types/team';
import { colors } from '@/theme/colors';
import { useStartSet } from '@/features/matches/api/liveGame';

// What each draw mode asks the backend for (drawTeams.ts): MANUAL is a random
// draw, AUTO balances the teams by level.
const DRAW_MODES: {
  mode: DrawMode;
  title: string;
  caption: string;
  testID: string;
}[] = [
  {
    mode: 'MANUAL',
    title: 'Aleatório',
    caption: 'Times sorteados ao acaso',
    testID: 'draw-mode-manual',
  },
  {
    mode: 'AUTO',
    title: 'Equilibrado',
    caption: 'Times equilibrados por nível',
    testID: 'draw-mode-auto',
  },
];

const DRAW_MODE_ICON: Record<DrawMode, ReactNode> = {
  MANUAL: <Shuffle size={20} color={colors.primary} />,
  AUTO: <Scale size={20} color={colors.primary} />,
};

/**
 * S13 — In-Game Teams
 *
 * Route params: id. The organizer comes here from S12 once the list of players
 * is settled, and everything about the teams happens on this screen:
 * - choose how many teams, how many players each and how to draw them
 *   (defaults from the match's `teamConfig`);
 * - "Sortear times" draws on the backend and shows the rosters;
 * - tapping a drawn player moves them to another team (saved on the backend);
 * - "Refazer sorteio" brings the configuration back; whoever did not fit in the
 *   teams is listed as sitting out;
 * - "Começar partida" shows a confirmation dialog, then goes to the scoreboard.
 * Back returns to S12 (no persistence).
 */
export default function TeamsScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const matchId = params.id ?? '';

  // ── Server state: match detail & teams ──
  const matchQuery = useMatchDetail(matchId);
  const confirmedPlayers = matchQuery.data?.players ?? [];
  const confirmedCount = confirmedPlayers.filter(
    (p) => p.status === 'CONFIRMADO',
  ).length;
  const defaults = matchQuery.data?.teamConfig;

  const draw = useDrawTeams(matchId);
  const movePlayer = useMovePlayer(matchId);
  const startSet = useStartSet(matchId);

  // ── Local UI state ──
  // The configuration is what the organizer picked, or the match's default
  // until they pick something.
  const [teamCountPick, setTeamCount] = useState<2 | 3 | 4 | null>(null);
  const [perTeamPick, setPerTeam] = useState<number | null>(null);
  const [drawModePick, setDrawMode] = useState<DrawMode | null>(null);
  const teamCount = teamCountPick ?? defaults?.teamCount ?? 2;
  const perTeam = perTeamPick ?? defaults?.perTeam ?? 4;
  const drawMode = drawModePick ?? defaults?.drawMode ?? 'MANUAL';

  const [teams, setTeams] = useState<Team[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Seed teams whenever a draw resolves.
  useEffect(() => {
    if (draw.data?.teams) {
      setTeams(draw.data.teams);
    }
  }, [draw.data]);

  // ── Error state ──
  if (!matchId) {
    return (
      <View className="flex-1 bg-bg-light">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-body text-body text-text-primary mb-4">
            Parâmetros de rota inválidos
          </Text>
          <Button variant="outline" onPress={() => router.back()}>
            Voltar
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  if (matchQuery.isError) {
    return (
      <View className="flex-1 bg-bg-light">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-body text-body text-text-primary mb-4">
            Não foi possível carregar a partida
          </Text>
          <Button variant="outline" onPress={() => matchQuery.refetch()}>
            Tentar de novo
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  // ── Handlers ──
  const handleDraw = () => {
    draw.mutate(
      { players: confirmedPlayers, request: { teamCount, perTeam, drawMode } },
      {
        onSuccess: (result) => {
          setTeams(result.teams);
        },
        onError: (error) => {
          dialog.alert(
            'Erro ao sortear',
            error.message || 'Não foi possível montar os times. Tente novamente.',
          );
        },
      },
    );
  };

  // After the draw the organizer can still fix the teams: tap a player, pick
  // the team they go to. Saved on the backend, which answers with every team.
  const handleMovePlayer = (player: PresencePlayer, fromTeamId: string) => {
    const others = teams.filter((team) => team.id !== fromTeamId);
    dialog.alert(`Mover ${player.name} para`, undefined, [
      ...others.map((team) => ({
        text: team.name || `Time ${team.number}`,
        onPress: () =>
          movePlayer.mutate(
            { players: confirmedPlayers, playerId: player.id, teamId: team.id },
            {
              onSuccess: (result) => setTeams(result.teams),
              onError: (error) => dialog.alert('Erro ao mover', error.message),
            },
          ),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const handleStartMatch = () => {
    dialog.alert('Pronto para começar esta partida?', '', [
      {
        text: 'Revisar',
        onPress: () => {
          // Dismiss dialog, user stays on screen
        },
        style: 'cancel',
      },
      {
        text: 'Sim, começar',
        onPress: async () => {
          setIsStarting(true);
          try {
            // Two teams: nothing to pick, so the game starts right here. With
            // three or more the organizer first picks who plays the first set
            // (S13.5, on the scoreboard route).
            const [first, second] = teams;
            if (teams.length === 2 && first && second) {
              await startSet.mutateAsync([first.id, second.id]);
            }

            router.push({ pathname: '/matches/[id]/scoreboard', params: { id: matchId } });
          } catch (err) {
            setIsStarting(false);
            dialog.alert(
              'Erro ao iniciar',
              err instanceof Error
                ? err.message
                : 'Não foi possível começar a partida. Tente novamente.',
            );
          }
        },
        style: 'default',
      },
    ]);
  };

  const drawn = teams.length > 0;

  // Who fits: the draw fills `teamCount × perTeam` places, the rest sits out.
  const slots = teamCount * perTeam;
  const capacityHint =
    confirmedCount > slots
      ? `${confirmedCount - slots} ${confirmedCount - slots === 1 ? 'fica' : 'ficam'} de fora neste sorteio.`
      : confirmedCount < slots
        ? `${confirmedCount === slots - 1 ? 'Falta 1' : `Faltam ${slots - confirmedCount}`} para completar os times.`
        : null;
  const drawnIds = new Set(teams.flatMap((team) => team.players.map((p) => p.id)));
  const sittingOut = confirmedPlayers.filter(
    (p) => p.status === 'CONFIRMADO' && !drawnIds.has(p.id),
  );

  // ── Render ──
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        {/* ── Inline header ── */}
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center"
          >
            <ChevronLeft size={24} color={colors.surfaceDark} />
          </Pressable>
          <Text className="font-display text-h1 text-text-primary uppercase flex-1">
            Montar os times
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
        >
          {drawn ? (
            <View className="px-4">
              {/* ── What was drawn, and the way back to the choices ── */}
              <View className="flex-row items-center">
                <Text
                  className="flex-1 font-body text-caption text-text-muted"
                  testID="team-config-summary"
                >
                  {teamCount} times de {perTeam} jogadores cada • Sorteio{' '}
                  {drawMode === 'MANUAL' ? 'aleatório' : 'equilibrado'}
                </Text>
                <Button
                  variant="ghost"
                  onPress={() => setTeams([])}
                  testID="redraw-teams"
                >
                  Refazer sorteio
                </Button>
              </View>

              <Text className="font-body text-caption text-text-muted">
                Toque em um jogador para trocá-lo de time.
              </Text>

              <View className="mt-2 gap-3">
                {teams.map((team, index) => (
                  <TeamRoster
                    key={team.id}
                    teamId={team.id}
                    teamName={team.name || `Time ${team.number}`}
                    players={team.players}
                    colorIndex={index}
                    onPlayerPress={
                      movePlayer.isPending
                        ? undefined
                        : (player) => handleMovePlayer(player, team.id)
                    }
                    testID={`team-roster-${team.id}`}
                  />
                ))}
              </View>

              {sittingOut.length > 0 ? (
                <Text
                  className="mt-4 font-body text-caption text-text-muted"
                  testID="sitting-out"
                >
                  De fora neste sorteio: {sittingOut.map((p) => p.name).join(', ')}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="px-4 mt-2">
              {/* ── Configuration (moved here from the match detail) ── */}
              <Text className="font-display text-h2 text-surface-dark uppercase">
                Quantos times
              </Text>
              <View className="mt-2 flex-row gap-2">
                {([2, 3, 4] as const).map((count) => (
                  <FilterChip
                    key={count}
                    label={`${count} times`}
                    selected={teamCount === count}
                    onPress={() => setTeamCount(count)}
                    testID={`team-count-${count}`}
                  />
                ))}
              </View>

              <View className="mt-4 flex-row">
                <StepperField
                  label="Jogadores por time"
                  value={perTeam}
                  onChange={setPerTeam}
                  min={1}
                  testID="per-team-stepper"
                />
              </View>
              <Text className="mt-1 font-body text-caption text-text-muted">
                {confirmedCount} confirmados no total
              </Text>
              {capacityHint ? (
                <Text
                  className="mt-1 font-body-semibold text-caption text-text-primary"
                  testID="capacity-hint"
                >
                  {capacityHint}
                </Text>
              ) : null}

              <Text className="mt-6 font-display text-h2 text-surface-dark uppercase">
                Como sortear os times
              </Text>
              {DRAW_MODES.map(({ mode, title, caption, testID }) => (
                <Pressable
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: drawMode === mode }}
                  onPress={() => setDrawMode(mode)}
                  testID={testID}
                  className={`mt-2 flex-row items-center gap-3 rounded-card border p-4 ${
                    drawMode === mode
                      ? 'border-primary bg-primary/5'
                      : 'border-line bg-white'
                  }`}
                >
                  {DRAW_MODE_ICON[mode]}
                  <View className="flex-1">
                    <Text className="font-body-extrabold text-h3 text-text-primary">
                      {title}
                    </Text>
                    <Text className="font-body text-caption text-text-muted">
                      {caption}
                    </Text>
                  </View>
                  {drawMode === mode ? (
                    <Check size={20} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── Footer: the one next step (draw, then start) ── */}
        <View className="border-t border-line bg-white px-4 pt-3 pb-4">
          {drawn ? (
            <Button
              variant="grad"
              onPress={handleStartMatch}
              loading={isStarting}
              testID="start-match"
            >
              Começar partida
            </Button>
          ) : (
            <Button
              variant="grad"
              onPress={handleDraw}
              loading={draw.isPending}
              leftIcon={<Shuffle size={20} color={colors.surfaceDark} />}
              testID="draw-teams"
            >
              Sortear times
            </Button>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
