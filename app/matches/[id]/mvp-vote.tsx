import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  useMatchPlayers,
  useVoteMVPMutation,
  type MatchPlayer,
} from '@/features/matches/api/useMVPVote';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme/colors';
import { useMatchStore } from '@/stores/matchStore';

export default function MvpVoteScreen() {
  // ── Global match state ──
  const { voteForMVP } = useMatchStore();

  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.userId);

  // Server state: fetch match players
  const playersQuery = useMatchPlayers(id ?? '');

  // Mutation: submit MVP vote
  const voteMutation = useVoteMVPMutation(id ?? '');

  // Client state
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedForPlayer, setVotedForPlayer] = useState<MatchPlayer | null>(null);

  const handleSelectPlayer = (playerId: string) => {
    // Toggle selection: if already selected, deselect; otherwise select
    setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId);
  };

  const handleSubmitVote = async () => {
    if (!selectedPlayerId) return;

    voteMutation.mutate(selectedPlayerId, {
      onSuccess: (response) => {
        // Find the player object to display their name
        const player = playersQuery.data?.find((p) => p.id === response.votedForPlayerId);
        setVotedForPlayer(player ?? { id: response.votedForPlayerId, name: response.votedForName, handle: '', position: 'LEV' });
        setHasVoted(true);

        // Persist vote to global store
        voteForMVP(selectedPlayerId);
      },
    });
  };

  const isSubmittingVote = voteMutation.isPending;

  // Loading skeleton while fetching players
  if (playersQuery.isPending) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
              <ChevronLeft size={24} color={colors.textOnDark} />
            </Pressable>
            <Text className="text-body text-text-on-dark ml-3">Resultado da partida</Text>
          </View>

          {/* Hero section */}
          <View className="px-4 py-8 items-center">
            <Text className="text-eyebrow text-accent uppercase">MVP DA PARTIDA</Text>
            <Text className="text-display text-text-on-dark uppercase font-display mt-2">
              QUEM BRILHOU?
            </Text>
          </View>

          {/* Match indicator pill */}
          <View className="px-4 mb-6 items-center">
            <View className="bg-white/10 rounded-pill border border-white/20 px-4 py-2 self-center">
              <Text className="text-body text-text-on-dark">Sua partida</Text>
            </View>
          </View>

          {/* Loading skeleton */}
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Error state for loading players
  if (playersQuery.isError) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
              <ChevronLeft size={24} color={colors.textOnDark} />
            </Pressable>
            <Text className="text-body text-text-on-dark ml-3">Resultado da partida</Text>
          </View>

          {/* Error message */}
          <View className="flex-1 items-center justify-center px-4">
            <Text className="text-h3 text-text-on-dark text-center mb-4">
              Não foi possível carregar os jogadores
            </Text>
            <Button
              variant="outlineW"
              onPress={() => playersQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const players = playersQuery.data ?? [];

  // Post-vote state
  if (hasVoted && votedForPlayer) {
    return (
      <View className="flex-1 bg-surface-dark">
        <SafeAreaView edges={['top']} className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-4 py-4">
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
              <ChevronLeft size={24} color={colors.textOnDark} />
            </Pressable>
            <Text className="text-body text-text-on-dark ml-3">Resultado da partida</Text>
          </View>

          {/* Hero section */}
          <View className="px-4 py-8 items-center">
            <Text className="text-eyebrow text-accent uppercase">MVP DA PARTIDA</Text>
            <Text className="text-display text-text-on-dark uppercase font-display mt-2">
              QUEM BRILHOU?
            </Text>
          </View>

          {/* Match indicator pill */}
          <View className="px-4 mb-6 items-center">
            <View className="bg-white/10 rounded-pill border border-white/20 px-4 py-2 self-center">
              <Text className="text-body text-text-on-dark">Sua partida</Text>
            </View>
          </View>

          {/* Post-vote confirmation */}
          <View className="flex-1 items-center justify-center px-4">
            <Text
              className="text-h3 text-text-on-dark text-center"
              accessibilityLiveRegion="polite"
            >
              Você votou em {votedForPlayer.name}.
            </Text>
            <Text className="text-body text-text-muted text-center mt-6">
              Aguardando outros jogadores...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Pre-vote state: player selection
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 py-4">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar">
            <ChevronLeft size={24} color={colors.textOnDark} />
          </Pressable>
          <Text className="text-body text-text-on-dark ml-3">Resultado da partida</Text>
        </View>

        {/* Hero section */}
        <View className="px-4 py-8 items-center">
          <Text className="text-eyebrow text-accent uppercase">MVP DA PARTIDA</Text>
          <Text className="text-display text-text-on-dark uppercase font-display mt-2">
            QUEM BRILHOU?
          </Text>
        </View>

        {/* Match indicator pill */}
        <View className="px-4 mb-6 items-center">
          <View className="bg-white/10 rounded-pill border border-white/20 px-4 py-2 self-center">
            <Text className="text-body text-text-on-dark">Sua partida</Text>
          </View>
        </View>

        {/* Scrollable player list */}
        <ScrollView className="flex-1">
          <View className="px-4 gap-3 pb-4">
            {players.map((player) => {
              const isCurrentUser = player.id === userId;
              const isSelected = selectedPlayerId === player.id;

              return (
                <Pressable
                  key={player.id}
                  onPress={() => !isCurrentUser && handleSelectPlayer(player.id)}
                  disabled={isCurrentUser}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isCurrentUser,
                  }}
                  className={`
                    flex-row items-center gap-4 p-4 rounded-card
                    ${
                      isSelected
                        ? 'bg-white border-2 border-primary shadow-card'
                        : isCurrentUser
                          ? 'bg-white/5 opacity-50 border border-white/20'
                          : 'bg-white border border-line shadow-card'
                    }
                  `}
                >
                  <Avatar uri={player.avatarUrl} name={player.name} size="md" />
                  <View className="flex-1">
                    <Text className="text-h3 text-text-on-dark">{player.name}</Text>
                    <Text className="text-caption text-text-muted">
                      @{player.handle} · {player.position}
                    </Text>
                  </View>
                  {isSelected && (
                    <View className="w-6 h-6 rounded-full border-2 border-primary bg-primary" />
                  )}
                  {isCurrentUser && (
                    <Text className="text-caption text-accent font-mono">você</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View className="px-4 py-6 bg-surface-dark border-t border-white/10">
          <Button
            variant="grad"
            onPress={handleSubmitVote}
            disabled={!selectedPlayerId || isSubmittingVote}
            loading={isSubmittingVote}
            testID="mvp-submit-button"
          >
            Selecionar MVP
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
