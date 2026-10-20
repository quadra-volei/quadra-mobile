import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  useFinishMatch,
  useIsOrganizer,
  useMatchPlayers,
  useVoteMVPMutation,
  type MatchPlayer,
} from '@/features/matches/api/useMVPVote';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

/**
 * The navy frame every state of the screen shares: back, the "QUEM BRILHOU?"
 * hero and one line saying what to do now. Secondary text on navy is
 * `text-white/70` (`text-text-muted` is the muted tone for light surfaces).
 */
function Frame({ hint, children }: { hint?: string; children: ReactNode }) {
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-row items-center px-4 py-4">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={ICON_HIT_SLOP}
          >
            <ChevronLeft size={24} color={colors.textOnDark} />
          </Pressable>
        </View>

        <View className="px-4 pb-6 items-center">
          <Text className="font-body-bold text-eyebrow text-accent uppercase">MVP DA PARTIDA</Text>
          <Text className="text-display text-text-on-dark uppercase font-display mt-2 text-center">
            QUEM BRILHOU?
          </Text>
          {hint ? (
            <Text className="font-body text-body text-white/70 text-center mt-2">{hint}</Text>
          ) : null}
        </View>

        {children}
      </SafeAreaView>
    </View>
  );
}

/**
 * What comes after the vote. The organizer closes the voting and generates the
 * summary (that is what records the result for everyone), after confirming,
 * because nobody can vote once it is closed; the others can open the summary
 * once it exists.
 */
function WrapUp({ matchId, emphasis }: { matchId: string; emphasis: boolean }) {
  const isOrganizer = useIsOrganizer(matchId);
  const finishMatch = useFinishMatch(matchId);
  const goToSummary = () =>
    router.replace({ pathname: '/matches/[id]/summary', params: { id: matchId } });

  const confirmFinish = () =>
    dialog.alert(
      'Encerrar a votação?',
      'Quem ainda não votou não vai mais poder votar. O resumo da partida é gerado com os votos de agora.',
      [
        { text: 'Ainda não', style: 'cancel' },
        {
          text: 'Encerrar',
          onPress: () => finishMatch.mutate(undefined, { onSuccess: goToSummary }),
        },
      ],
    );

  return (
    <View className="px-4 pb-4">
      {isOrganizer ? (
        <Button
          variant={emphasis ? 'grad' : 'outlineW'}
          onPress={confirmFinish}
          loading={finishMatch.isPending}
          testID="mvp-finish-button"
        >
          Encerrar votação e ver resumo
        </Button>
      ) : (
        <Button variant="outlineW" onPress={goToSummary} testID="mvp-summary-button">
          Ver resumo da partida
        </Button>
      )}
      {finishMatch.error ? <ErrorNote>{finishMatch.error.message}</ErrorNote> : null}
    </View>
  );
}

/** An error line that stays readable on navy (red text on navy does not). */
function ErrorNote({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View className="mt-2 rounded-chip border border-danger bg-danger/20 px-3 py-2">
      <Text
        className="text-center font-body-semibold text-caption text-text-on-dark"
        accessibilityLiveRegion="polite"
        testID={testID}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * S15 — Post-Match MVP Vote.
 *
 * Who votes: whoever played (was on a drawn team) and the organizer, even when
 * they sat out. Anyone else is told so and only gets the way to the summary.
 * Nobody votes for themselves; a vote can be changed while the voting is open.
 */
export default function MvpVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = id ?? '';
  const userId = useAuthStore((state) => state.userId);

  // Server state: fetch match players
  const playersQuery = useMatchPlayers(matchId);
  const isOrganizer = useIsOrganizer(matchId);

  // Mutation: submit MVP vote
  const voteMutation = useVoteMVPMutation(matchId);

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
      },
    });
  };

  const isSubmittingVote = voteMutation.isPending;

  if (playersQuery.isPending) {
    return (
      <Frame>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </Frame>
    );
  }

  if (playersQuery.isError) {
    return (
      <Frame>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-body-extrabold text-h3 text-text-on-dark text-center mb-4">
            Não foi possível carregar os jogadores
          </Text>
          <Button variant="outlineW" onPress={() => playersQuery.refetch()}>
            Tentar novamente
          </Button>
        </View>
      </Frame>
    );
  }

  const players = playersQuery.data ?? [];
  const played = players.some((player) => player.id === userId);

  // Someone who did not play (and does not organize) has no vote.
  if (!played && !isOrganizer) {
    return (
      <Frame>
        <View className="flex-1 items-center justify-center px-6" testID="mvp-cannot-vote">
          <Text className="font-body-extrabold text-h3 text-text-on-dark text-center">
            Só quem jogou vota no MVP.
          </Text>
          <Text className="font-body text-body text-white/70 text-center mt-2">
            O resultado aparece no resumo da partida.
          </Text>
        </View>
        <WrapUp matchId={matchId} emphasis={false} />
      </Frame>
    );
  }

  // Post-vote state
  if (hasVoted && votedForPlayer) {
    return (
      <Frame>
        <View className="flex-1 items-center justify-center px-6">
          <Avatar uri={votedForPlayer.avatarUrl} name={votedForPlayer.name} size="lg" />
          <Text
            className="font-body-extrabold text-h3 text-text-on-dark text-center mt-4"
            accessibilityLiveRegion="polite"
          >
            Você votou em {votedForPlayer.name}.
          </Text>
          <Text className="font-body text-body text-white/70 text-center mt-2">
            O MVP sai quando quem organiza encerrar a votação. Até lá dá para trocar o voto.
          </Text>
        </View>
        <View className="px-4 pb-3">
          <Button
            variant="outlineW"
            onPress={() => setHasVoted(false)}
            testID="mvp-change-vote"
          >
            Trocar voto
          </Button>
        </View>
        <WrapUp matchId={matchId} emphasis />
      </Frame>
    );
  }

  // Pre-vote state: player selection
  return (
    <Frame hint="Escolha quem mais se destacou. Não dá para votar em você.">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 gap-3 pb-4">
          {players.map((player) => {
            const isCurrentUser = player.id === userId;
            const isSelected = selectedPlayerId === player.id;

            return (
              <PressableScale
                key={player.id}
                onPress={() => !isCurrentUser && handleSelectPlayer(player.id)}
                disabled={isCurrentUser}
                accessibilityRole="radio"
                accessibilityState={{
                  selected: isSelected,
                  disabled: isCurrentUser,
                }}
                className={`flex-row items-center gap-4 p-4 rounded-card border-2 overflow-hidden ${
                  isSelected
                    ? 'bg-white/10 border-accent'
                    : isCurrentUser
                      ? 'bg-white/5 border-white/10 opacity-50'
                      : 'bg-surface-dark-alt border-white/10'
                }`}
              >
                <Avatar uri={player.avatarUrl} name={player.name} size="md" />
                <View className="flex-1">
                  <Text className="font-body-extrabold text-h3 text-text-on-dark">{player.name}</Text>
                  <Text className="font-body text-caption text-white/70">
                    @{player.handle} · {player.position}
                  </Text>
                </View>
                {isCurrentUser ? (
                  <Text className="text-caption text-accent font-mono">você</Text>
                ) : isSelected ? (
                  <View className="h-6 w-6 rounded-full bg-accent items-center justify-center">
                    <View className="h-2 w-2 rounded-full bg-surface-dark" />
                  </View>
                ) : (
                  <View className="h-6 w-6 rounded-full border-2 border-white/40" />
                )}
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-4 pt-4 pb-3 border-t border-white/10">
        <Button
          variant="grad"
          onPress={handleSubmitVote}
          disabled={!selectedPlayerId || isSubmittingVote}
          loading={isSubmittingVote}
          testID="mvp-submit-button"
        >
          Confirmar voto
        </Button>
        {voteMutation.error ? (
          <ErrorNote testID="mvp-vote-error">{voteMutation.error.message}</ErrorNote>
        ) : null}
      </View>
      <WrapUp matchId={matchId} emphasis={false} />
    </Frame>
  );
}
