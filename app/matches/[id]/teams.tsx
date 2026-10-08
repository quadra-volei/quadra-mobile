import { router, useLocalSearchParams } from 'expo-router';
import { Check, ChevronLeft, Scale, Shuffle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TeamRoster } from '@/components/domain/TeamRoster';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { StepperField } from '@/components/ui/StepperField';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useDrawTeams } from '@/features/matches/api/drawTeams';
import type { DrawMode } from '@/features/matches/types/matchDetail';
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
 * - "Refazer sorteio" brings the configuration back;
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
          Alert.alert(
            'Erro ao sortear',
            error.message || 'Não foi possível montar os times. Tente novamente.',
          );
        },
      },
    );
  };

  const handleStartMatch = () => {
    Alert.alert('Pronto para começar esta partida?', '', [
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
            Alert.alert(
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

  // ── Render ──
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
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
          contentContainerClassName="pb-32"
          showsVerticalScrollIndicator={false}
        >
          {drawn ? (
            <>
              {/* ── What was drawn + the rosters ── */}
              <View className="px-4 mt-2">
                <Text
                  className="font-body text-caption text-text-muted"
                  testID="team-config-summary"
                >
                  {teamCount} times de {perTeam} jogadores cada • Sorteio{' '}
                  {drawMode === 'MANUAL' ? 'aleatório' : 'equilibrado'}
                </Text>
              </View>

              <View className="flex-row gap-4 px-4 mt-6">
                {teams.map((team) => (
                  <TeamRoster
                    key={team.id}
                    teamId={team.id}
                    teamName={team.name || `Time ${team.number}`}
                    players={team.players}
                    testID={`team-roster-${team.id}`}
                  />
                ))}
              </View>

              <View className="px-4 mt-8">
                <Button
                  variant="outline"
                  onPress={() => setTeams([])}
                  testID="redraw-teams"
                >
                  Refazer sorteio
                </Button>
              </View>

              <View className="px-4 mt-6">
                <Text className="font-body text-body text-text-muted text-center">
                  Revise os times e toque em "Começar partida" para iniciar.
                </Text>
              </View>
            </>
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

              <View className="mt-8">
                <Button
                  variant="outline"
                  onPress={handleDraw}
                  loading={draw.isPending}
                  testID="draw-teams"
                >
                  Sortear times
                </Button>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Fixed footer CTA ── */}
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-4 pt-3 pb-6">
          <Button
            variant="grad"
            onPress={handleStartMatch}
            loading={isStarting}
            disabled={!drawn}
            testID="start-match"
          >
            Começar partida
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
