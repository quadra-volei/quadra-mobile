import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  Flame,
  Goal,
  Lock,
  type LucideIcon,
  MapPin,
  Share2,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { getTeamBgColor } from '@/features/matches/lib/teamColors';
import {
  matchSummaryQueryKey,
  useMatchSummary,
  type MatchPerformance,
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
 * Route param: id (match id). Summary comes from the backend (F1.6).
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
    return <SummaryError matchId={matchId} message={summaryQuery.error?.message} />;
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
      <Text className="font-body-semibold text-body-bold text-text-on-dark">Resumo da partida</Text>
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
  // "Time 1 venceu: Time 1 3 × 1 Time 2"
  const standingsText = `${summary.winnerName ? `${summary.winnerName} venceu: ` : ''}${summary.standings
    .map((team) => `${team.name} ${team.wins}`)
    .join(' × ')}`;

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await Share.share({
        message: `${summary.name} — ${standingsText}.${hasVoting ? ` MVP: ${summary.mvp.name}.` : ''}`,
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

  const resultA11yLabel = `${resultLabel(summary.result)}${
    summary.winnerName ? `, ${summary.winnerName} venceu` : ''
  }${hasVoting ? `, MVP ${summary.mvp.name}` : ''}`;

  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
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
              <MapPin size={14} color={colors.textOnDark} />
              <Text className="font-body text-caption text-white/70">
                {summary.venue} · {summary.dateLabel}
              </Text>
            </View>

            {summary.winnerName ? (
              <Text
                className="font-body-extrabold text-h3 text-accent mt-4 text-center"
                testID="summary-winner"
              >
                {summary.winnerName} venceu
              </Text>
            ) : null}
          </View>

          {/* ── Games won per team, the winner highlighted ── */}
          <View className="px-4 mt-4 gap-2" testID="summary-standings">
            {summary.standings.map((team) => (
              <View
                key={team.id}
                testID={`summary-team-${team.id}`}
                className={`flex-row items-center gap-3 rounded-card px-4 py-3 ${
                  team.winner ? 'border-2 border-accent bg-white/10' : 'border border-white/10 bg-white/5'
                }`}
              >
                <View className={`h-3 w-3 rounded-full ${getTeamBgColor(team.colorIndex)}`} />
                <Text
                  className="flex-1 font-body-semibold text-body-bold text-text-on-dark"
                  numberOfLines={1}
                >
                  {team.name}
                  {team.mine ? <Text className="text-caption text-accent font-mono"> · seu time</Text> : null}
                </Text>
                {team.winner ? <Trophy size={16} color={colors.accent} /> : null}
                <Text className={`font-num ${team.winner ? 'text-accent' : 'text-text-on-dark'}`} style={{ fontSize: 24 }}>
                  {team.wins}
                </Text>
                <Text className="font-body text-caption text-white/70">
                  {team.wins === 1 ? 'vitória' : 'vitórias'}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Each game and who won it ── */}
          {summary.games.length > 0 ? (
            <View className="px-4 mt-4 gap-1" testID="summary-games">
              {summary.games.map((game) => (
                <View key={game.number} className="flex-row items-center gap-2 py-1">
                  <Text className="font-mono text-mono text-white/70 uppercase w-14">Jogo {game.number}</Text>
                  {game.winner ? (
                    <View className={`h-2 w-2 rounded-full ${getTeamBgColor(game.winner.colorIndex)}`} />
                  ) : null}
                  <Text className="flex-1 font-body text-caption text-text-on-dark" numberOfLines={1}>
                    {game.winner ? `${game.winner.name} venceu` : 'Empate'}
                  </Text>
                  <Text className="font-num text-caption text-text-on-dark">
                    {game.points[0]}–{game.points[1]}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* ── Mais votado ── */}
          {hasVoting ? (
            <View className="px-4 mt-8">
              <View className="flex-row items-center gap-2 mb-3">
                <Trophy size={16} color={colors.accent} />
                <Text className="font-body-bold text-eyebrow text-accent uppercase">Mais votado</Text>
              </View>

              {/* Highlighted MVP card */}
              <View className="flex-row items-center gap-4 p-4 rounded-card border-2 border-accent bg-white/5">
                <Avatar uri={summary.mvp.avatarUrl} name={summary.mvp.name} size="lg" />
                <View className="flex-1">
                  <Text className="font-body-extrabold text-h3 text-text-on-dark">{summary.mvp.name}</Text>
                  <Text className="font-body text-caption text-white/70">
                    @{summary.mvp.handle} · {summary.mvp.position}
                  </Text>
                  <Text className="font-num text-text-on-dark mt-1">
                    {summary.mvp.votes}{' '}
                    <Text className="font-body text-caption text-white/70">de {summary.totalVotes} votos</Text>
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
                      <Text className="font-num text-white/70 w-4">{i + 1}</Text>
                      <Avatar uri={row.avatarUrl} name={row.name} size="sm" />
                      <View className="flex-1">
                        <Text className="font-body-semibold text-body-bold text-text-on-dark">
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
              <Text className="font-body text-caption text-white/70 text-center">
                Sem votação de MVP nesta partida
              </Text>
            </View>
          )}

          {/* ── Meu desempenho ── */}
          <PerformanceSection performance={summary.myPerformance} />
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

/** A single stat tile in the "MEU DESEMPENHO" 2×2 grid. */
function StatTile({
  icon: Icon,
  value,
  label,
  highlight,
  testID,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  highlight?: boolean;
  testID?: string;
}) {
  return (
    <View className="w-[48%] rounded-card bg-white/5 p-4" testID={testID}>
      <View className="flex-row items-start justify-between">
        <View className="h-10 w-10 rounded-full bg-white/10 items-center justify-center">
          <Icon size={18} color={colors.textOnDark} />
        </View>
        {highlight ? <Flame size={16} color={colors.accent} /> : null}
      </View>
      <Text className="font-num text-text-on-dark mt-3" style={{ fontSize: 28 }}>
        {value}
      </Text>
      <Text className="font-body text-caption text-white/70">{label}</Text>
    </View>
  );
}

/**
 * "MEU DESEMPENHO" — the signed-in player's read-only stats for this match:
 * an XP-gained card plus a 2×2 grid of Pontos / Blocks / Defesas / Aces tiles.
 * Fed by summary.myPerformance (F1.6); self-reported stats input stays OUT of MVP.
 */
function PerformanceSection({ performance }: { performance: MatchPerformance }) {
  return (
    <View className="px-4 mt-8" testID="summary-performance">
      <View className="flex-row items-center gap-2 mb-3">
        <User size={16} color={colors.accent} />
        <Text className="font-body-bold text-eyebrow text-accent uppercase">Meu desempenho</Text>
      </View>

      {/* XP-gained card */}
      <View className="flex-row items-center gap-4 p-4 rounded-card bg-white/5">
        <View className="h-12 w-12 rounded-card bg-white/10 items-center justify-center">
          <Flame size={22} color={colors.accent} />
        </View>
        <View className="flex-1">
          <Text className="font-body-semibold text-body-bold text-text-on-dark">XP ganho nesta partida</Text>
          <Text className="font-body text-caption text-white/70">Some ao seu progresso de nível</Text>
        </View>
        <Text className="font-num text-accent" style={{ fontSize: 32 }} testID="summary-xp">
          +{performance.xpGained}
        </Text>
      </View>

      {/* 2×2 stat tiles */}
      <View className="flex-row flex-wrap justify-between gap-y-3 mt-3">
        <StatTile icon={Target} value={performance.points} label="Pontos" highlight testID="summary-stat-points" />
        <StatTile icon={Goal} value={performance.blocks} label="Blocks" testID="summary-stat-blocks" />
        <StatTile icon={Lock} value={performance.defenses} label="Defesas" testID="summary-stat-defenses" />
        <StatTile icon={Zap} value={performance.aces} label="Aces" testID="summary-stat-aces" />
      </View>
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
function SummaryError({ matchId, message }: { matchId: string; message?: string }) {
  const queryClient = useQueryClient();
  return (
    <View className="flex-1 bg-surface-dark">
      <SafeAreaView edges={['top']} className="flex-1">
        <SummaryHeader />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="font-body-extrabold text-h3 text-text-on-dark text-center mb-4">
            {message ?? 'Não foi possível carregar o resumo'}
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
