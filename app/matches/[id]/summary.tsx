import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  BarChart3,
  ChevronLeft,
  Flame,
  Goal,
  Handshake,
  Lock,
  type LucideIcon,
  MapPin,
  Share2,
  Target,
  Trophy,
  User,
  Zap,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { getTeamBgColor, shortTeamName } from '@/features/matches/lib/teamColors';
import { splitVenue } from '@/features/matches/lib/venueName';
import { PLAYER_ACTIONS, type PlayerActionKey } from '@/features/matches/lib/playerActions';
import {
  matchSummaryQueryKey,
  useMatchSummary,
  type MatchPerformance,
  type MatchResult,
  type MatchSummary,
  type SheetRow,
} from '@/features/matches/api/getMatchSummary';
import { CardPiecesMini } from '@/components/domain/CardPiecesMini';
import { piecesWon, useSeasonPass } from '@/features/pass/api/seasonPass';
import { PIECE_COUNT } from '@/features/pass/lib/cardPieces';
import { useMatchPoints } from '@/features/ranking/api/getGroupRanking';
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

/**
 * Who took a game: the winner's short name; "Empate" for a level score; "Sem
 * vencedor" for a game cut short with a lead before the API gave it to the
 * leader (summaries from before 28/10).
 */
function gameLabel(game: MatchSummary['games'][number]): string {
  if (game.winner) return shortTeamName(game.winner.name);
  return game.points[0] === game.points[1] ? 'Empate' : 'Sem vencedor';
}

/** Portuguese label for the result pill / share text. */
function resultLabel(result: MatchResult): string {
  return result === 'VITORIA' ? 'Vitória' : result === 'DERROTA' ? 'Derrota' : 'Sem placar';
}

/** Result pill fill and label color: lime win, red loss, neutral when nobody wins. */
const RESULT_PILL: Record<MatchResult, { box: string; text: string }> = {
  VITORIA: { box: 'bg-accent rounded-pill px-3 py-1', text: 'text-mono text-text-primary uppercase' },
  DERROTA: { box: 'bg-danger rounded-pill px-3 py-1', text: 'text-mono text-text-on-dark uppercase' },
  SEM_PLACAR: { box: 'bg-white/10 rounded-pill px-3 py-1', text: 'text-mono text-text-on-dark uppercase' },
};

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

  const hasVoting = summary.voteRanking.length > 0;
  // "Time 1 venceu: Time 1 3 × 1 Time 2"
  const standingsText = summary.free
    ? 'sem times fixos'
    : `${summary.winnerName ? `${summary.winnerName} venceu: ` : ''}${summary.standings
        .map((team) => `${team.name} ${team.wins}`)
        .join(' × ')}`;

  // The share is a picture of the result (header, teams, games, MVP, the site);
  // a phone that cannot share files gets the full text instead.
  const shotRef = useRef<View>(null);
  const shareText = [
    `🏐 ${summary.name}`,
    [splitVenue(summary.venue).name, summary.dateLabel].filter(Boolean).join(' · '),
    '',
    standingsText,
    ...summary.games.map((game) => `Jogo ${game.number}: ${gameLabel(game)} ${game.points[0]}–${game.points[1]}`),
    hasVoting ? '' : null,
    hasVoting ? `⭐ MVP: ${summary.mvp.name} (${summary.mvp.votes} de ${summary.totalVotes} votos)` : null,
    '',
    'Organize a sua no Quadra: https://quadra-volei.app',
  ]
    .filter((line) => line !== null)
    .join('\n');
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const uri = shotRef.current && (await Sharing.isAvailableAsync())
        ? await captureRef(shotRef.current, { format: 'png', result: 'tmpfile' }).catch(() => null)
        : null;
      if (uri) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: shareText, UTI: 'public.png' });
      } else {
        await Share.share({ message: shareText });
      }
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
          {/* What the shared picture shows: the result, the teams, the games, the MVP. */}
          <View ref={shotRef} collapsable={false} className="bg-surface-dark pb-4">
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
              <View className={RESULT_PILL[summary.result].box} testID="summary-result">
                <Text className={RESULT_PILL[summary.result].text}>{resultLabel(summary.result)}</Text>
              </View>
            </View>

            <Text className="text-display text-text-on-dark uppercase font-display text-center">
              {summary.name}
            </Text>

            {/* The arena's name stands out; its address and the date are secondary
                (owner's 4th review, item 17). */}
            <View className="items-center mt-3" testID="summary-venue">
              <View className="flex-row items-center gap-1">
                <MapPin size={16} color={colors.accent} />
                <Text className="font-body-bold text-body-bold text-text-on-dark" numberOfLines={1}>
                  {splitVenue(summary.venue).name}
                </Text>
              </View>
              <Text className="font-body text-caption text-white/70 text-center mt-0.5" numberOfLines={2}>
                {[splitVenue(summary.venue).address, summary.dateLabel].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>

          {/* ── Games won per team, the winner highlighted (none without fixed teams) ── */}
          {summary.free ? null : (
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
          )}

          {/* ── Each game and who won it ── */}
          {summary.games.length > 0 ? (
            <View className="px-4 mt-4 gap-1" testID="summary-games">
              {summary.games.map((game) => (
                <View key={game.number} className="flex-row items-center gap-2 py-1">
                  <Text className="font-mono text-mono text-white/70 uppercase w-14">Jogo {game.number}</Text>
                  {game.winner ? (
                    <View className={`h-2 w-2 rounded-full ${getTeamBgColor(game.winner.colorIndex)}`} />
                  ) : null}
                  {/* The winner by its color and short name; the score says the rest. */}
                  <Text className="flex-1 font-body-semibold text-caption text-text-on-dark" numberOfLines={1}>
                    {gameLabel(game)}
                  </Text>
                  {game.winner ? <Trophy size={12} color={colors.accent} /> : null}
                  <Text className="font-num text-caption text-text-on-dark">
                    {game.points[0]}–{game.points[1]}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {hasVoting ? (
            <View className="px-4 mt-6 flex-row items-center gap-3" testID="summary-mvp-line">
              <Trophy size={16} color={colors.accent} />
              <Text className="flex-1 font-body-bold text-body-bold text-text-on-dark" numberOfLines={1}>
                {`MVP: ${summary.mvp.name}`}
              </Text>
              <Text className="font-num text-caption text-white/70">{`${summary.mvp.votes} votos`}</Text>
            </View>
          ) : null}
          <Text className="mt-4 text-center font-mono text-mono text-white/40">quadra-volei.app</Text>
          </View>

          <RankingPointsCard matchId={matchId} />

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

          {/* ── Everyone's recorded actions ── */}
          {summary.sheet.length > 0 ? <SheetSection rows={summary.sheet} userId={userId} /> : null}
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

const ACTION_ICON: Record<PlayerActionKey, LucideIcon> = {
  kills: Target,
  blocks: Goal,
  aces: Zap,
  digs: Lock,
  assists: Handshake,
};

/** A single stat tile in the "MEU DESEMPENHO" grid; "—" when nothing was recorded. */
function StatTile({
  icon: Icon,
  value,
  label,
  testID,
}: {
  icon: LucideIcon;
  value: number | null;
  label: string;
  testID?: string;
}) {
  return (
    <View className="w-[31%] rounded-card bg-white/5 p-3" testID={testID}>
      <View className="h-8 w-8 rounded-full bg-white/10 items-center justify-center">
        <Icon size={16} color={colors.textOnDark} />
      </View>
      <Text className="font-num text-text-on-dark mt-2" style={{ fontSize: 24 }}>
        {value ?? '—'}
      </Text>
      <Text className="font-body text-caption text-white/70" numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** "ESTATÍSTICAS DA PARTIDA": each player with recorded actions, one line each. */
function SheetSection({ rows, userId }: { rows: SheetRow[]; userId: string | null }) {
  return (
    <View className="px-4 mt-8" testID="summary-sheet">
      <View className="flex-row items-center gap-2 mb-3">
        <BarChart3 size={16} color={colors.accent} />
        <Text className="font-body-bold text-eyebrow text-accent uppercase">Estatísticas da partida</Text>
      </View>
      <View className="flex-row items-center pb-2">
        <View className="flex-1" />
        {PLAYER_ACTIONS.map(({ key, short }) => (
          <Text key={key} className="w-10 text-center font-body-bold text-eyebrow text-white/70 uppercase">{short}</Text>
        ))}
      </View>
      {rows.map(({ player, actions }) => (
        <View key={player.id} className="flex-row items-center py-2 border-t border-white/10">
          <Text className="flex-1 font-body-semibold text-body text-text-on-dark" numberOfLines={1}>
            {player.name}
            {player.id === userId ? <Text className="text-caption text-accent font-mono"> · você</Text> : null}
          </Text>
          {PLAYER_ACTIONS.map(({ key }) => (
            <Text key={key} className="w-10 text-center font-num text-body text-text-on-dark">{actions[key]}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * "MEU DESEMPENHO" — the signed-in player's read-only numbers for this match:
 * the points it gave, and the five actions the organizer recorded ("—" when
 * nothing was recorded for them).
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
          <Text className="font-body-semibold text-body-bold text-text-on-dark">Pontos nesta partida</Text>
          <Text className="font-body text-caption text-white/70">Presença, vitória e MVP</Text>
        </View>
        <Text className="font-num text-accent" style={{ fontSize: 32 }} testID="summary-xp">
          +{performance.xpGained}
        </Text>
      </View>

      {/* The five recorded actions */}
      <View className="flex-row flex-wrap gap-x-[3.5%] gap-y-3 mt-3">
        {PLAYER_ACTIONS.map(({ key, label }) => (
          <StatTile
            key={key}
            icon={ACTION_ICON[key]}
            value={performance.actions?.[key] ?? null}
            label={label}
            testID={`summary-stat-${key}`}
          />
        ))}
      </View>
      {performance.actions ? null : (
        <Text className="mt-2 font-body text-caption text-white/70">Nenhuma ação registrada para você nesta partida.</Text>
      )}
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

/** "+46 pts no ranking": what this match gave me (quadra-api DECISIONS #95); nothing for one-offs. */
function RankingPointsCard({ matchId }: { matchId: string }) {
  const { data } = useMatchPoints(matchId);
  if (!data) return null;
  const parts = [
    `Presença ${data.attendancePoints}`,
    data.winPoints > 0 ? `${data.gamesWon} ${data.gamesWon === 1 ? 'jogo ganho' : 'jogos ganhos'} ${data.winPoints}` : null,
    data.mvpPoints > 0 ? `${data.mvp ? 'MVP + ' : ''}${data.votes} ${data.votes === 1 ? 'voto' : 'votos'} ${data.mvpPoints}` : null,
  ].filter(Boolean);
  return (
    <View className="px-4 mt-6" testID="summary-ranking-points">
      <View className="p-4 rounded-card border-2 border-accent bg-white/5">
        <Text className="font-body-bold text-eyebrow text-accent uppercase">Ranking do grupo</Text>
        <Text className="font-num text-text-on-dark mt-1" style={{ fontSize: 32 }}>
          +{data.points} <Text className="font-body text-body text-white/70">pts</Text>
        </Text>
        <Text className="font-body text-caption text-white/70">{parts.join(' · ')}</Text>
        <SeasonPassLine />
        <View className="mt-3">
          <Button
            variant="outlineLime"
            onPress={() => router.push({ pathname: '/profile/ranking', params: { scope: 'group', groupId: data.groupId } })}
            testID="summary-ranking-open"
          >
            Ver ranking do grupo
          </Button>
        </View>
      </View>
    </View>
  );
}

/** The same points build the season card (API DECISIONS #98): how many pieces, and the way in. */
function SeasonPassLine() {
  const { data: pass } = useSeasonPass();
  if (!pass || pass.status !== 'Active') return null;
  const won = piecesWon(pass);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/profile/pass')}
      className="mt-3 flex-row items-center gap-3 rounded-chip bg-white/5 px-3 py-2"
      testID="summary-pass"
    >
      <CardPiecesMini collected={won} width={20} />
      <Text className="flex-1 font-body-bold text-caption text-text-on-dark">
        {`Passe da temporada · ${won} de ${PIECE_COUNT} pedaços`}
      </Text>
      <Text className="font-body-bold text-caption text-accent-light">Ver</Text>
    </Pressable>
  );
}
