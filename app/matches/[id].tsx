import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Banknote,
  Calendar,
  Check,
  ChevronLeft,
  MapPin,
  Megaphone,
  Navigation,
  Pencil,
  Play,
  Share2,
  Trophy,
  XCircle,
  UserPlus,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddGuestSheet } from '@/components/domain/AddGuestSheet';
import { PresenceGrid } from '@/components/domain/PresenceGrid';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CourtImage } from '@/components/ui/CourtImage';
import { dialog } from '@/components/ui/Dialog';
import { PressableScale } from '@/components/ui/PressableScale';
import { TextField } from '@/components/ui/TextField';
import { TabIndicator, TabLabel } from '@/components/ui/UnderlineTab';
import { useAddGuest } from '@/features/matches/api/addGuest';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { useShareMatch } from '@/features/network/api/postsApi';
import { useCancelMatch } from '@/features/matches/api/editMatch';
import { distanceKm } from '@/features/matches/lib/distanceKm';
import { formatWhen } from '@/features/matches/lib/formatWhen';
import { LEVEL_BADGE } from '@/features/matches/lib/levelBadge';
import { useDeviceCoords } from '@/features/matches/lib/useDeviceCoords';
import {
  useConfirmPresence,
  useDeclinePresence,
  useJoinMatch,
} from '@/features/matches/api/presence';
import type { AddGuestInput } from '@/features/matches/schema/addGuest';
import type {
  MatchDetail,
  PlayerPosition,
} from '@/features/matches/types/matchDetail';
import { useAuthStore } from '@/stores/auth';
import { colors, COVER_SCRIM, COVER_SCRIM_LOCATIONS } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';
import { MOTION } from '@/theme/motion';

// ── Pure label maps (token-free; presentational copy) ──
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

/** "1,2 km" — comma decimal, mirroring MatchCard. */
function formatDistance(distanceKm: number): string {
  return `${distanceKm.toFixed(1).replace('.', ',')} km`;
}

/** "1h 30min" / "45min". */
function formatDuration(diffMs: number): string {
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

/**
 * Pure countdown formatter over the match timestamps. Injecting `now` keeps the
 * output deterministic under test. Before the confirmation window opens it
 * counts down to the opening ("Confirmações abrem em …"); while it is open, to
 * the close ("Confirmações fecham em …"); once closed, to game start ("Começa
 * em …").
 */
export function formatCountdown(match: MatchDetail, now: Date): string {
  if (match.confirmationOpensAt) {
    const opensIn = new Date(match.confirmationOpensAt).getTime() - now.getTime();
    if (opensIn > 0) return `Confirmações abrem em ${formatDuration(opensIn)}`;
  }

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
  return `${prefix} ${formatDuration(diffMs)}`;
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

/**
 * One of the two tabs under the cover ("Detalhes" / "Confirmados"). No press
 * background: the underline sliding under it (TabIndicator) is the feedback.
 */
function TabButton({
  selected,
  onPress,
  children,
  testID,
}: {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      className="flex-1 items-center pt-3 pb-[14px]"
    >
      <TabLabel
        selected={selected}
        activeColor={colors.primary}
        className="font-body-semibold text-body-bold text-text-muted"
      >
        {children}
      </TabLabel>
    </Pressable>
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
  const shareMatch = useShareMatch();
  const cancelMatch = useCancelMatch(matchId);

  // Invite code typed by someone joining a private match.
  const [inviteCode, setInviteCode] = useState('');

  // Organizer "add guest to fill a vaga" sheet (S12).
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);

  // The screen opens on the match itself; who is going sits one tap away.
  const [tab, setTab] = useState<'details' | 'players'>('details');

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
  // Same arithmetic as PresenceGrid, so the line above the grid matches it.
  const openSlots = Math.max(0, match.capacity - match.players.length);
  const levelBadge = LEVEL_BADGE[match.level];
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

  const onShareToFeed = () => {
    shareMatch.mutate(match.id, {
      onSuccess: () =>
        dialog.alert('Partida compartilhada', 'Ela já aparece na Rede com o botão Participar.'),
      onError: (error) => dialog.alert('Não deu para compartilhar', error.message),
    });
  };

  const onCancelMatch = () => {
    dialog.alert(
      'Cancelar a partida?',
      'Ela sai do mapa e das listas. Quem confirmou vai ver que foi cancelada.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar partida',
          style: 'destructive',
          onPress: () =>
            cancelMatch.mutate(undefined, {
              onError: (error) => dialog.alert('Não deu para cancelar', error.message),
            }),
        },
      ],
    );
  };

  const handleAddGuest = (values: AddGuestInput) => {
    addGuest.mutate(values, {
      onSuccess: () => setGuestSheetOpen(false),
    });
  };

  const goToTeams = () => {
    router.push({ pathname: '/matches/[id]/teams', params: { id: match.id } });
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
  // Before the window opens the backend refuses every confirmation, so the
  // footer says when it opens instead of offering a button that fails.
  const opensLabel =
    match.confirmationOpensAt && !isConfirmed
      ? `Confirmações abrem ${formatWhen(match.confirmationOpensAt)
          .replace('Hoje', 'hoje')
          .replace(' · ', ' às ')}`
      : null;
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
          imageUri={match.coverUrl}
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
              <View
                className="rounded-pill border-[1.5px] border-white px-3 py-1"
                style={{ backgroundColor: levelBadge.bg }}
              >
                <Text
                  className="font-mono text-mono uppercase"
                  style={{ color: levelBadge.color }}
                >
                  {levelBadge.label}
                </Text>
              </View>
            </View>

            <Text className="mt-2 font-display text-h1 text-text-on-dark uppercase">
              {match.name}
            </Text>
          </View>
        </CourtImage>

        {/* ── Tabs ── */}
        <View className="border-b border-line px-5">
        <View className="flex-row" accessibilityRole="tablist">
          <TabButton
            selected={tab === 'details'}
            onPress={() => setTab('details')}
            testID="tab-details"
          >
            Detalhes
          </TabButton>
          <TabButton
            selected={tab === 'players'}
            onPress={() => setTab('players')}
            testID="tab-players"
          >
            Confirmados ·{' '}
            <Text testID="confirmed-count">
              {confirmedCount}/{match.capacity}
            </Text>
          </TabButton>
          <TabIndicator index={tab === 'details' ? 0 : 1} count={2} thickness={2} />
        </View>
        </View>

        {/* The tab's content fades in on a switch instead of cutting. */}
        {tab === 'details' ? (
        <Animated.View
          key="details"
          entering={FadeIn.duration(MOTION.fadeIn)}
          className="px-5 pb-5 pt-3"
        >
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
              <PressableScale
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
                testID="match-directions"
                className="flex-row items-center gap-2 overflow-hidden rounded-pill bg-bg-light px-3 py-2"
              >
                <Navigation size={15} color={colors.primary} />
                <Text className="font-body-semibold text-body-bold text-primary">
                  Como chegar
                </Text>
              </PressableScale>
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

          {/* The match only reaches the Rede feed when its organizer says so. */}
          {isOrganizer ? (
            <View className="mt-5">
              <Button
                variant="outline"
                onPress={onShareToFeed}
                loading={shareMatch.isPending}
                leftIcon={<Megaphone size={18} color={colors.surfaceDark} />}
                testID="share-to-feed"
              >
                Compartilhar na Rede
              </Button>
            </View>
          ) : null}

          {/* Points of a recurring game add up in its group ranking (API DECISIONS #63). */}
          {match.recurring ? (
            <View className="mt-3">
              <Button
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: '/profile/ranking',
                    params: { scope: 'group', groupId: match.id },
                  })
                }
                leftIcon={<Trophy size={18} color={colors.surfaceDark} />}
                testID="group-ranking"
              >
                Ranking do grupo
              </Button>
            </View>
          ) : null}

          {/* Editing and cancelling stop once the game starts (API DECISIONS #62). */}
          {match.editable ? (
            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={() =>
                    router.push({ pathname: '/matches/[id]/edit', params: { id: match.id } })
                  }
                  leftIcon={<Pencil size={18} color={colors.surfaceDark} />}
                  testID="edit-match"
                >
                  Editar
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  variant="outline"
                  onPress={onCancelMatch}
                  loading={cancelMatch.isPending}
                  leftIcon={<XCircle size={18} color={colors.surfaceDark} />}
                  testID="cancel-match"
                >
                  Cancelar
                </Button>
              </View>
            </View>
          ) : null}
        </Animated.View>
        ) : (
        <Animated.View
          key="players"
          entering={FadeIn.duration(MOTION.fadeIn)}
          className="px-5 pb-5 pt-4"
        >
          {/* ── Who is going; the organizer invites and fills open slots ── */}
          <View className="mb-5 flex-row items-center gap-3">
            <View className="flex-1">
              <Text
                className="font-body-semibold text-body-bold text-text-primary"
                testID="open-slots"
              >
                {openSlots === 0
                  ? 'Sem vagas abertas'
                  : openSlots === 1
                    ? '1 vaga aberta'
                    : `${openSlots} vagas abertas`}
              </Text>
              {isOrganizer && openSlots > 0 ? (
                <Text className="font-body text-caption text-text-muted">
                  Toque em uma vaga para adicionar um convidado.
                </Text>
              ) : null}
            </View>
            {isOrganizer ? (
              <Button
                variant="outline"
                onPress={onShare}
                leftIcon={<UserPlus size={18} color={colors.surfaceDark} />}
                testID="invite"
              >
                Convidar
              </Button>
            ) : null}
          </View>
          <PresenceGrid
            players={match.players}
            capacity={match.capacity}
            onPressEmpty={isOrganizer ? () => setGuestSheetOpen(true) : undefined}
            testID="presence-grid"
          />
        </Animated.View>
        )}
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
        {match.cancelled ? (
          <Button variant="primary" onPress={() => {}} disabled testID="match-cancelled">
            Partida cancelada
          </Button>
        ) : gameCta ? (
          <Button variant="grad" onPress={goToGame} testID="game-cta">
            {gameCta.label}
          </Button>
        ) : isOrganizer ? (
          <>
            {/* Building teams works off the confirmed list, so it only shows on
                that tab; the presence toggle below stays on every tab. */}
            {tab === 'players' ? (
              <Button variant="grad" onPress={goToTeams} testID="build-teams">
                Montar os times
              </Button>
            ) : null}
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
                disabled={opensLabel != null}
                testID="organizer-presence"
              >
                {opensLabel ?? (isConfirmed ? 'Não vou jogar' : 'Vou jogar')}
              </Button>
            </View>
          </>
        ) : opensLabel ? (
          <Button variant="primary" onPress={() => {}} disabled testID="not-open-yet">
            {opensLabel}
          </Button>
        ) : showConfirm ? (
          <>
            <Button
              variant="grad"
              onPress={() => confirmPresence.mutate()}
              loading={confirmPresence.isPending}
              disabled={mutationBusy && !confirmPresence.isPending}
              leftIcon={<Check size={18} color={colors.surfaceDark} />}
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
