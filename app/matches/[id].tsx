import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  Calendar,
  Check,
  ChevronLeft,
  Hand,
  MapPin,
  Navigation,
  Play,
  Share2,
  UserPlus,
  WandSparkles,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddGuestSheet } from '@/components/domain/AddGuestSheet';
import { PresenceGrid } from '@/components/domain/PresenceGrid';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CourtImage } from '@/components/ui/CourtImage';
import { FilterChip } from '@/components/ui/FilterChip';
import { StepperField } from '@/components/ui/StepperField';
import { TextField } from '@/components/ui/TextField';
import { useAddGuest } from '@/features/matches/api/addGuest';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { distanceKm } from '@/features/matches/lib/distanceKm';
import { useDeviceCoords } from '@/features/matches/lib/useDeviceCoords';
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
import { ICON_HIT_SLOP, PRESS_RIPPLE } from '@/theme/layout';
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
const HERO_HEIGHT = 210;

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

/**
 * One line of the essentials block under the cover (when / where / price /
 * organizer): leading icon, the content, and an optional trailing action.
 */
function InfoRow({
  icon,
  children,
  trailing,
}: {
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line py-3">
      <View className="w-8 items-center">{icon}</View>
      <View className="flex-1">{children}</View>
      {trailing}
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
      <View className="mx-5 mt-6 h-40 rounded-card bg-bg-light-alt" />
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
  const deviceCoords = useDeviceCoords();
  const confirmPresence = useConfirmPresence(matchId);
  const declinePresence = useDeclinePresence(matchId);
  const joinMatch = useJoinMatch(matchId);
  const addGuest = useAddGuest(matchId);

  // Invite code typed by someone joining a private match.
  const [inviteCode, setInviteCode] = useState('');

  // Organizer "add guest to fill a vaga" sheet (S12).
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);

  // Organizer team-config — ephemeral local UI state (not API data; not RHF).
  // Defaults come from the payload once it resolves; seeded lazily on first read.
  const [teamCount, setTeamCount] = useState<2 | 3 | 4>(2);
  const [perTeam, setPerTeam] = useState<number>(4);
  const [drawMode, setDrawMode] = useState<DrawMode>('MANUAL');
  const [configSeeded, setConfigSeeded] = useState(false);
  // The config starts folded into a one-line summary; the defaults are enough
  // for most games, so the organizer only opens it to change something.
  const [configOpen, setConfigOpen] = useState(false);

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
      message:
        `Bora jogar? "${match.name}" na Quadra. (match:${match.id})` +
        (match.inviteCode ? ` Código de convite: ${match.inviteCode}` : ''),
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

  // ── A game under way (or over) takes over the forward CTA ──
  const GAME_CTA = {
    LIVE: { label: 'Ver placar ao vivo', pathname: '/matches/[id]/scoreboard' },
    VOTING: { label: 'Votar no MVP', pathname: '/matches/[id]/mvp-vote' },
    SUMMARY: { label: 'Ver resumo', pathname: '/matches/[id]/summary' },
  } as const;
  const gameCta = match.game ? GAME_CTA[match.game] : null;
  const goToGame = () => {
    if (gameCta) {
      router.push({ pathname: gameCta.pathname, params: { id: match.id } });
    }
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
    (match.canJoin ??
      (match.openDropInSlots > 0 && match.confirmationWindowClosed));
  const showJoinByCode = !isRegular && !isConfirmed && match.requiresInviteCode;
  const waitingPosition = isConfirmed ? null : match.myWaitingListPosition;
  // The last thing the user tried that the backend refused.
  const actionError = (
    confirmPresence.error ??
    declinePresence.error ??
    joinMatch.error ??
    addGuest.error
  )?.message;
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
          </View>
        </CourtImage>

        {/* ── Body sheet ── */}
        <View className="px-5 pb-5 pt-6">
          {/* ── Essentials: when, where, price, who organizes ── */}
          <InfoRow icon={<Calendar size={22} color={colors.primary} />}>
            <Text className="font-body-semibold text-body-bold text-text-primary">
              {formatWhen(match.startsAt)}
            </Text>
            <Text
              className="font-body text-caption text-text-muted"
              testID="countdown"
            >
              {countdownLabel}
            </Text>
          </InfoRow>

          <InfoRow
            icon={<MapPin size={22} color={colors.primary} />}
            trailing={
              <Pressable
                onPress={() =>
                  // Universal Maps link: opens the Google Maps app (or the browser)
                  // with the route from where the user is.
                  void Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${match.lat},${match.lon}`,
                  )
                }
                accessibilityRole="button"
                accessibilityLabel="Como chegar"
                hitSlop={ICON_HIT_SLOP}
                android_ripple={PRESS_RIPPLE}
                testID="match-directions"
                className="flex-row items-center gap-2 overflow-hidden rounded-pill bg-bg-light px-3 py-2"
              >
                <Navigation size={15} color={colors.primary} />
                <Text className="font-body-semibold text-body-bold text-primary">
                  Como chegar
                </Text>
              </Pressable>
            }
          >
            <Text className="font-body-semibold text-body-bold text-text-primary">
              {match.venue}
              {deviceCoords
                ? ` · ${formatDistance(
                    distanceKm(deviceCoords, {
                      latitude: match.lat,
                      longitude: match.lon,
                    }),
                  )}`
                : ''}
            </Text>
          </InfoRow>

          <InfoRow icon={<Banknote size={22} color={colors.primary} />}>
            {/* Drop-in price first; a recurring match adds the regulars' price. */}
            <Text className="font-body-semibold text-body-bold text-text-primary">
              <Text
                testID="price-single"
                className={match.priceLabel === 'Grátis' ? 'text-success' : ''}
              >
                {match.priceLabel}
              </Text>
              {match.priceLabel === 'Grátis' ? '' : ' avulso'}
              {isRecurring ? ' · ' : ''}
              {isRecurring ? (
                <Text testID="price-monthly" className="text-primary">
                  {match.priceMonthlyLabel}
                </Text>
              ) : null}
              {isRecurring ? ' recorrente' : ''}
            </Text>
            <Text className="font-body text-caption text-text-muted">
              Valor combinado direto com o organizador da partida.
            </Text>
          </InfoRow>

          <InfoRow
            icon={
              <Avatar
                uri={match.organizer.avatarUrl}
                name={match.organizer.name}
                size="sm"
                level={match.organizer.level}
              />
            }
            trailing={
              positionLabel ? (
                <View className="rounded-pill bg-bg-light px-3 py-1">
                  <Text className="font-mono text-mono text-primary uppercase">
                    {positionLabel}
                  </Text>
                </View>
              ) : null
            }
          >
            <Text className="font-body text-caption text-text-muted">
              Organizado por
            </Text>
            <Text className="font-body-semibold text-body-bold text-text-primary">
              {match.organizer.name}
            </Text>
          </InfoRow>

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
              <Pressable
                onPress={() => setConfigOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityState={{ expanded: configOpen }}
                android_ripple={PRESS_RIPPLE}
                testID="team-config-toggle"
                className="flex-row items-center justify-between gap-3 py-2"
              >
                <View className="flex-1">
                  <Text className="font-display text-h2 text-surface-dark uppercase">
                    Configuração dos times
                  </Text>
                  <Text
                    className="mt-1 font-body text-caption text-text-muted"
                    testID="team-config-summary"
                  >
                    {`${teamCount} times · ${perTeam} por time · sorteio ${
                      drawMode === 'AUTO' ? 'automático' : 'manual'
                    }`}
                  </Text>
                </View>
                <Text className="font-body-semibold text-body-bold text-primary">
                  {configOpen ? 'Fechar' : 'Alterar'}
                </Text>
              </Pressable>
              {configOpen ? (
                <>
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
                      <Text className="font-body-extrabold text-h3 text-text-primary">Manual</Text>
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
                      <Text className="font-body-extrabold text-h3 text-text-primary">
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
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Sticky action bar ── */}
      <View
        className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-5 pt-4"
        style={{ paddingBottom: Math.max(insets.bottom, 10) + 10 }}
      >
        {actionError ? (
          <Text
            className="mb-2 font-body text-caption text-danger"
            accessibilityLiveRegion="polite"
            testID="action-error"
          >
            {actionError}
          </Text>
        ) : null}
        {gameCta ? (
          <Button variant="grad" onPress={goToGame} testID="game-cta">
            {gameCta.label}
          </Button>
        ) : isOrganizer ? (
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
            {/* Only the organizer starts the game; once it starts this becomes
                the live-scoreboard CTA above. */}
            <Button
              variant="primary"
              onPress={() => {}}
              disabled
              leftIcon={<Play size={18} color={colors.textOnDark} />}
              testID="start-match"
            >
              Aguardando o início da partida
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
        ) : waitingPosition != null ? (
          <Button variant="primary" onPress={() => {}} disabled testID="waiting-list">
            {`Na fila de espera · ${waitingPosition}º`}
          </Button>
        ) : showJoinByCode ? (
          <>
            <TextField
              label="Código de convite"
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Peça o código a quem organiza"
              autoCapitalize="none"
              maxLength={16}
              testID="invite-code"
            />
            <View className="mt-2">
              <Button
                variant="primary"
                onPress={() => joinMatch.mutate({ inviteCode })}
                loading={joinMatch.isPending}
                disabled={inviteCode.trim().length === 0}
                testID="join-with-code"
              >
                Entrar com o código
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
