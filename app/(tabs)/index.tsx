import { router } from "expo-router";
import { Bell, Plus, Search, Settings } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MatchCard } from "@/components/domain/MatchCard";
import { MatchCardCompact } from "@/components/domain/MatchCardCompact";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { IconButton } from "@/components/ui/IconButton";
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
 * Home hero — the blue "Bora pra quadra?" card holding the two entry points:
 * "Criar partida" (lime, primary) and "Buscar jogo" (white, secondary), both
 * under the button rule (DESIGN_SYSTEM "Buttons"). No counters: the backend
 * has no "today" summary to fill them with.
 */
const HERO_ACTION =
  "flex-1 h-16 flex-row items-center rounded-btn overflow-hidden border-2 border-surface-dark px-4";

function HomeHero() {
  return (
    <View className="mx-4 rounded-card bg-primary p-4">
      <Text className="font-display text-display text-white uppercase">
        Bora pra
      </Text>
      <Text className="font-display text-display text-accent uppercase">
        Quadra?
      </Text>

      <View className="mt-6 flex-row gap-3">
        <Pressable
          onPress={goCreate}
          accessibilityRole="button"
          accessibilityLabel="Criar partida"
          android_ripple={PRESS_RIPPLE}
          className={`${HERO_ACTION} justify-between bg-accent`}
          style={HARD_SHADOW}
        >
          <Text className="flex-1 font-body-bold text-body-bold text-surface-dark">
            Criar partida
          </Text>
          <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-surface-dark">
            <Plus size={18} color={colors.surfaceDark} strokeWidth={2.6} />
          </View>
        </Pressable>

        <Pressable
          onPress={goExplore}
          accessibilityRole="button"
          accessibilityLabel="Buscar partida"
          android_ripple={PRESS_RIPPLE}
          className={`${HERO_ACTION} justify-center gap-2 bg-white`}
          style={HARD_SHADOW}
        >
          <Search size={18} color={colors.surfaceDark} strokeWidth={2.4} />
          <Text className="font-body-bold text-body-bold text-surface-dark">
            Buscar jogo
          </Text>
        </Pressable>
      </View>
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
          <HomeHero />

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
            <IconButton label="Notificações" onPress={() => {}}>
              <Bell size={20} color={colors.surfaceDark} />
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
