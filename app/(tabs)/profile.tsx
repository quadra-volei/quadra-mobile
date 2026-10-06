import { BlurTargetView } from "expo-blur";
import { router } from "expo-router";
import { Bell, Settings } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { colors } from "@/theme/colors";
import { DEFAULT_AVATAR } from "@/theme/defaultAvatars";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

function goRanking() {
  router.push("/profile/ranking");
}
function goCard() {
  router.push("/profile/card");
}
function goSettings() {
  router.push("/profile/settings");
}
// "Ver tudo" on MINHAS PARTIDAS has no full-history screen in MVP — the button is
// present (matching the prototype) but inert until a history screen exists.
function noop() {}
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
      {data ? (
        <View className="flex-row items-center gap-3">
          <Avatar
            uri={data.avatarUrl}
            name={data.firstName}
            size="md"
            level={data.level}
            defaultSource={DEFAULT_AVATAR}
          />
          <View>
            <Text className="font-body text-caption text-text-muted">Olá,</Text>
            <Text className="font-display text-h1 text-text-primary uppercase">
              {data.firstName}
            </Text>
          </View>
        </View>
      ) : (
        // No profile yet (loading or failed): neutral shapes, never a stand-in
        // name or the default avatar passed off as the user's.
        <View
          className="flex-row items-center gap-3"
          testID="profile-header-skeleton"
        >
          <View className="h-12 w-12 rounded-full bg-bg-light-alt" />
          <SkeletonBlock className="h-8 w-32" />
        </View>
      )}
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

// One cell of the ACE/BLK/ATA/DEF 2×2 stats grid (bordered box: label + number).
function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 border border-line rounded-chip py-2 items-center">
      <Text className="font-mono text-mono text-text-muted uppercase">
        {label}
      </Text>
      {/* text-h1 (weight 400) — NOT text-h3, whose 800 weight breaks the
          single-weight Russo One font (`font-num`) and falls back to system. */}
      <Text className="font-num text-text-primary text-h1">{value}</Text>
    </View>
  );
}

// ── "Seu progresso" card (GERAL box + ACE/BLK/ATA/DEF grid + card CTA + Level/XP) ──
function ProgressSection() {
  const { data, isPending, isError, refetch } = useMyProfile();

  if (isPending) {
    return <SkeletonBlock className="mx-4 h-64" />;
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
      <Text className="font-display text-h1 text-text-primary uppercase mb-3">
        Seu progresso
      </Text>

      {/* GERAL box (left) + 2×2 stats grid (right). */}
      <View className="flex-row gap-3">
        <View className="w-24 rounded-card bg-primary/5 items-center justify-center py-3">
          <Text className="font-mono text-mono text-text-muted uppercase">
            Geral
          </Text>
          <Text className="font-num text-primary text-display mt-1">
            {data.overall}
          </Text>
        </View>
        <View className="flex-1 gap-2">
          <View className="flex-row gap-2">
            <StatCell label="ACE" value={data.ace} />
            <StatCell label="BLK" value={data.blk} />
          </View>
          <View className="flex-row gap-2">
            <StatCell label="ATA" value={data.ata} />
            <StatCell label="DEF" value={data.def} />
          </View>
        </View>
      </View>

      {/* Ver a sua carta → player card (S8b) */}
      <View className="mt-4">
        <Button variant="grad" onPress={goCard}>
          Ver a sua carta
        </Button>
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
      {/* "Ver tudo" placeholder — no full-history screen yet, so it is inert
          (matches the prototype, whose handler is empty). */}
      <View className="p-3 pt-1">
        <Button variant="outline" onPress={noop} testID="ver-tudo-partidas">
          Ver tudo
        </Button>
      </View>
    </View>
  );
}

function RankingPreviewRow({ row, isMe }: { row: RankingRow; isMe: boolean }) {
  // Prototype coloring: only the current user's row is lime (position + score);
  // everyone else is white, with a dimmed position number. The 1.5px border is
  // applied via inline style so non-"me" rows stay truly transparent (a bare
  // `border` className leaves RN's default black borderColor showing) while
  // keeping every row the same height.
  return (
    <View
      className={`flex-row items-center px-3 py-2 rounded-chip ${
        isMe ? "bg-primary/25" : ""
      }`}
      style={{
        borderWidth: 1.5,
        borderColor: isMe ? colors.primary : "transparent",
      }}
      accessibilityLabel={isMe ? `${row.name}, você, ${row.score}` : undefined}
    >
      <Text
        className={`font-num text-body w-6 text-center ${
          isMe ? "text-accent-light" : "text-white/50"
        }`}
      >
        {row.position}
      </Text>
      <Avatar name={row.name} size="sm" level={row.level} />
      <View className="flex-1 ml-3">
        <Text className="font-body text-body-bold text-text-on-dark">
          {row.name}
          {isMe ? " · você" : ""}
        </Text>
        <Text className="font-body text-caption text-white/60">
          {row.subtitle}
        </Text>
      </View>
      <Text
        className={`font-num text-body ${
          isMe ? "text-accent-light" : "text-text-on-dark"
        }`}
      >
        {row.score}
      </Text>
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
      <View className="mx-4 mt-2 rounded-card overflow-hidden bg-surface-dark">
        <View className="p-4 items-center" accessibilityLiveRegion="polite">
          <Text className="font-body text-body text-text-on-dark text-center">
            Não foi possível carregar
          </Text>
          <Button variant="outlineLime" onPress={() => refetch()}>
            Tentar novamente
          </Button>
        </View>
      </View>
    );
  }

  return (
    // Solid navy card (prototype "Card dark"), not a gradient. Outer section
    // title is "Meus amigos"; this brightLime label names the card's content.
    <View className="mx-4 mt-2 rounded-card overflow-hidden bg-surface-dark p-4">
      <Text className="font-body-bold text-caption text-accent-light mb-3">
        Ranking semanal
      </Text>
      {data.length === 0 ? (
        <View className="py-4 items-center" accessibilityLiveRegion="polite">
          <Text className="font-body text-caption text-white/60 text-center">
            Entre em uma partida recorrente para aparecer no ranking
          </Text>
        </View>
      ) : (
        <View className="gap-1">
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
            <Button
              variant="outlineLime"
              onPress={goRanking}
              testID="ver-tudo-ranking"
            >
              Ver tudo
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View>(null);
  useRegisterNavBlurTarget(blurTarget);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} className="flex-1 bg-bg-light">
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          {/* Seu progresso */}
          <View className="mt-2">
            <ProgressSection />
          </View>

          {/* MINHAS PARTIDAS — "Ver tudo" hidden (no full-history screen in MVP) */}
          <SectionTitleRow title="MINHAS PARTIDAS" />
          <RecentMatchesSection />

          {/* Meus amigos → "Ranking semanal" preview card */}
          <SectionTitleRow title="Meus amigos" />
          <RankingSection />
        </ScrollView>
      </BlurTargetView>

      <GlassHeader blurTarget={blurTarget} onHeight={setHeaderHeight}>
        <ProfileHeader />
      </GlassHeader>
    </View>
  );
}
