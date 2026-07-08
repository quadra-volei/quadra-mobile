import { BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, Settings } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { LevelBar } from "@/components/domain/LevelBar";
import { MatchHistoryRow } from "@/components/domain/MatchHistoryRow";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useRecentMatches } from "@/features/profile/api/getRecentMatches";
import { useRegisterNavBlurTarget } from "@/stores/navBlurTarget";
import { useGroupRanking } from "@/features/ranking/api/getGroupRanking";
import type { RankingRow } from "@/features/ranking/types/ranking";
import { useAuthStore } from "@/stores/auth";
import { colors, HERO_GRADIENT } from "@/theme/colors";

function goRanking() {
  router.push("/profile/ranking");
}
function goSettings() {
  router.push("/profile/settings");
}
function goMatchSummary(id: string) {
  // "Minhas partidas" lists past matches — open the read-only summary, not the live detail.
  router.push({ pathname: "/matches/[id]/summary", params: { id } });
}

/** Neutral rounded skeleton block (DESIGN_SYSTEM skeleton shapes TBD — flag). */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-bg-light-alt rounded-card ${className}`} />;
}

function SectionTitleRow({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="flex-row items-center justify-between px-4 mt-6">
      {/* In-screen section title: text-h2, one step below the profile header
          (the greeting name, h1). See DESIGN_SYSTEM heading hierarchy. */}
      <Text className="font-display text-h2 text-text-primary uppercase">
        {title}
      </Text>
      {action ? (
        <Button variant="ghost" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="px-4 py-6 items-center" accessibilityLiveRegion="polite">
      <Text className="font-body text-body text-text-muted text-center">
        Não foi possível carregar
      </Text>
      <Button variant="ghost" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

// ── Header (inline; avatar + greeting variant — the one identity-carrying tab) ──
function ProfileHeader() {
  const { data } = useMyProfile();

  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
      <View className="flex-row items-center gap-3">
        <Avatar uri={data?.avatarUrl} name={data?.firstName} size="md" />
        <View>
          <Text className="font-body text-caption text-text-muted">Olá,</Text>
          <Text className="font-display text-h1 text-text-primary uppercase">
            {data?.firstName ?? "..."}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificações"
          onPress={() => {}}
        >
          <Bell size={24} color={colors.surfaceDark} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          onPress={goSettings}
        >
          <Settings size={24} color={colors.surfaceDark} />
        </Pressable>
      </View>
    </View>
  );
}

// ── "Seu progresso" card (GERAL + Level/XP only — stats grid & CTA cut) ──
function ProgressSection() {
  const { data, isPending, isError, refetch } = useMyProfile();

  if (isPending) {
    return <SkeletonBlock className="mx-4 h-36" />;
  }
  if (isError) {
    return (
      <View className="mx-4 bg-white rounded-card shadow-card">
        <ErrorRow onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="mx-4 bg-white rounded-card shadow-card p-4">
      {/* In-screen section title: text-h2 (one step below the profile header). */}
      <Text className="font-display text-h2 text-text-primary uppercase">
        Seu progresso
      </Text>
      <View className="flex-row items-center gap-3 mt-3">
        <Text className="font-mono text-mono text-text-muted uppercase">
          Geral
        </Text>
        <Text className="font-num text-primary text-num">{data.overall}</Text>
      </View>
      <View className="mt-4">
        <LevelBar level={data.level} xp={data.xp} xpToNext={data.xpToNext} />
      </View>
    </View>
  );
}

// ── MINHAS PARTIDAS (history rows; "Ver tudo" hidden — no full-history screen) ──
function RecentMatchesSection() {
  const { data, isPending, isError, refetch } = useRecentMatches();

  if (isPending) {
    return <SkeletonBlock className="mx-4 mt-2 h-44" />;
  }
  if (isError) {
    return (
      <View className="mx-4 mt-2 bg-white rounded-card shadow-card">
        <ErrorRow onRetry={() => refetch()} />
      </View>
    );
  }
  if (data.length === 0) {
    return (
      <View
        className="mx-4 mt-2 bg-white rounded-card shadow-card px-4 py-6"
        accessibilityLiveRegion="polite"
      >
        <Text className="font-body text-caption text-text-muted text-center">
          Você ainda não jogou nenhuma partida
        </Text>
      </View>
    );
  }

  return (
    <View className="mx-4 mt-2 bg-white rounded-card shadow-card overflow-hidden">
      {data.map((m, i) => (
        <View key={m.id}>
          {i > 0 ? <View className="h-px bg-line mx-4" /> : null}
          <MatchHistoryRow match={m} onPress={goMatchSummary} />
        </View>
      ))}
    </View>
  );
}

function RankingPreviewRow({ row, isMe }: { row: RankingRow; isMe: boolean }) {
  return (
    <View
      className={`flex-row items-center px-3 py-2 ${isMe ? "bg-primary/20 rounded-pill" : ""}`}
      accessibilityLabel={isMe ? `${row.name}, você, ${row.score}` : undefined}
    >
      <Text className="font-num text-text-on-dark text-body w-6">
        {row.position}
      </Text>
      <Avatar name={row.name} size="sm" />
      <View className="flex-1 ml-3">
        <Text className="font-body text-body-bold text-text-on-dark">
          {row.name}
          {isMe ? " · você" : ""}
        </Text>
        <Text className="font-body text-caption text-text-muted">
          {row.subtitle}
        </Text>
      </View>
      <Text className="font-num text-accent text-body">{row.score}</Text>
    </View>
  );
}

// ── Ranking semanal (dark preview card; "Meus amigos" relabeled to ranking) ──
function RankingSection() {
  const userId = useAuthStore((s) => s.userId);
  const { data, isPending, isError, refetch } = useGroupRanking({
    preview: true,
  });

  if (isPending) {
    return <SkeletonBlock className="mx-4 mt-2 h-56" />;
  }
  if (isError) {
    return (
      <View className="mx-4 mt-2 rounded-card overflow-hidden">
        <LinearGradient
          colors={HERO_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="p-4 items-center" accessibilityLiveRegion="polite">
            <Text className="font-body text-body text-text-on-dark text-center">
              Não foi possível carregar
            </Text>
            <Button variant="outlineW" onPress={() => refetch()}>
              Tentar novamente
            </Button>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View className="mx-4 mt-2 rounded-card overflow-hidden">
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View className="p-3">
          {data.length === 0 ? (
            <View
              className="py-4 items-center"
              accessibilityLiveRegion="polite"
            >
              <Text className="font-body text-caption text-text-muted text-center">
                Entre em uma partida recorrente para aparecer no ranking
              </Text>
            </View>
          ) : (
            <>
              {data.map((row) => (
                <RankingPreviewRow
                  key={row.playerId}
                  row={row}
                  isMe={
                    userId != null ? row.playerId === userId : Boolean(row.isMe)
                  }
                />
              ))}
              <View className="mt-3">
                <Button variant="outlineW" onPress={goRanking}>
                  Ver tudo
                </Button>
              </View>
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

export default function ProfileScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);
  useRegisterNavBlurTarget(blurTarget);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="pb-24"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          {/* Seu progresso */}
          <View className="mt-2">
            <ProgressSection />
          </View>

          {/* MINHAS PARTIDAS — "Ver tudo" hidden (no full-history screen in MVP) */}
          <SectionTitleRow title="MINHAS PARTIDAS" />
          <RecentMatchesSection />

          {/* Ranking semanal */}
          <SectionTitleRow title="Ranking semanal" />
          <RankingSection />
        </ScrollView>
      </BlurTargetView>

      <GlassHeader blurTarget={blurTarget} onHeight={setHeaderHeight}>
        <ProfileHeader />
      </GlassHeader>
    </View>
  );
}
