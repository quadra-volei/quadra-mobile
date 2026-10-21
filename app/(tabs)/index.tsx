import { router } from "expo-router";
import { Settings, Volleyball } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BellWithBadge } from '@/components/domain/BellWithBadge';
import { ActivityRow } from "@/components/domain/ActivityRow";
import { MatchCardCompact } from "@/components/domain/MatchCardCompact";
import { HomeHeroArt } from "@/components/icons/HomeHeroArt";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { type ActivityLine, useFriendsActivity } from "@/features/activity/api/activityApi";
import { useUpcomingMatches } from "@/features/matches/api/getUpcoming";
import { formatStartsAt } from "@/features/matches/lib/formatWhen";
import { countdownLabel, pickNextGame } from "@/features/matches/lib/nextGame";
import { splitVenue } from "@/features/matches/lib/venueName";
import type { UpcomingMatch } from "@/features/matches/types/match";
import { useFollowState } from "@/features/network/api/postsApi";
import { useAuthStore } from "@/stores/auth";
import { HARD_SHADOW, colors } from "@/theme/colors";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

function goExplore() {
  router.push("/explore");
}
function goMatch(id: string) {
  router.push({ pathname: "/matches/[id]", params: { id } });
}
function goSettings() {
  router.push("/profile/settings");
}
function goNotifications() {
  router.push("/notifications");
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 mt-6">
      <Text className="font-display text-h2 text-text-primary uppercase">
        {title}
      </Text>
      <Button variant="ghost" onPress={onAction}>
        {actionLabel}
      </Button>
    </View>
  );
}

function HeroChip({ children }: { children: string }) {
  return (
    <View className="rounded-pill bg-white/15 px-3 py-1">
      <Text
        className="font-body-bold text-text-on-dark uppercase"
        style={{ fontSize: 10, letterSpacing: 0.5 }}
      >
        {children}
      </Text>
    </View>
  );
}

// "N AMIGOS NO QUADRA": the players the user follows. Hidden at zero or while
// loading — never an invented number.
function FriendsChip({ userId }: { userId: string }) {
  const { data } = useFollowState(userId);
  if (!data?.followingCount) return null;
  return (
    <HeroChip>
      {`${data.followingCount} ${data.followingCount === 1 ? "amigo" : "amigos"} no Quadra`}
    </HeroChip>
  );
}

/**
 * Empty Home hero — the blue "Bora pra quadra?" card shown when there is no
 * next game and no upcoming match. Portrait 4:5, filled by a faint
 * court-and-ball art centred behind the copy: the eyebrow on top, the title
 * and chips at the bottom (DECISIONS #102). Creating starts from the tab bar's
 * "+" (DECISIONS #98).
 */
function HomeHero() {
  const userId = useAuthStore((s) => s.userId);
  return (
    <View
      testID="home-hero"
      className="mx-4 justify-between rounded-card bg-primary p-6 overflow-hidden"
      style={{ aspectRatio: 4 / 5 }}
    >
      <HomeHeroArt />
      <Text
        className="font-body-bold text-eyebrow text-accent uppercase"
        style={{ letterSpacing: 1.5 }}
      >
        Seu próximo jogo começa aqui
      </Text>
      <View>
        <Text className="font-display text-display text-white uppercase">
          Bora pra
        </Text>
        <Text className="font-display text-display text-accent uppercase">
          Quadra?
        </Text>
        {userId ? (
          <View className="mt-6 flex-row flex-wrap gap-2">
            <FriendsChip userId={userId} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Re-renders once a minute, so a countdown stays right while the Home is open. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * "VOCÊ ENTRA EM QUADRA": the user's confirmed next game. Navy with the hard
 * shadow, so it reads as a commitment and not as one more card of the list
 * below; a lime countdown on the right.
 */
function NextGameCard({ match }: { match: UpcomingMatch }) {
  const now = useMinuteClock();
  const when = formatStartsAt(match.startsAt);
  const countdown = countdownLabel(match.startsAt, now);
  return (
    <PressableScale
      onPress={() => goMatch(match.id)}
      accessibilityRole="button"
      accessibilityLabel={`Você entra em quadra: ${match.name}, ${when}, ${countdown}`}
      testID="next-game-card"
      className="mx-4 mt-2 flex-row items-center rounded-card border-2 border-surface-dark bg-surface-dark p-4"
      style={HARD_SHADOW}
    >
      <View className="h-12 w-12 items-center justify-center rounded-chip bg-accent">
        <Volleyball size={24} color={colors.surfaceDark} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text
          className="font-body-bold text-text-on-dark"
          style={{ fontSize: 16 }}
          numberOfLines={1}
        >
          {match.name}
        </Text>
        <Text
          className="mt-1 font-body-semibold text-white/70"
          style={{ fontSize: 12.5 }}
          numberOfLines={1}
        >
          {match.venue ? `${when} · ${splitVenue(match.venue).name}` : when}
        </Text>
      </View>
      <View className="ml-2 rounded-pill bg-accent/20 px-[10px] py-1">
        <Text className="font-body-bold text-accent" style={{ fontSize: 11.5 }} testID="next-game-countdown">
          {countdown}
        </Text>
      </View>
    </PressableScale>
  );
}

function UpcomingSection({
  query,
  nextGame,
}: {
  query: ReturnType<typeof useUpcomingMatches>;
  nextGame: UpcomingMatch | undefined;
}) {
  const { data, isPending, isError, refetch } = query;

  if (isPending) {
    return (
      <>
        <SectionHeader title="PRÓXIMAS PARTIDAS" actionLabel="Ver todas" onAction={goExplore} />
        <View className="flex-row px-4 gap-3 mt-2">
          <SkeletonBlock className="w-[262px] h-[248px]" />
          <SkeletonBlock className="w-[262px] h-[248px]" />
        </View>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <SectionHeader title="PRÓXIMAS PARTIDAS" actionLabel="Ver todas" onAction={goExplore} />
        <StateMessage
          message="Não foi possível carregar"
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </>
    );
  }

  // The next game has its own card above; the carousel holds the rest.
  const rest = data.filter((m) => m.id !== nextGame?.id);
  if (rest.length === 0 && nextGame) return null;

  return (
    <>
      <SectionHeader title="PRÓXIMAS PARTIDAS" actionLabel="Ver todas" onAction={goExplore} />
      <FlatList<UpcomingMatch>
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-3 mt-2"
        data={rest}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MatchCardCompact match={item} onPress={goMatch} />
        )}
      />
    </>
  );
}

function goActivityTarget(target: ActivityLine["target"]) {
  router.push({ pathname: target.pathname, params: { id: target.id } });
}
function goAllActivity() {
  router.push("/activity");
}

/**
 * "ATIVIDADE DOS AMIGOS": what the players the user follows did, up to five
 * lines in one card. Hidden while the user follows nobody. On the empty Home
 * (`onlyWithItems`) it only shows up when there is something to show.
 */
function FriendsActivitySection({
  userId,
  onlyWithItems,
}: {
  userId: string;
  onlyWithItems?: boolean;
}) {
  const follows = (useFollowState(userId).data?.followingCount ?? 0) > 0;
  const { data, isPending, isError, refetch } = useFriendsActivity(follows);

  if (!follows) return null;
  if (onlyWithItems && !data?.length) return null;

  const header = (
    <SectionHeader title="ATIVIDADE DOS AMIGOS" actionLabel="Ver tudo" onAction={goAllActivity} />
  );

  if (isPending) {
    return (
      <>
        {header}
        <View testID="activity-loading" className="mx-4 mt-2 gap-2">
          <SkeletonBlock className="h-[68px]" />
          <SkeletonBlock className="h-[68px]" />
        </View>
      </>
    );
  }

  if (isError) {
    return (
      <>
        {header}
        <StateMessage
          message="Não foi possível carregar a atividade"
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <View className="mx-4 mt-2 rounded-card border border-line bg-white shadow-card overflow-hidden">
        {data.length === 0 ? (
          <Text className="px-4 py-4 font-body text-caption text-text-muted">
            Seus amigos ainda não jogaram esta semana
          </Text>
        ) : (
          data.map((activity, i) => (
            <View key={activity.id}>
              {i > 0 ? <View className="h-px bg-line mx-4" /> : null}
              <ActivityRow activity={activity} onPress={goActivityTarget} testID="activity-row" />
            </View>
          ))
        )}
      </View>
    </>
  );
}

export default function HomeScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();

  const upcoming = useUpcomingMatches();
  const userId = useAuthStore((s) => s.userId);

  const nextGame = upcoming.data ? pickNextGame(upcoming.data) : undefined;
  // Empty Home: no upcoming match at all (so no next game either). Loading
  // and errors keep the section with its own state (DECISIONS #104).
  const empty = upcoming.isSuccess && upcoming.data.length === 0;

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {empty ? (
          <HomeHero />
        ) : (
          <>
            {nextGame ? (
              <>
                <SectionHeader
                  title="VOCÊ ENTRA EM QUADRA"
                  actionLabel="Ver jogo"
                  onAction={() => goMatch(nextGame.id)}
                />
                <NextGameCard match={nextGame} />
              </>
            ) : null}
            <UpcomingSection query={upcoming} nextGame={nextGame} />
          </>
        )}
        {userId ? <FriendsActivitySection userId={userId} onlyWithItems={empty} /> : null}
      </ScrollView>

      {/* Screen header */}
      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            INÍCIO
          </Text>
          <View className="flex-row items-center gap-3">
            <IconButton label="Notificações" onPress={goNotifications}>
              <BellWithBadge />
            </IconButton>
            <IconButton label="Configurações" onPress={goSettings}>
              <Settings size={20} color={colors.surfaceDark} />
            </IconButton>
          </View>
        </View>
      </ScreenHeader>
    </View>
  );
}
