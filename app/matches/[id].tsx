import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Hand,
  MapPin,
  Share2,
  UserPlus,
  WandSparkles,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PresenceGrid } from '@/components/domain/PresenceGrid';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { StepperField } from '@/components/ui/StepperField';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';
import type { MatchLevel } from '@/features/matches/types/match';
import type {
  DrawMode,
  MatchDetail,
  PlayerPosition,
} from '@/features/matches/types/matchDetail';
import { useAuthStore } from '@/stores/auth';
import { colors, HERO_GRADIENT } from '@/theme/colors';

// ── Pure label maps (token-free; presentational copy) ──
const LEVEL_LABEL: Record<MatchLevel, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

const POSITION_LABEL: Record<PlayerPosition, string> = {
  LEV: 'Levantador',
  PON: 'Ponteiro',
  OPO: 'Oposto',
  CEN: 'Central',
  LIB: 'Líbero',
  COR: 'Corredor',
};

/** "1,2 km" — comma decimal, mirroring MatchCard. */
function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

/**
 * Pure countdown formatter over the match timestamps. Injecting `now` keeps the
 * output deterministic under test. When the confirmation window is still open it
 * counts down to the window close ("Confirmações fecham em …"); once closed it
 * counts down to game start ("Começa em …").
 */
export function formatCountdown(match: MatchDetail, now: Date): string {
  const target = match.confirmationWindowClosed
    ? new Date(match.startsAt)
    : new Date(match.confirmationClosesAt);
  const prefix = match.confirmationWindowClosed
    ? 'Começa em'
    : 'Confirmações fecham em';

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return match.confirmationWindowClosed
      ? 'A partida já começou'
      : 'Confirmações encerradas';
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const time = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  return `${prefix} ${time}`;
}

/** "Hoje · 19h30" style label for the QUANDO cell. */
function formatWhen(startsAt: string): string {
  const date = new Date(startsAt);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const dayLabel = sameDay
    ? 'Hoje'
    : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
  return `${dayLabel} · ${hh}h${mm}`;
}

// ── Inline 2×2 metadata cell (single-use; not extracted per catalog rule) ──
function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 mb-3">
      <Text className="font-body text-eyebrow text-text-muted uppercase">
        {label}
      </Text>
      <Text className="mt-1 font-body text-body-bold text-text-primary">
        {value}
      </Text>
    </View>
  );
}

// ── Lightweight loading skeleton (neutral bg-light-alt blocks) ──
function MatchDetailSkeleton() {
  return (
    <View className="flex-1 bg-bg-light" testID="match-detail-skeleton">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="h-48 rounded-b-card bg-bg-light-alt" />
        <View className="mx-4 -mt-4 h-32 rounded-card bg-bg-light-alt" />
        <View className="mx-4 mt-6 h-40 rounded-card bg-bg-light-alt" />
      </SafeAreaView>
    </View>
  );
}

// ── Error state with retry ──
function MatchDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 bg-bg-light" testID="match-detail-error">
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-body text-body text-text-primary">
          Não foi possível carregar a partida.
        </Text>
        <View className="mt-4 w-full">
          <Button variant="outline" onPress={onRetry} testID="match-detail-retry">
            Tentar de novo
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = id ?? '';
  const userId = useAuthStore((s) => s.userId);
  const insets = useSafeAreaInsets();

  const matchQuery = useMatchDetail(matchId);
  const confirmPresence = useConfirmPresence(matchId);
  const declinePresence = useDeclinePresence(matchId);
  const joinMatch = useJoinMatch(matchId);

  // Organizer team-config — ephemeral local UI state (not API data; not RHF).
  // Defaults come from the payload once it resolves; seeded lazily on first read.
  const [teamCount, setTeamCount] = useState<2 | 3 | 4>(2);
  const [perTeam, setPerTeam] = useState<number>(4);
  const [drawMode, setDrawMode] = useState<DrawMode>('MANUAL');
  const [configSeeded, setConfigSeeded] = useState(false);

  // Seed the team-config from the payload once (organizer view defaults).
  useEffect(() => {
    if (!configSeeded && matchQuery.data) {
      setTeamCount(matchQuery.data.teamConfig.teamCount);
      setPerTeam(matchQuery.data.teamConfig.perTeam);
      setDrawMode(matchQuery.data.teamConfig.drawMode);
      setConfigSeeded(true);
    }
  }, [matchQuery.data, configSeeded]);

  if (matchQuery.isPending) {
    return <MatchDetailSkeleton />;
  }
  if (matchQuery.isError || !matchQuery.data) {
    return <MatchDetailError onRetry={() => void matchQuery.refetch()} />;
  }

  const match = matchQuery.data;

  const isOrganizer = match.organizerId === userId;
  const confirmedCount = match.players.filter(
    (p) => p.status === 'CONFIRMADO',
  ).length;
  const levelLabel = LEVEL_LABEL[match.level];
  const positionLabel = match.organizer.position
    ? POSITION_LABEL[match.organizer.position]
    : undefined;
  const countdownLabel = formatCountdown(match, new Date());

  const onShare = () => {
    void Share.share({
      message: `Bora jogar? "${match.name}" na Quadra. (match:${match.id})`,
    });
  };

  const goToTeams = () => {
    router.push({
      pathname: '/matches/[id]/teams',
      params: {
        id: match.id,
        teamCount: String(teamCount),
        perTeam: String(perTeam),
        drawMode,
      },
    });
  };

  // ── Participant footer CTA logic (SCOPE-driven; explicit booleans) ──
  const isRegular = match.myParticipationType === 'REGULAR';
  const showConfirm =
    isRegular &&
    (match.myStatus === 'PENDENTE' || match.myStatus === 'RECUSADO');
  const isConfirmed = isRegular && match.myStatus === 'CONFIRMADO';
  const showJoin =
    !isRegular && match.openDropInSlots > 0 && match.confirmationWindowClosed;
  const mutationBusy =
    confirmPresence.isPending || declinePresence.isPending || joinMatch.isPending;

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          contentContainerClassName="pb-32"
          contentContainerStyle={{ paddingBottom: insets.bottom + 128 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Dark hero header ── */}
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }}
          >
            <View className="px-4 pt-2 pb-6">
              <View className="flex-row items-center justify-between">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar"
                  onPress={() => router.back()}
                  className="h-10 w-10 items-center justify-center rounded-chip bg-white/15"
                >
                  <ChevronLeft size={24} color={colors.textOnDark} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Compartilhar partida"
                  onPress={onShare}
                  className="h-10 w-10 items-center justify-center rounded-chip bg-white/15"
                  testID="hero-share"
                >
                  <Share2 size={24} color={colors.textOnDark} />
                </Pressable>
              </View>

              {isOrganizer ? (
                <View className="bg-accent rounded-pill px-3 py-1 self-start mt-4">
                  <Text className="font-mono text-mono text-text-primary uppercase">
                    Você organiza
                  </Text>
                </View>
              ) : null}

              <View className="mt-4 flex-row gap-2">
                <View className="bg-white/15 rounded-pill px-3 py-1">
                  <Text className="font-mono text-mono text-text-on-dark uppercase">
                    {match.format}
                  </Text>
                </View>
                <View className="bg-accent rounded-pill px-3 py-1">
                  <Text className="font-mono text-mono text-text-primary uppercase">
                    {levelLabel}
                  </Text>
                </View>
              </View>

              <Text className="mt-3 font-display text-h1 text-text-on-dark uppercase">
                {match.name}
              </Text>
              <View className="mt-2 flex-row items-center gap-1">
                <MapPin size={16} color={colors.textOnDark} />
                <Text className="font-body text-body text-text-on-dark/80">
                  {match.venue} · {formatDistance(match.distanceKm)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── White info card: 2×2 metadata grid + organizer row ── */}
          <View className="mx-4 -mt-4 rounded-card bg-white p-4 shadow-card">
            <View className="flex-row flex-wrap">
              <MetaCell label="QUANDO" value={formatWhen(match.startsAt)} />
              <MetaCell label="MODO" value={match.format} />
              <MetaCell
                label="VAGAS"
                value={`${confirmedCount}/${match.capacity}`}
              />
              <MetaCell label="NÍVEL" value={levelLabel} />
            </View>
            <View className="my-4 h-px bg-line" />
            <View className="flex-row items-center gap-3">
              <Avatar
                uri={match.organizer.avatarUrl}
                name={match.organizer.name}
                size="sm"
              />
              <View className="flex-1">
                <Text className="font-body text-caption text-text-muted">
                  Organizado por
                </Text>
                <Text className="font-body text-body-bold text-text-primary">
                  {match.organizer.name}
                </Text>
              </View>
              {positionLabel ? (
                <View className="bg-primary/10 rounded-pill px-3 py-1">
                  <Text className="font-mono text-mono text-primary uppercase">
                    {positionLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Countdown strip ── */}
          <View className="mx-4 mt-4">
            <Text
              className="text-center font-body text-caption text-text-muted"
              testID="countdown"
            >
              {countdownLabel}
            </Text>
          </View>

          {/* ── CONFIRMADOS section ── */}
          <View className="mx-4 mt-6">
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-eyebrow text-text-primary uppercase">
                Confirmados · {confirmedCount}/{match.capacity}
              </Text>
              {isOrganizer ? (
                <Button
                  variant="outline"
                  onPress={onShare}
                  leftIcon={<UserPlus size={18} color={colors.primary} />}
                  testID="invite"
                >
                  Convidar
                </Button>
              ) : null}
            </View>
            <PresenceGrid
              players={match.players}
              capacity={match.capacity}
              testID="presence-grid"
            />
          </View>

          {/* ── Organizer-only: team configuration (→ S13) ── */}
          {isOrganizer ? (
            <View className="mx-4 mt-8">
              <Text className="font-body text-eyebrow text-text-primary uppercase">
                Configuração dos times
              </Text>
              <View className="mt-2 flex-row gap-2">
                <FilterChip
                  label="2 times"
                  selected={teamCount === 2}
                  onPress={() => setTeamCount(2)}
                  testID="team-count-2"
                />
                <FilterChip
                  label="3 times"
                  selected={teamCount === 3}
                  onPress={() => setTeamCount(3)}
                  testID="team-count-3"
                />
                <FilterChip
                  label="4 times"
                  selected={teamCount === 4}
                  onPress={() => setTeamCount(4)}
                  testID="team-count-4"
                />
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

              <Text className="mt-6 font-body text-eyebrow text-text-primary uppercase">
                Como sortear os times
              </Text>
              {/* Inlined radio rows mirroring ToggleField's chrome (icon + title +
                  caption on a bg-white rounded-card border row), trailing Check
                  when selected. Single-use → no catalog entry. */}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: drawMode === 'MANUAL' }}
                onPress={() => setDrawMode('MANUAL')}
                testID="draw-mode-manual"
                className={`mt-2 flex-row items-center gap-3 rounded-card border p-4 ${
                  drawMode === 'MANUAL'
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-white'
                }`}
              >
                <Hand size={20} color={colors.primary} />
                <View className="flex-1">
                  <Text className="font-body text-h3 text-text-primary">Manual</Text>
                  <Text className="font-body text-caption text-text-muted">
                    Você escolhe quem joga em cada time, na mão
                  </Text>
                </View>
                {drawMode === 'MANUAL' ? (
                  <Check size={20} color={colors.primary} />
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: drawMode === 'AUTO' }}
                onPress={() => setDrawMode('AUTO')}
                testID="draw-mode-auto"
                className={`mt-2 flex-row items-center gap-3 rounded-card border p-4 ${
                  drawMode === 'AUTO'
                    ? 'border-primary bg-primary/5'
                    : 'border-line bg-white'
                }`}
              >
                <WandSparkles size={20} color={colors.primary} />
                <View className="flex-1">
                  <Text className="font-body text-h3 text-text-primary">
                    Automático
                  </Text>
                  <Text className="font-body text-caption text-text-muted">
                    Times equilibrados automaticamente por nível e overall
                  </Text>
                </View>
                {drawMode === 'AUTO' ? (
                  <Check size={20} color={colors.primary} />
                ) : null}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {/* ── Fixed footer ── */}
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 24) }}
        >
          {isOrganizer ? (
            <Button variant="grad" onPress={goToTeams} testID="build-teams">
              Montar os times
            </Button>
          ) : (
            <View className="flex-row items-center gap-3">
              <View>
                <Text className="font-body text-caption text-text-muted">Valor</Text>
                <Text className="font-num text-h3 text-text-primary">
                  {match.priceLabel}
                </Text>
              </View>
              <View className="flex-1">
                {showConfirm ? (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Button
                        variant="primary"
                        onPress={() => confirmPresence.mutate()}
                        loading={confirmPresence.isPending}
                        disabled={mutationBusy && !confirmPresence.isPending}
                        testID="confirm-presence"
                      >
                        Confirmar presença
                      </Button>
                    </View>
                    <View className="flex-1">
                      <Button
                        variant="outline"
                        onPress={() => declinePresence.mutate()}
                        loading={declinePresence.isPending}
                        disabled={mutationBusy && !declinePresence.isPending}
                        testID="decline-presence"
                      >
                        Recusar
                      </Button>
                    </View>
                  </View>
                ) : isConfirmed ? (
                  <View className="flex-row items-center justify-end gap-3">
                    <View className="rounded-pill bg-accent px-4 py-2">
                      <Text className="font-mono text-mono text-text-primary uppercase">
                        Presença confirmada
                      </Text>
                    </View>
                    <Button
                      variant="ghost"
                      onPress={() => declinePresence.mutate()}
                      loading={declinePresence.isPending}
                      testID="decline-presence"
                    >
                      Recusar
                    </Button>
                  </View>
                ) : showJoin ? (
                  <Button
                    variant="primary"
                    onPress={() => joinMatch.mutate()}
                    loading={joinMatch.isPending}
                    testID="join-match"
                  >
                    Entrar na partida
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onPress={() => {}}
                    disabled
                    testID="no-action"
                  >
                    {match.openDropInSlots <= 0
                      ? 'Partida cheia'
                      : 'Aguarde a janela de confirmação'}
                  </Button>
                )}
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
