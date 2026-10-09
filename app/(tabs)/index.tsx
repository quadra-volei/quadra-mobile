import { router } from "expo-router";
import { Bell, Plus, Search, Settings } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { JogarIcon } from "@/components/icons/JogarIcon";
import { MatchCard } from "@/components/domain/MatchCard";
import { MatchCardCompact } from "@/components/domain/MatchCardCompact";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { useUpcomingMatches } from "@/features/matches/api/getUpcoming";
import { useDeviceCoords } from "@/features/matches/lib/useDeviceCoords";
import type {
  NearbyMatch,
  UpcomingMatch,
} from "@/features/matches/types/match";
import { HARD_SHADOW, colors } from "@/theme/colors";
import {
  ICON_HIT_SLOP,
  ICON_RIPPLE,
  PRESS_RIPPLE,
  TAB_BAR_CLEARANCE,
} from "@/theme/layout";

// Where "perto de você" searches when the device location is not available:
// São Paulo centre. Home never prompts for location (S5 spec "Permissions").
const DEFAULT_GEO = { lat: -23.55, lon: -46.63, radiusKm: 5 };

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

/**
 * Home dual-CTA — two side-by-side tiles ("Criar partida" / "Buscar partida"),
 * ported from the Quadra prototype (screens-main.jsx). Replaces the old single
 * "Bora pra quadra?" card.
 */
const TILE_STYLE = { minHeight: 138, ...HARD_SHADOW };

function DualCtaTiles() {
  return (
    <View className="flex-row px-4 gap-3">
      {/* Criar — flat lime, the primary action */}
      <Pressable
        onPress={goCreate}
        accessibilityRole="button"
        accessibilityLabel="Criar partida"
        android_ripple={PRESS_RIPPLE}
        className="flex-1 rounded-card overflow-hidden border-2 border-surface-dark bg-accent"
        style={TILE_STYLE}
      >
        {/* Faint volleyball motif — same ball as the Jogar FAB, tilted. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            right: -30,
            bottom: -26,
            opacity: 0.12,
            transform: [{ rotate: "-8deg" }],
          }}
        >
          <JogarIcon size={150} color={colors.surfaceDark} />
        </View>
        <View className="flex-1 justify-between px-4 pt-[18px] pb-4">
          <View className="w-[42px] h-[42px] rounded-[14px] items-center justify-center bg-white border-2 border-surface-dark">
            <Plus size={24} color={colors.surfaceDark} strokeWidth={2.4} />
          </View>
          <View>
            <Text
              className="font-display text-surface-dark uppercase"
              style={{ fontSize: 20, lineHeight: 21 }}
            >
              Criar
            </Text>
            <Text className="font-body-bold text-body-bold text-surface-dark">
              partida
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Buscar — white, the secondary action */}
      <Pressable
        onPress={goExplore}
        accessibilityRole="button"
        accessibilityLabel="Buscar partida"
        android_ripple={PRESS_RIPPLE}
        className="flex-1 rounded-card overflow-hidden border-2 border-surface-dark bg-white"
        style={TILE_STYLE}
      >
        <View className="flex-1 justify-between px-4 pt-[18px] pb-4">
          <View className="w-[42px] h-[42px] rounded-[14px] items-center justify-center bg-white border-2 border-surface-dark">
            <Search size={23} color={colors.surfaceDark} strokeWidth={2.2} />
          </View>
          <View>
            <Text
              className="font-display text-surface-dark uppercase"
              style={{ fontSize: 20, lineHeight: 21 }}
            >
              Buscar
            </Text>
            <Text className="font-body-bold text-body-bold text-surface-dark">
              partida
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function UpcomingSection() {
  const { data, isPending, isError, refetch } = useUpcomingMatches();

  if (isPending) {
    return (
      <View className="flex-row px-4 gap-3 mt-2">
        <SkeletonBlock className="w-[262px] h-[248px]" />
        <SkeletonBlock className="w-[262px] h-[248px]" />
      </View>
    );
  }

  if (isError) {
    return <StateMessage
      message="Não foi possível carregar"
      actionLabel="Tentar novamente"
      onAction={() => refetch()}
    />;
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
        <StateMessage
          message="Você ainda não tem partidas marcadas"
          actionLabel="Criar partida"
          onAction={goCreate}
        />
      }
    />
  );
}

function NearbySection() {
  const coords = useDeviceCoords();
  const { data, isPending, isError, refetch } = useNearbyMatches(
    coords
      ? { ...DEFAULT_GEO, lat: coords.latitude, lon: coords.longitude }
      : DEFAULT_GEO,
  );

  if (isPending) {
    return (
      <View className="flex-row flex-wrap justify-between px-4 gap-y-3 mt-2">
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
    return <StateMessage
      message="Não foi possível carregar"
      actionLabel="Tentar novamente"
      onAction={() => refetch()}
    />;
  }

  if (data.length === 0) {
    return (
      <StateMessage
        message="Nenhuma partida perto de você ainda"
        actionLabel="Criar partida"
        onAction={goCreate}
      />
    );
  }

  return (
    <View className="flex-row flex-wrap justify-between px-4 gap-y-3 mt-2">
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

  return (
    <View className="flex-1 bg-bg-light">
      <View className="flex-1 bg-bg-light">
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
      </View>

      {/* Screen header */}
      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            INÍCIO
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              hitSlop={ICON_HIT_SLOP}
              android_ripple={ICON_RIPPLE}
              onPress={() => {}}
            >
              <Bell size={24} color={colors.surfaceDark} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              hitSlop={ICON_HIT_SLOP}
              android_ripple={ICON_RIPPLE}
              onPress={goSettings}
            >
              <Settings size={24} color={colors.surfaceDark} />
            </Pressable>
          </View>
        </View>
      </ScreenHeader>
    </View>
  );
}
