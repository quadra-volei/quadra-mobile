import { BlurTargetView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, Plus, Search, Settings } from "lucide-react-native";
import { useRef, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JogarIcon } from "@/components/icons/JogarIcon";
import { MatchCard } from "@/components/domain/MatchCard";
import { MatchCardCompact } from "@/components/domain/MatchCardCompact";
import { Button } from "@/components/ui/Button";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { useUpcomingMatches } from "@/features/matches/api/getUpcoming";
import { useDeviceCoords } from "@/features/matches/lib/useDeviceCoords";
import { useRegisterNavBlurTarget } from "@/stores/navBlurTarget";
import type {
  NearbyMatch,
  UpcomingMatch,
} from "@/features/matches/types/match";
import {
  colors,
  CREATE_TILE_GRADIENT,
  CREATE_TILE_LOCATIONS,
  SEARCH_TILE_GRADIENT,
  SEARCH_TILE_LOCATIONS,
} from "@/theme/colors";
import { TAB_BAR_CLEARANCE } from "@/theme/layout";

// Placeholder geo while nearby is mocked — no device location read on Home (S5
// spec "Permissions"; the real lat/lon arrive with S17's permission flow).
const PLACEHOLDER_GEO = { lat: -23.55, lon: -46.63, radiusKm: 5 };

function goCreate() {
  router.push("/matches/create");
}
function goExplore() {
  router.push("/explore");
}
function goMap() {
  router.push("/explore/map");
}
function goMatch(id: string) {
  router.push({ pathname: "/matches/[id]", params: { id } });
}
function goSettings() {
  router.push("/profile/settings");
}

/** Neutral rounded skeleton block (DESIGN_SYSTEM skeleton shapes TBD — flag). */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-bg-light-alt rounded-card ${className}`} />;
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
      {/* In-screen section title: Climate Crisis 14px, one step below the
          "INÍCIO" screen header (18px) — matches the prototype's SectionTitle. */}
      <Text
        className="font-display text-text-primary uppercase"
        style={{ fontSize: 14, letterSpacing: 0.6 }}
      >
        {title}
      </Text>
      <Button variant="ghost" onPress={onAction}>
        {actionLabel}
      </Button>
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

/**
 * Home dual-CTA — two side-by-side tiles ("Criar partida" / "Buscar partida"),
 * ported from the Quadra prototype (screens-main.jsx). Replaces the old single
 * "Bora pra quadra?" card.
 */
function DualCtaTiles() {
  return (
    <View className="flex-row px-4 gap-3">
      {/* Criar — lime→blue→deep-blue gradient hero (echoes the Jogar FAB) */}
      <Pressable
        onPress={goCreate}
        accessibilityRole="button"
        accessibilityLabel="Criar partida"
        className="flex-1 rounded-[22px] overflow-hidden"
        style={{ minHeight: 138, boxShadow: "0 10px 26px rgba(0,50,209,0.3)" }}
      >
        <LinearGradient
          colors={CREATE_TILE_GRADIENT}
          locations={CREATE_TILE_LOCATIONS}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.55, y: 1 }}
          style={{ flex: 1 }}
        >
          {/* Faint volleyball motif — same ball as the Jogar FAB, tilted. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -30,
              bottom: -26,
              opacity: 0.16,
              transform: [{ rotate: "-8deg" }],
            }}
          >
            <JogarIcon size={150} color={colors.textOnDark} />
          </View>
          <View className="flex-1 justify-between px-4 pt-[18px] pb-4">
            <View className="w-[42px] h-[42px] rounded-[14px] items-center justify-center bg-white/20 border border-white/30">
              <Plus size={24} color={colors.textOnDark} strokeWidth={2.4} />
            </View>
            <View>
              <Text
                className="font-display text-white uppercase"
                style={{ fontSize: 20, lineHeight: 21 }}
              >
                Criar
              </Text>
              <Text className="font-body text-body-bold text-white">
                partida
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Buscar — lime→pale-lime→white gradient, glassy search badge */}
      <Pressable
        onPress={goExplore}
        accessibilityRole="button"
        accessibilityLabel="Buscar partida"
        className="flex-1 rounded-[22px] overflow-hidden border-[1.5px] border-primary/15"
        style={{ minHeight: 138, boxShadow: "0 6px 18px rgba(10,10,60,0.06)" }}
      >
        <LinearGradient
          colors={SEARCH_TILE_GRADIENT}
          locations={SEARCH_TILE_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        >
          <View className="flex-1 justify-between px-4 pt-[18px] pb-4">
            <View
              className="w-[42px] h-[42px] rounded-[14px] items-center justify-center bg-white/70 border border-white"
              style={{
                boxShadow:
                  "inset 0 1px 1px rgba(255,255,255,0.7), 0 2px 6px rgba(10,10,60,0.08)",
              }}
            >
              <Search size={23} color={colors.surfaceDark} strokeWidth={2.2} />
            </View>
            <View>
              <Text
                className="font-display text-text-primary uppercase"
                style={{ fontSize: 20, lineHeight: 21 }}
              >
                Buscar
              </Text>
              <Text className="font-body text-body-bold text-text-primary">
                partida
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function UpcomingSection() {
  const { data, isPending, isError, refetch } = useUpcomingMatches();

  if (isPending) {
    return (
      <View className="flex-row px-4 gap-3 mt-2">
        <SkeletonBlock className="w-64 h-44" />
        <SkeletonBlock className="w-64 h-44" />
      </View>
    );
  }

  if (isError) {
    return <ErrorRow onRetry={() => refetch()} />;
  }

  return (
    <FlatList<UpcomingMatch>
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-4 gap-3 mt-2"
      data={data}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <MatchCardCompact match={item} onPress={goMatch} />
      )}
      ListEmptyComponent={
        <View
          className="px-4 py-6 items-center"
          accessibilityLiveRegion="polite"
        >
          <Text className="font-body text-caption text-text-muted text-center">
            Você ainda não tem partidas marcadas
          </Text>
          <Button variant="ghost" onPress={goCreate}>
            Criar partida
          </Button>
        </View>
      }
    />
  );
}

function NearbySection() {
  const coords = useDeviceCoords();
  const { data, isPending, isError, refetch } = useNearbyMatches(
    coords
      ? { ...PLACEHOLDER_GEO, lat: coords.latitude, lon: coords.longitude }
      : PLACEHOLDER_GEO,
  );

  if (isPending) {
    return (
      <View className="flex-row flex-wrap px-4 gap-3 mt-2">
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
        <View className="w-[48%]">
          <SkeletonBlock className="h-[172px]" />
        </View>
      </View>
    );
  }

  if (isError) {
    return <ErrorRow onRetry={() => refetch()} />;
  }

  if (data.length === 0) {
    return (
      <View className="px-4 py-6 items-center" accessibilityLiveRegion="polite">
        <Text className="font-body text-caption text-text-muted text-center">
          Nenhuma partida perto de você ainda
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap px-4 gap-3 mt-2">
      {data.map((m: NearbyMatch) => (
        <View key={m.id} className="w-[48%]">
          <MatchCard match={m} onPress={goMatch} />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<View>(null);
  useRegisterNavBlurTarget(blurTarget);

  return (
    <View className="flex-1 bg-bg-light">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          }}
        >
          {/* Dual CTA tiles — Criar / Buscar */}
          <DualCtaTiles />

          {/* PRÓXIMAS PARTIDAS */}
          <SectionHeader
            title="PRÓXIMAS PARTIDAS"
            actionLabel="Ver todas"
            onAction={goExplore}
          />
          <UpcomingSection />

          {/* JOGOS PERTO DE VOCÊ */}
          <SectionHeader
            title="JOGOS PERTO DE VOCÊ"
            actionLabel="Mapa"
            onAction={goMap}
          />
          <NearbySection />
        </ScrollView>
      </BlurTargetView>

      {/* Glass header — Climate Crisis 18px, matching the prototype's Header. */}
      <GlassHeader blurTarget={blurTarget} onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text
            className="font-display text-text-primary uppercase"
            style={{ fontSize: 18, letterSpacing: 1 }}
          >
            INÍCIO
          </Text>
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
      </GlassHeader>
    </View>
  );
}
