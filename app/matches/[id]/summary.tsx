import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Share2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import {
  matchSummaryQueryKey,
  useMatchSummary,
  type MatchResult,
  type MatchSummary,
} from '@/features/matches/api/getMatchSummary';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme/colors';

/**
 * S16 — Match Summary
 *
 * Read-only result screen shown after a match ends and MVP voting concludes:
 * format + Vitória/Derrota, final set score with per-set breakdown, the most-voted
 * MVP, and the vote ranking — with a text-only OS share action and a CTA back to
 * the profile (which resets out of the match stack).
 *
 * Route param: id (match id). Summary is MOCKED this iteration (F1.6).
 */
export default function MatchSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = id ?? '';

  const summaryQuery = useMatchSummary(matchId);

  // ── Loading ──
  if (summaryQuery.isPending) {
    return <SummarySkeleton />;
  }

  // ── Error ──
  if (summaryQuery.isError || !summaryQuery.data) {
    return <SummaryError matchId={matchId} />;
  }

  return <SummaryContent matchId={matchId} summary={summaryQuery.data} />;
}

/** Portuguese label for the result pill / share text. */
function resultLabel(result: MatchResult): string {
  return result === 'VITORIA' ? 'Vitória' : 'Derrota';
}

/** Shared dark header bar (back + title + optional share). */
function SummaryHeader({ onShare, isSharing }: { onShare?: () => void; isSharing?: boolean }) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        testID="summary-back"
      >
        <ChevronLeft size={24} color={colors.textOnDark} />
      </Pressable>
      <Text className="text-body-bold text-text-on-dark">Resumo da partida</Text>
      {onShare ? (
        <Pressable
          onPress={onShare}
          disabled={isSharing}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar resumo"
          testID="summary-share"
        >
          <Share2 size={22} color={colors.textOnDark} />
        </Pressable>
      ) : (
        <View style={{ width: 22 }} />
      )}
    </View>
  );
}

/** Main populated summary. */
function SummaryContent({ matchId, summary }: { matchId: string; summary: MatchSummary }) {
  const userId = useAuthStore((state) => state.userId);
  const [isSharing, setIsSharing] = useState(false);

  const isWin = summary.result === 'VITORIA';
  const hasVoting = summary.voteRanking.length > 0;

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await Share.share({
        message: `${summary.name} — ${resultLabel(summary.result)} ${summary.finalScore[0]}–${summary.finalScore[1]}. MVP: ${summary.mvp.name}.`,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  const resultA11yLabel = `${resultLabel(summary.result)}, placar ${summary.finalScore[0]} a ${summary.finalScore[1]}${
    hasVoting ? `, MVP ${summary.mvp.name}` : ''
  }`;

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        <SummaryHeader onShare={handleShare} isSharing={isSharing} />

        <ScrollView className="flex-1" contentContainerClassName="pb-6">
          {/* ── Result header ── */}
          <View
            className="items-center px-4 pt-2"
            accessible
            accessibilityLabel={resultA11yLabel}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="bg-white/10 rounded-pill px-3 py-1">
                <Text className="text-mono text-text-on-dark uppercase">{summary.format}</Text>
              </View>
              <View className={isWin ? 'bg-accent rounded-pill px-3 py-1' : 'bg-danger rounded-pill px-3 py-1'}>
                <Text
                  className={
                    isWin
                      ? 'text-mono text-text-primary uppercase'
                      : 'text-mono text-text-on-dark uppercase'
                  }
                >
                  {resultLabel(summary.result)}
                </Text>
              </View>
            </View>

            <Text className="text-display text-text-on-dark uppercase font-display text-center">
              {summary.name}
            </Text>

            <View className="flex-row items-center gap-1 mt-2">
              <MapPin size={14} color={colors.textMuted} />
              <Text className="text-caption text-text-muted">
                {summary.venue} · {summary.dateLabel}
              </Text>
            </View>

            {/* Final set score */}
            <Text className="font-num text-accent mt-4" style={{ fontSize: 56 }}>
              {summary.finalScore[0]}–{summary.finalScore[1]}
            </Text>

            {/* Per-set pills — exactly summary.setScores.length */}
            <View className="flex-row flex-wrap justify-center gap-2 mt-4">
              {summary.setScores.map((s, i) => (
                <View key={i} className="bg-white/10 rounded-chip px-3 py-1">
                  <Text className="font-num text-text-on-dark text-caption">
                    {s[0]}-{s[1]}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── MVP mais votado ── */}
          {hasVoting ? (
            <View className="px-4 mt-8">
              <View className="flex-row items-center gap-2 mb-3">
                <Trophy size={16} color={colors.accent} />
                <Text className="text-eyebrow text-accent uppercase">MVP mais votado</Text>
              </View>

              {/* Highlighted MVP card */}
              <View className="flex-row items-center gap-4 p-4 rounded-card border-2 border-accent bg-white/5">
                <Avatar uri={summary.mvp.avatarUrl} name={summary.mvp.name} size="lg" />
                <View className="flex-1">
                  <Text className="text-h3 text-text-on-dark">{summary.mvp.name}</Text>
                  <Text className="text-caption text-text-muted">
                    @{summary.mvp.handle} · {summary.mvp.position}
                  </Text>
                  <Text className="font-num text-text-on-dark mt-1">
                    {summary.mvp.votes}{' '}
                    <Text className="text-caption text-text-muted">de {summary.totalVotes} votos</Text>
                  </Text>
                </View>
              </View>

              {/* Vote ranking */}
              <View className="mt-4 gap-3">
                {summary.voteRanking.map((row, i) => {
                  const isCurrentUser = row.id === userId;
                  const fillRatio = summary.maxVotes > 0 ? row.votes / summary.maxVotes : 0;
                  const fillPct = Math.min(Math.max(fillRatio, 0), 1) * 100;
                  return (
                    <View key={row.id} className="flex-row items-center gap-3">
                      <Text className="font-num text-text-muted w-4">{i + 1}</Text>
                      <Avatar uri={row.avatarUrl} name={row.name} size="sm" />
                      <View className="flex-1">
                        <Text className="text-body-bold text-text-on-dark">
                          {row.name}
                          {isCurrentUser ? (
                            <Text className="text-caption text-accent font-mono"> · você</Text>
                          ) : null}
                        </Text>
                        {/* Vote bar: track + lime fill; fill width is the only inline style (runtime %). */}
                        <View className="h-2 rounded-pill bg-white/10 mt-1">
                          <View
                            className="h-2 rounded-pill bg-accent"
                            style={{ width: `${fillPct}%` }}
                          />
                        </View>
                      </View>
                      <Text className="font-num text-text-on-dark">{row.votes}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View className="px-4 mt-8">
              <Text className="text-caption text-text-muted text-center">
                Sem votação de MVP nesta partida
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Bottom CTA ── */}
        <View className="px-4 pb-4">
          <Button variant="grad" onPress={handleBackToProfile} testID="summary-back-to-profile">
            Voltar para o perfil
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Loading skeleton: shimmer score block, placeholder MVP card, 3 ranking rows. */
function SummarySkeleton() {
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        <SummaryHeader />

        <View className="px-4 pt-2">
          {/* Result header placeholder */}
          <View className="items-center">
            <View className="h-6 w-40 rounded-pill bg-white/10 mb-3" />
            <View className="h-10 w-64 rounded-chip bg-white/10" />
            <View className="h-14 w-32 rounded-chip bg-white/10 mt-4" />
          </View>

          {/* MVP card placeholder */}
          <View className="h-24 rounded-card bg-white/10 mt-8" />

          {/* Ranking rows placeholder */}
          <View className="mt-4 gap-3">
            {[0, 1, 2].map((i) => (
              <View key={i} className="flex-row items-center gap-3">
                <View className="h-10 w-10 rounded-full bg-white/10" />
                <View className="flex-1 h-6 rounded-pill bg-white/10" />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Error state: centered message + recoverable retry. */
function SummaryError({ matchId }: { matchId: string }) {
  const queryClient = useQueryClient();
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        <SummaryHeader />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-h3 text-text-on-dark text-center mb-4">
            Não foi possível carregar o resumo
          </Text>
          <Button
            variant="outlineW"
            onPress={() =>
              queryClient.invalidateQueries({ queryKey: matchSummaryQueryKey(matchId) })
            }
            testID="summary-retry"
          >
            Tentar novamente
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
