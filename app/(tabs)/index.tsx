import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MatchCard } from "@/components/domain/MatchCard";
import { MatchCardCompact } from "@/components/domain/MatchCardCompact";
import { Button } from "@/components/ui/Button";
import { useNearbyMatches } from "@/features/matches/api/getNearby";
import { useUpcomingMatches } from "@/features/matches/api/getUpcoming";
import type {
  NearbyMatch,
  UpcomingMatch,
} from "@/features/matches/types/match";
import { colors } from "@/theme/colors";

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
  const { data, isPending, isError, refetch } =
    useNearbyMatches(PLACEHOLDER_GEO);

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
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header — Climate Crisis 18px, matching the prototype's screen Header. */}
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
          </View>
        </View>

        <ScrollView contentContainerClassName="pb-24">
          {/* "Bora pra quadra?" card */}
          <View className="mx-4 bg-white rounded-card shadow-card p-4">
            <Text className="font-body text-h3 text-text-primary text-center">
              Bora pra quadra?
            </Text>
            <Text className="font-body text-caption text-text-muted text-center mt-1">
              Crie ou encontre um jogo agora
            </Text>
            <View className="mt-4">
              <Button variant="grad" onPress={goCreate}>
                Criar partida
              </Button>
            </View>
            <View className="mt-3">
              <Button variant="outline" onPress={goExplore}>
                Procurar partidas
              </Button>
            </View>
          </View>

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
      </SafeAreaView>
    </View>
  );
}
