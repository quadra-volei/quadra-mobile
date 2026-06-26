import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useSelectTeamsForSet } from '@/features/matches/api/selectTeamsForSet';
import type { Team } from '@/features/matches/types/team';
import { getTeamBgColor } from '@/features/matches/lib/teamColors';
import { colors } from '@/theme/colors';

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

  // ── S14: Scoreboard (placeholder for now) ──
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center">
        <Text className="text-h1 text-text-on-dark uppercase">
          Placar
        </Text>
        <Text className="text-body text-text-muted mt-4">
          Set {setNumber} • Melhor de {bestOf}
        </Text>
      </SafeAreaView>
    </View>
  );
}
