import { router } from "expo-router";
import { ChevronLeft, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

import { PlayerCard } from "@/components/domain/PlayerCard";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import type { MyProfile } from "@/features/profile/types/profile";
import { colors } from "@/theme/colors";

/** Opens the native share sheet with a short player-card summary. */
async function shareCard(name: string, overall: number) {
  try {
    await Share.share({
      message: `Confira minha carta na Quadra — ${name}, GERAL ${overall}.`,
    });
  } catch {
    // User dismissed the sheet or the platform share failed — nothing to do.
  }
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="mt-10 items-center" accessibilityLiveRegion="polite">
      <Text className="font-body text-body text-white/70 text-center">
        Não foi possível carregar a carta
      </Text>
      <Button variant="outlineW" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

// ── Header (inline; back + title variant — a pushed dark stack screen) ──
function CardHeader() {
  return (
    <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={() => router.back()}
      >
        <ChevronLeft size={24} color={colors.textOnDark} />
      </Pressable>
      <Text className="font-body-bold text-body-bold text-text-on-dark">
        Carta do Jogador
      </Text>
    </View>
  );
}

function CardBody({ profile }: { profile: MyProfile }) {
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <View className="mt-2">
        <PlayerCard profile={profile} testID="player-card" />
      </View>

      {/* Share */}
      <View className="mt-6">
        <Button
          variant="grad"
          onPress={() => shareCard(fullName, profile.overall)}
          leftIcon={<Share2 size={18} color={colors.surfaceDark} />}
          testID="share-card"
        >
          Compartilhar carta
        </Button>
      </View>
    </>
  );
}

export default function CardScreen() {
  const { data, isPending, isError, refetch } = useMyProfile();
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View className="flex-1 bg-surface-dark">
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="px-5 pb-10"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          {isPending ? (
            <SkeletonBlock tone="dark" className="h-96 mt-2" />
          ) : isError ? (
            <ErrorBlock onRetry={() => refetch()} />
          ) : (
            <CardBody profile={data} />
          )}
        </ScrollView>
      </View>

      <ScreenHeader
        tint="dark"
        onHeight={setHeaderHeight}
      >
        <CardHeader />
      </ScreenHeader>
    </View>
  );
}
