import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Calendar,
  Check,
  ChevronLeft,
  Hand,
  MapPin,
  Play,
  Share2,
  UserPlus,
  Users,
  Volleyball,
  WandSparkles,
  Zap,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddGuestSheet } from '@/components/domain/AddGuestSheet';
import { PresenceGrid } from '@/components/domain/PresenceGrid';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CourtImage } from '@/components/ui/CourtImage';
import { FilterChip } from '@/components/ui/FilterChip';
import { StepperField } from '@/components/ui/StepperField';
import { useAddGuest } from '@/features/matches/api/addGuest';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';
import type { AddGuestInput } from '@/features/matches/schema/addGuest';
import type { MatchLevel } from '@/features/matches/types/match';
import type {
  DrawMode,
  MatchDetail,
  PlayerPosition,
} from '@/features/matches/types/matchDetail';
import { useAuthStore } from '@/stores/auth';
import { colors, COVER_SCRIM, COVER_SCRIM_LOCATIONS } from '@/theme/colors';
import { LEVEL_LEGEND } from '@/theme/levelTier';

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

/** Cover height; the hero bleeds under the status bar, as in the prototype. */
const HERO_HEIGHT = 270;

/** Only a hint of the open slots is shown, however empty the match is. */
const MAX_VAGA_SLOTS = 3;

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

// ── Inline single-use pieces (not extracted, per the catalog's one-off rule) ──

/** One icon + label + value cell of the 2×2 metadata grid. */
function InfoCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="mb-4 w-1/2 flex-row items-center gap-3 pr-2">
      <View className="w-6 items-center">{icon}</View>
      <View className="flex-1">
        <Text className="font-body-semibold text-eyebrow text-text-muted uppercase">
          {label}
        </Text>
        <Text className="font-body-semibold text-body-bold text-text-primary">
          {value}
        </Text>
      </View>
    </View>
  );
}

/**
 * One price of the VALORES section. `accent` marks the plan the match is billed
 * on (the recurring one), which the prototype highlights in primary. "Grátis"
 * reads in `success` rather than the neutral price color.
 */
function PriceTile({
  label,
  value,
  accent,
  testID,
}: {
  label: string;
  value: string;
  accent?: boolean;
  testID?: string;
}) {
  const isFree = value === 'Grátis';
  const valueColor = isFree
    ? 'text-success'
    : accent
      ? 'text-primary'
      : 'text-surface-dark';
  return (
    <View
      testID={testID}
      className={`flex-1 rounded-chip border p-3 ${
        accent ? 'border-primary bg-primary/5' : 'border-line bg-white'
      }`}
    >
      <Text
        className={`font-body-bold text-eyebrow uppercase ${
          accent ? 'text-primary' : 'text-text-muted'
        }`}
      >
        {label}
      </Text>
      <Text className={`mt-1 font-num text-h1 ${valueColor}`}>{value}</Text>
    </View>
  );
}

/** Explains the tier-colored level "bolinha" carried by each grid avatar. */
function LevelLegend() {
  return (
    <View
      testID="level-legend"
      className="mt-2 flex-row flex-wrap gap-x-3 gap-y-2 border-t border-line pt-3"
    >
      {LEVEL_LEGEND.map((tier) => (
        <View key={tier.label} className="flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tier.color }}
          />
          <Text className="font-body text-caption text-text-muted">
            {tier.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Circular translucent hero action (back / share) over the cover. */
function HeroAction({
  label,
  onPress,
  children,
  testID,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-dark/35"
    >
      {children}
    </Pressable>
  );
}

// ── Lightweight loading skeleton (neutral bg-light-alt blocks) ──
function MatchDetailSkeleton() {
  return (
    <View className="flex-1 bg-white" testID="match-detail-skeleton">
      <View className="bg-bg-light-alt" style={{ height: HERO_HEIGHT }} />
      <View className="mx-5 mt-6 h-24 rounded-card bg-bg-light-alt" />
      <View className="mx-5 mt-6 h-40 rounded-card bg-bg-light-alt" />
    </View>
  );
}

// ── Error state with retry ──
function MatchDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 bg-white" testID="match-detail-error">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center font-body text-body text-text-primary">
          Não foi possível carregar a partida.
        </Text>
        <View className="mt-4 w-full">
          <Button variant="outline" onPress={onRetry} testID="match-detail-retry">
            Tentar de novo
          </Button>
        </View>
      </View>
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
  const addGuest = useAddGuest(matchId);

  // Organizer "add guest to fill a vaga" sheet (S12).
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);

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
  const isRecurring =
    match.pricePlan === 'RECORRENTE' && Boolean(match.priceMonthlyLabel);

  const onShare = () => {
    void Share.share({
      message: `Bora jogar? "${match.name}" na Quadra. (match:${match.id})`,
    });
  };

  const handleAddGuest = (values: AddGuestInput) => {
    addGuest.mutate(values, {
      onSuccess: () => setGuestSheetOpen(false),
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
  // Confirmed covers a drop-in who already took a slot, not just an invited
  // Regular — either way the user is in the match and past the join step.
  const isConfirmed =
    match.myParticipationType != null && match.myStatus === 'CONFIRMADO';
  const showJoin =
    !isRegular &&
    !isConfirmed &&
    match.openDropInSlots > 0 &&
    match.confirmationWindowClosed;
  const mutationBusy =
    confirmPresence.isPending || declinePresence.isPending || joinMatch.isPending;

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 148 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Court-image hero (bleeds under the status bar) ── */}
        <CourtImage
          tint={match.tint}
          height={HERO_HEIGHT}
          radius={0}
          label="FOTO DA QUADRA"
        >
          {/* Scrim: keeps the actions (top) and the title block (bottom) legible
              over any tint. */}
          <LinearGradient
            colors={COVER_SCRIM}
            locations={COVER_SCRIM_LOCATIONS}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />

          <View
            className="absolute left-4 right-4 flex-row items-center justify-between"
            style={{ top: Math.max(insets.top, 12) }}
          >
            <HeroAction label="Voltar" onPress={() => router.back()}>
              <ChevronLeft size={24} color={colors.textOnDark} />
            </HeroAction>
            <HeroAction
              label="Compartilhar partida"
              onPress={onShare}
              testID="hero-share"
            >
              <Share2 size={24} color={colors.textOnDark} />
            </HeroAction>
          </View>

          <View className="absolute bottom-4 left-5 right-5">
            {isOrganizer ? (
              <View className="mb-2 self-start rounded-pill bg-accent px-3 py-1">
                <Text className="font-mono text-mono text-text-primary uppercase">
                  Você organiza
                </Text>
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <View className="rounded-pill bg-white/90 px-3 py-1">
                <Text className="font-mono text-mono text-text-primary uppercase">
                  {match.format}
                </Text>
              </View>
              <View className="rounded-pill bg-accent px-3 py-1">
                <Text className="font-mono text-mono text-text-primary uppercase">
                  {levelLabel}
                </Text>
              </View>
            </View>

            <Text className="mt-2 font-display text-h1 text-text-on-dark uppercase">
              {match.name}
            </Text>
            <View className="mt-1 flex-row items-center gap-1">
              <MapPin size={15} color={colors.textOnDark} />
              <Text className="font-body text-body text-text-on-dark/85">
                {match.venue} · {formatDistance(match.distanceKm)}
              </Text>
            </View>
          </View>
        </CourtImage>

        {/* ── Body sheet ── */}
        <View className="px-5 pb-5 pt-6">
          {/* 2×2 metadata grid */}
          <View className="flex-row flex-wrap">
            <InfoCell
              icon={<Calendar size={22} color={colors.primary} />}
              label="Quando"
              value={formatWhen(match.startsAt)}
            />
            <InfoCell
              icon={<Volleyball size={22} color={colors.primary} />}
              label="Modo"
              value={match.format}
            />
            <InfoCell
              icon={<Users size={22} color={colors.primary} />}
              label="Vagas"
              value={`${confirmedCount}/${match.capacity}`}
            />
            <InfoCell
              icon={<Zap size={22} color={colors.primary} />}
              label="Nível"
              value={levelLabel}
            />
          </View>

          {/* Countdown strip */}
          <Text
            className="mt-1 text-center font-body text-caption text-text-muted"
            testID="countdown"
          >
            {countdownLabel}
          </Text>

          {/* ── VALORES ── */}
          <View className="mt-6">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-display text-h2 text-surface-dark uppercase">
                Valores
              </Text>
              <View
                className={`rounded-pill px-3 py-1 ${
                  isRecurring ? 'bg-primary' : 'bg-bg-light'
                }`}
              >
                <Text
                  className={`font-mono text-mono uppercase ${
                    isRecurring ? 'text-text-on-dark' : 'text-primary'
                  }`}
                >
                  {isRecurring ? 'Recorrente' : 'Avulso'}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <PriceTile
                label="Jogador avulso"
                value={match.priceLabel}
                testID="price-single"
              />
              {isRecurring && match.priceMonthlyLabel ? (
                <PriceTile
                  label="Jogador recorrente"
                  value={match.priceMonthlyLabel}
                  accent
                  testID="price-monthly"
                />
              ) : null}
            </View>

            <View className="mt-3 flex-row items-start gap-2">
              <MapPin size={13} color={colors.textMuted} />
              <Text className="flex-1 font-body text-caption text-text-muted">
                Valor combinado direto com o organizador da partida.
              </Text>
            </View>
          </View>

          {/* ── Organizer row ── */}
          <View className="mt-6 flex-row items-center gap-3 rounded-card bg-white p-4 shadow-card">
            <Avatar
              uri={match.organizer.avatarUrl}
              name={match.organizer.name}
              size="md"
              level={match.organizer.level}
            />
            <View className="flex-1">
              <Text className="font-body-medium text-caption text-text-muted">
                Organizado por
              </Text>
              <Text className="font-body-bold text-body-bold text-text-primary">
                {match.organizer.name}
              </Text>
            </View>
            {positionLabel ? (
              <View className="rounded-pill bg-bg-light px-3 py-1">
                <Text className="font-mono text-mono text-primary uppercase">
                  {positionLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── CONFIRMADOS ── */}
          <View className="mt-6 flex-row items-center justify-between">
            <Text className="font-display text-h2 text-surface-dark uppercase">
              Confirmados
            </Text>
            <View className="flex-row items-center gap-3">
              <Text
                className="font-body-bold text-body-bold text-primary"
                testID="confirmed-count"
              >
                {confirmedCount}/{match.capacity}
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
          </View>
          <PresenceGrid
            players={match.players}
            capacity={match.capacity}
            maxEmptySlots={MAX_VAGA_SLOTS}
            onPressEmpty={isOrganizer ? () => setGuestSheetOpen(true) : undefined}
            testID="presence-grid"
          />
          <LevelLegend />

          {/* ── Organizer-only: team configuration (→ S13) ── */}
          {isOrganizer ? (
            <View className="mt-8">
              <Text className="font-display text-h2 text-surface-dark uppercase">
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

              <Text className="mt-6 font-display text-h2 text-surface-dark uppercase">
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
        </View>
      </ScrollView>

      {/* ── Sticky action bar ── */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 10) + 10 }}
      >
        {isOrganizer ? (
          <>
            <Button variant="grad" onPress={goToTeams} testID="build-teams">
              Montar os times
            </Button>
            {/* Organizing is not playing: the organizer opts into the confirmed
                grid (and back out of it) here, without losing the forward CTA
                they need whether or not they play. */}
            <View className="mt-1">
              <Button
                variant="ghost"
                onPress={() =>
                  isConfirmed
                    ? declinePresence.mutate()
                    : confirmPresence.mutate()
                }
                loading={confirmPresence.isPending || declinePresence.isPending}
                testID="organizer-presence"
              >
                {isConfirmed ? 'Não vou jogar' : 'Vou jogar'}
              </Button>
            </View>
          </>
        ) : showConfirm ? (
          <>
            <Button
              variant="grad"
              onPress={() => confirmPresence.mutate()}
              loading={confirmPresence.isPending}
              disabled={mutationBusy && !confirmPresence.isPending}
              leftIcon={<Check size={18} color={colors.textOnDark} />}
              testID="confirm-presence"
            >
              Confirmar presença
            </Button>
            <View className="mt-1">
              <Button
                variant="ghost"
                onPress={() => declinePresence.mutate()}
                loading={declinePresence.isPending}
                disabled={mutationBusy && !declinePresence.isPending}
                testID="decline-presence"
              >
                Não vou poder ir
              </Button>
            </View>
          </>
        ) : isConfirmed ? (
          <>
            <Button
              variant="primary"
              onPress={goToTeams}
              leftIcon={<Play size={18} color={colors.textOnDark} />}
              testID="start-match"
            >
              Iniciar partida
            </Button>
            <View className="mt-1">
              <Button
                variant="ghost"
                onPress={() => declinePresence.mutate()}
                loading={declinePresence.isPending}
                testID="decline-presence"
              >
                Não vou poder ir
              </Button>
            </View>
          </>
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
          <Button variant="primary" onPress={() => {}} disabled testID="no-action">
            {match.openDropInSlots <= 0
              ? 'Partida cheia'
              : 'Aguarde a janela de confirmação'}
          </Button>
        )}
      </View>

      {/* ── Organizer: add-guest bottom sheet ── */}
      <AddGuestSheet
        visible={guestSheetOpen}
        onClose={() => setGuestSheetOpen(false)}
        onSubmit={handleAddGuest}
        submitting={addGuest.isPending}
        testID="add-guest-sheet"
      />
    </View>
  );
}
