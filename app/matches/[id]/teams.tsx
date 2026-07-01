import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState, useEffect } from 'react';
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
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useDrawTeams, useDrawTeamsButton } from '@/features/matches/api/drawTeams';
import type { DrawMode } from '@/features/matches/types/matchDetail';
import type { Team } from '@/features/matches/types/team';
import { colors } from '@/theme/colors';
import { useMatchStore } from '@/stores/matchStore';

/**
 * S13 — In-Game Teams
 *
 * Route params: id, teamCount, perTeam, drawMode (all strings, need parsing).
 * Displays team rosters (N columns) with draw/assignment UI.
 *
 * Flow:
 * - AUTO mode: auto-draw on mount (loading skeleton), display teams, show "Começar partida"
 * - MANUAL mode: show "Sortear" button, on tap call draw, display teams, show "Começar partida"
 * - Back button returns to S12 (no persistence)
 * - "Começar partida" shows confirmation dialog, then navigates to scoreboard
 */
export default function TeamsScreen() {
  // ── Global match state ──
  const { setTeams: storeSetTeams, initializeMatch } = useMatchStore();

  const params = useLocalSearchParams<{
    id?: string;
    teamCount?: string;
    perTeam?: string;
    drawMode?: string;
  }>();

  // ── Route param parsing & validation ──
  const matchId = params.id ?? '';
  const teamCount = parseInt(params.teamCount ?? '2', 10) as 2 | 3 | 4;
  const perTeam = parseInt(params.perTeam ?? '4', 10);
  const drawMode = (params.drawMode ?? 'MANUAL') as DrawMode;

  // Validate route params
  const paramsValid =
    matchId &&
    (teamCount === 2 || teamCount === 3 || teamCount === 4) &&
    perTeam > 0 &&
    (drawMode === 'MANUAL' || drawMode === 'AUTO');

  // ── Server state: match detail & teams ──
  const matchQuery = useMatchDetail(matchId, { latencyMs: 0 });
  const confirmedPlayers = matchQuery.data?.players ?? [];

  // For AUTO mode, trigger draw immediately; for MANUAL, only on button tap.
  const drawQuery = useDrawTeams(
    matchId,
    confirmedPlayers,
    { teamCount, perTeam, drawMode },
    {
      // Only fetch automatically in AUTO mode; MANUAL mode uses manual refetch
      enabled: drawMode === 'AUTO' && confirmedPlayers.length > 0,
    },
  );

  const drawButton = useDrawTeamsButton(matchId);

  // ── Local UI state ──
  const [teams, setTeams] = useState<Team[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  // Seed teams from draw query when it resolves
  useEffect(() => {
    if (drawQuery.data?.teams) {
      setTeams(drawQuery.data.teams);
    }
  }, [drawQuery.data?.teams]);

  // ── Error state ──
  if (!paramsValid) {
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
  const handleDraw = async () => {
    try {
      const result = await drawButton.refetch();
      if (result && 'teams' in result) {
        setTeams(result.teams);
        // Persist to global store
        storeSetTeams(result.teams);
      }
    } catch (err) {
      Alert.alert(
        'Erro ao sortear',
        'Não foi possível montar os times. Tente novamente.',
      );
    }
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
            // MOCK: simulate latency for confirmation/persistence
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Persist match and teams to global store
            initializeMatch({
              matchId,
              bestOf: 3,
            });
            storeSetTeams(teams);

            // TODO(real-api): POST final team assignments to F1.3 endpoint here if
            // teams were modified via drag-to-swap. For now, just navigate.

            // Navigate to scoreboard (S14)
            // TODO(scoreboard): Once S14 (scoreboard) route is fully implemented,
            // Expo Router's type generation will recognize this pathname.
            const scorePath = '/matches/[id]/scoreboard';
            router.push({
              pathname: scorePath as any,
              params: { id: matchId, teamCount: String(teamCount), perTeam: String(perTeam), drawMode },
            });
          } catch (err) {
            setIsStarting(false);
            Alert.alert(
              'Erro ao iniciar',
              'Não foi possível começar a partida. Tente novamente.',
            );
          }
        },
        style: 'default',
      },
    ]);
  };

  // ── Loading state (AUTO mode, draw in flight) ──
  const isDrawing = drawQuery.isPending && drawMode === 'AUTO' && teams.length === 0;

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
          {/* ── Subtitle: team config ── */}
          <View className="px-4 mt-2">
            <Text className="font-body text-caption text-text-muted">
              {teamCount} times de {perTeam} jogadores cada • Modo{' '}
              {drawMode === 'MANUAL' ? 'Manual' : 'Automático'}
            </Text>
          </View>

          {/* ── Team rosters: N columns (loading skeleton vs. populated) ── */}
          {isDrawing ? (
            // Loading skeleton: pulse on team columns
            <View className="px-4 mt-6 flex-row gap-4">
              {Array.from({ length: teamCount }).map((_, i) => (
                <View key={i} className="flex-1 gap-3">
                  <View className="h-6 bg-bg-light-alt rounded-chip" />
                  {Array.from({ length: perTeam }).map((_, j) => (
                    <View key={j} className="items-center">
                      <View className="h-12 w-12 rounded-full bg-bg-light-alt" />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : teams.length > 0 ? (
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
          ) : null}

          {/* ── Sortear button (MANUAL mode only; shown if teams not yet drawn) ── */}
          {drawMode === 'MANUAL' && teams.length === 0 && (
            <View className="px-4 mt-8">
              <Button
                variant="outline"
                onPress={handleDraw}
                loading={drawQuery.isPending}
                testID="draw-teams"
              >
                Sortear
              </Button>
            </View>
          )}

          {/* ── Confirmation text ── */}
          <View className="px-4 mt-8">
            <Text className="font-body text-body text-text-muted text-center">
              Revise os times abaixo e toque em "Começar partida" para iniciar.
            </Text>
          </View>
        </ScrollView>

        {/* ── Fixed footer CTA ── */}
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-4 pt-3 pb-6">
          <Button
            variant="grad"
            onPress={handleStartMatch}
            loading={isStarting}
            disabled={teams.length === 0}
            testID="start-match"
          >
            Começar partida
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
