import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useSelectTeamsForSet } from '@/features/matches/api/selectTeamsForSet';
import { useCurrentSet } from '@/features/matches/api/getCurrentSet';
import { useAddPointMutation } from '@/features/matches/api/mutations/addPoint';
import { useUndoPointMutation } from '@/features/matches/api/mutations/undoPoint';
import { useScoreSubscription } from '@/features/matches/realtime/useScoreSubscription';
import type { Team } from '@/features/matches/types/team';
import { getTeamBgColor } from '@/features/matches/lib/teamColors';
import { colors } from '@/theme/colors';
import { useMatchStore } from '@/stores/matchStore';

/**
 * S13.5 + S14 — Set Team Picker (3+ teams) → Scoreboard
 *
 * Route params (from S13):
 * - id: string (match id)
 * - teamCount: string (parsed to 2 | 3 | 4)
 * - perTeam: string (parsed to number)
 * - drawMode: string (MANUAL | AUTO)
 * - setNumber: string (optional; default: 1)
 * - bestOf: string (optional; default: 3)
 *
 * Conditional rendering logic:
 * - If teamCount >= 3 && selectedTeamIds.length < 2: render S13.5 team picker
 * - Else: render S14 scoreboard (placeholder for now)
 *
 * This is a single component handling both states within the same route.
 */
export default function ScoreboardScreen() {
  // ── Global match state ──
  const { selectTeamsForSet } = useMatchStore();

  const params = useLocalSearchParams<{
    id?: string;
    teamCount?: string;
    perTeam?: string;
    drawMode?: string;
    setNumber?: string;
    bestOf?: string;
  }>();

  // ── Route param parsing & validation ──
  const matchId = params.id ?? '';
  const teamCount = parseInt(params.teamCount ?? '2', 10) as 2 | 3 | 4;
  const perTeam = parseInt(params.perTeam ?? '4', 10);
  const drawMode = params.drawMode ?? 'MANUAL';
  const setNumber = parseInt(params.setNumber ?? '1', 10);
  const bestOf = parseInt(params.bestOf ?? '3', 10);

  // ── Server state: match detail ──
  const matchQuery = useMatchDetail(matchId, { latencyMs: 0 });
  const match = matchQuery.data;

  // Extract teams from match detail if available
  // MOCK: Teams will come from the full match detail response once backend lands.
  // For now, we'll derive a mock set of teams from the confirmed players.
  const mockTeams: Team[] = match
    ? Array.from({ length: teamCount }).map((_, idx) => ({
        id: `team-${idx + 1}`,
        name: `Time ${idx + 1}`,
        number: idx + 1,
        players: match.players.slice(idx * perTeam, (idx + 1) * perTeam),
      }))
    : [];

  // ── Local state: team selection ──
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // ── Mutation: select teams for set ──
  const selectTeamsMutation = useSelectTeamsForSet(matchId, setNumber);

  // ── Computed state ──
  const showSetPicker = teamCount >= 3 && selectedTeamIds.length < 2;
  const previousSetWinnerId: string | null = null; // MOCK: would come from match data

  // ── Handlers ──
  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        // Deselect
        return prev.filter((id) => id !== teamId);
      } else if (prev.length < 2) {
        // Add if not at max (2)
        return [...prev, teamId];
      }
      // At max capacity, ignore
      return prev;
    });
  };

  const handleStartSet = async () => {
    if (selectedTeamIds.length !== 2) return;

    const team1 = selectedTeamIds[0];
    const team2 = selectedTeamIds[1];

    if (!team1 || !team2) return;

    try {
      await selectTeamsMutation.mutateAsync([team1, team2]);

      // Persist selection to global store
      selectTeamsForSet(selectedTeamIds);

      // On success, the conditional re-renders to S14 within the same component.
      // (selectedTeamIds stays in state, so showSetPicker becomes false)
    } catch (err) {
      Alert.alert(
        'Erro ao salvar seleção',
        'Não foi possível salvar a seleção de times. Tente novamente.',
      );
    }
  };

  const getTeamName = (teamId: string | undefined): string => {
    if (!teamId) return '';
    return mockTeams.find((t) => t.id === teamId)?.name ?? teamId;
  };

  // ── Loading state ──
  if (matchQuery.isPending) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center">
          <Text className="text-body text-text-on-dark">Carregando...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (matchQuery.isError || !match) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-body text-text-muted mb-6">
            Não foi possível carregar os times
          </Text>
          <Button
            variant="outline"
            onPress={() => void matchQuery.refetch()}
            testID="retry-load"
          >
            Tentar novamente
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  // ── S13.5: Team Picker (conditional) ──
  if (showSetPicker) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1">
          {/* ── Header bar ── */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-line/20">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              testID="scoreboard-back"
            >
              <ChevronLeft size={24} color={colors.textOnDark} />
            </Pressable>
            <Text className="text-eyebrow text-text-muted uppercase">
              SET - MELHOR DE {bestOf}
            </Text>
            <View style={{ width: 24 }} />
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
            {mockTeams.map((team, teamIndex) => {
              const isSelected = selectedTeamIds.includes(team.id);
              const selectionOrder = isSelected ? selectedTeamIds.indexOf(team.id) + 1 : null;
              const wonPreviousSet = previousSetWinnerId === team.id;

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
                  testID={`team-row-${team.id}`}
                >
                  {/* Team info */}
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

                    {/* Team name + metadata */}
                    <View className="flex-1">
                      <Text className="text-body-bold text-text-on-dark">{team.name}</Text>
                      {wonPreviousSet ? (
                        <Text className="text-caption text-accent mt-1">
                          Venceu o set e continua em quadra
                        </Text>
                      ) : (
                        <Text className="text-caption text-text-muted mt-1">
                          {team.players.length} jogadores
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
            {selectedTeamIds.length === 2 && (
              <View className="bg-surface-dark-alt rounded-pill px-4 py-3 items-center border border-line/20">
                <Text className="text-body-bold text-text-on-dark">
                  {getTeamName(selectedTeamIds[0])} vs {getTeamName(selectedTeamIds[1])}
                </Text>
              </View>
            )}

            {selectedTeamIds.length < 2 && (
              <Text className="text-caption text-text-muted text-center">
                Selecione {2 - selectedTeamIds.length} time{selectedTeamIds.length === 1 ? '' : 's'}
              </Text>
            )}

            <Button
              variant="grad"
              disabled={selectedTeamIds.length !== 2}
              loading={selectTeamsMutation.isPending}
              onPress={handleStartSet}
              testID="start-set-button"
            >
              Começar partida
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── S14: Scoreboard ──
  return <S14Scoreboard matchId={matchId} setNumber={setNumber} bestOf={bestOf} selectedTeamIds={selectedTeamIds} />;
}

/**
 * S14 In-Game Scoreboard component.
 *
 * Renders a live scoreboard with:
 * - Organizer: Full controls (+ ponto, Desfazer, Encerrar set)
 * - Non-organizer: Read-only display, updates via SignalR subscription
 * - Timer: Increments every 1s via useEffect
 */
function S14Scoreboard({
  matchId,
  setNumber,
  bestOf,
  selectedTeamIds,
}: {
  matchId: string;
  setNumber: number;
  bestOf: number;
  selectedTeamIds: string[];
}) {
  // ── Global match state ──
  const { scores: storeScores, addPoint: storeAddPoint, undoPoint: storeUndoPoint, incrementElapsedTime } = useMatchStore();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [displayScores, setDisplayScores] = useState<[number, number]>([0, 0]);
  const [canUndo, setCanUndo] = useState(false);
  const [isEndingSet, setIsEndingSet] = useState(false);

  // ── Server state: current set ──
  const setQuery = useCurrentSet(
    matchId,
    setNumber,
    selectedTeamIds as [string, string],
    { enabled: selectedTeamIds.length === 2 },
  );
  const currentSet = setQuery.data;

  // ── Real-time subscription (non-organizers only) ──
  useScoreSubscription(matchId, setNumber);

  // ── Mutations (organizer only) ──
  const addPointMutation = useAddPointMutation(matchId, setNumber);
  const undoPointMutation = useUndoPointMutation(matchId, setNumber);

  // ── Timer effect ──
  React.useEffect(() => {
    if (!currentSet) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSet]);

  // ── Sync display scores with query data ──
  React.useEffect(() => {
    if (currentSet?.scores) {
      setDisplayScores(currentSet.scores);
      setCanUndo(currentSet.pointsScoredCount > 0);
    }
  }, [currentSet]);

  // ── Handlers ──
  const handleAddPoint = async (teamId: string) => {
    // Optimistic update (organizer only)
    setDisplayScores(([s1, s2]) => {
      const newScores: [number, number] = [s1, s2];
      if (teamId === selectedTeamIds[1]) {
        newScores[1]++;
      } else {
        newScores[0]++;
      }
      return newScores;
    });

    // Persist to global store
    storeAddPoint(teamId);

    // Send mutation
    try {
      await addPointMutation.mutateAsync({
        teamId,
        currentScores: displayScores,
      });
    } catch (err) {
      // On error, undo optimistic update
      setDisplayScores(currentSet?.scores || [0, 0]);
      storeUndoPoint(teamId);
      Alert.alert('Erro ao registrar ponto', 'Tente novamente');
    }
  };

  const handleUndo = async () => {
    // Undo from global store (undo the last point from the team that has more points)
    const team1Id = selectedTeamIds[0];
    const team2Id = selectedTeamIds[1];

    if (team1Id && team2Id) {
      const team1Score = storeScores[team1Id] || 0;
      const team2Score = storeScores[team2Id] || 0;

      if (team1Score > team2Score) {
        storeUndoPoint(team1Id);
      } else if (team2Score > 0) {
        storeUndoPoint(team2Id);
      }
    }

    try {
      await undoPointMutation.mutateAsync({
        currentScores: displayScores,
      });
    } catch (err) {
      Alert.alert('Erro ao desfazer', 'Tente novamente');
    }
  };

  const handleEndSet = async () => {
    setIsEndingSet(true);
    try {
      // MOCK: simulate ending the set
      // TODO(real-api): POST to /api/v1/matches/{matchId}/sets/{setNumber}/end
      await new Promise((resolve) => setTimeout(resolve, 300));

      // On success, check match state and navigate
      // MOCK: assume match is not over (would check response.matchOver in real)
      // For now, navigate back to team picker if 3+ teams, or stay for 2-team match
      if (selectedTeamIds.length === 2) {
        // Reset for next set
        setDisplayScores([0, 0]);
        setElapsedSeconds(0);
        setCanUndo(false);
      } else {
        // Navigate to S15 (or back to S13.5)
        router.push({
          pathname: '/matches/[id]/mvp-vote',
          params: { id: matchId },
        });
      }
    } catch (err) {
      Alert.alert('Erro ao encerrar set', 'Tente novamente');
    } finally {
      setIsEndingSet(false);
    }
  };

  // ── Formatting ──
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // ── Loading state ──
  if (setQuery.isPending) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center">
          <Text className="text-body text-text-on-dark">Carregando placar...</Text>
        </SafeAreaView>
      </View>
    );
  }

  // ── Error state ──
  if (setQuery.isError || !currentSet) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-body text-text-muted mb-6">
            Não foi possível carregar a partida
          </Text>
          <Button
            variant="outline"
            onPress={() => void setQuery.refetch()}
            testID="retry-placar"
          >
            Tentar novamente
          </Button>
        </SafeAreaView>
      </View>
    );
  }

  // ── Get team names ──
  const team1Name = currentSet.teams[0]?.name ?? 'Time 1';
  const team2Name = currentSet.teams[1]?.name ?? 'Time 2';
  const team1Id = currentSet.teams[0]?.id ?? selectedTeamIds[0];
  const team2Id = currentSet.teams[1]?.id ?? selectedTeamIds[1];

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* ── Header bar: back, AO VIVO badge + timer ── */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-line/10">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            testID="scoreboard-back"
          >
            <ChevronLeft size={24} color={colors.textOnDark} />
          </Pressable>

          <View className="flex-col items-center">
            <View className="flex-row items-center gap-1 mb-1">
              <View className="h-2 w-2 rounded-full bg-danger" />
              <Text className="text-eyebrow text-danger uppercase">AO VIVO</Text>
              <Text className="text-caption text-text-muted ml-1">{formatTime(elapsedSeconds)}</Text>
            </View>
            <Text className="text-caption text-text-muted">
              Sua partida · Set {setNumber} melhor de {bestOf}
            </Text>
          </View>

          {/* Spacer to keep the AO VIVO block centered opposite the back button */}
          <View className="w-6" />
        </View>

        {/* ── Main score display: two teams side by side ── */}
        <View className="flex-1 flex-row gap-4 px-4 py-8">
          {/* Team 1 */}
          <View className="flex-1 flex-col items-center">
            <Text className="text-h1 text-text-on-dark uppercase mb-4">
              {team1Name}
            </Text>

            {/* Large score box */}
            <View className="h-24 w-24 bg-white rounded-card flex items-center justify-center mb-4">
              <Text className="font-num text-primary" style={{ fontSize: 40 }}>
                {displayScores[0]}
              </Text>
            </View>

            {/* Point control or indicator */}
            {currentSet.isOrganizer ? (
              <Pressable
                onPress={() => {
                  if (team1Id) handleAddPoint(team1Id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ponto para ${team1Name}`}
                className="py-2"
                disabled={isEndingSet || !team1Id}
                testID="add-point-team1"
              >
                <Text className="text-body-bold text-accent">+ ponto</Text>
              </Pressable>
            ) : (
              <View className="flex-col items-center gap-1">
                <Text className="text-caption text-text-muted">
                  ao vivo
                </Text>
              </View>
            )}
          </View>

          {/* Center divider */}
          <View className="flex items-center justify-center">
            <Text className="text-body text-text-muted">vs</Text>
          </View>

          {/* Team 2 */}
          <View className="flex-1 flex-col items-center">
            <Text className="text-h1 text-text-on-dark uppercase mb-4">
              {team2Name}
            </Text>

            {/* Large score box */}
            <View className="h-24 w-24 bg-white rounded-card flex items-center justify-center mb-4">
              <Text className="font-num text-primary" style={{ fontSize: 40 }}>
                {displayScores[1]}
              </Text>
            </View>

            {/* Point control or indicator */}
            {currentSet.isOrganizer ? (
              <Pressable
                onPress={() => {
                  if (team2Id) handleAddPoint(team2Id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ponto para ${team2Name}`}
                className="py-2"
                disabled={isEndingSet || !team2Id}
                testID="add-point-team2"
              >
                <Text className="text-body-bold text-accent">+ ponto</Text>
              </Pressable>
            ) : (
              <View className="flex-col items-center gap-1">
                <Text className="text-caption text-text-muted">
                  ao vivo
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Footer action buttons (organizer only) ── */}
        {currentSet.isOrganizer && (
          <View className="flex-row gap-3 px-4 pb-4">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={handleUndo}
                disabled={!canUndo || isEndingSet}
                testID="undo-button"
              >
                Desfazer
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="grad"
                onPress={handleEndSet}
                loading={isEndingSet}
                testID="end-set-button"
              >
                Encerrar set
              </Button>
            </View>
          </View>
        )}

        {/* ── Thin progress bar ── */}
        <View className="h-1 bg-accent opacity-40" />
      </SafeAreaView>
    </View>
  );
}
