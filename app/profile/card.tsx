import { BlurTargetView } from "expo-blur";
import { router } from "expo-router";
import { ChevronLeft, Lock, Share2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GlassHeader } from "@/components/ui/GlassHeader";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { positionLabel } from "@/features/profile/schema/onboarding";
import type { MyProfile } from "@/features/profile/types/profile";
import { colors } from "@/theme/colors";
import { DEFAULT_AVATAR } from "@/theme/defaultAvatars";

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

/** Neutral rounded skeleton block on the dark card background. */
function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-surface-dark-alt rounded-card ${className}`} />;
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

// One stat of the 6-cell card grid (number + short label, on dark).
function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-row items-baseline justify-center gap-1">
      <Text className="font-num text-text-on-dark text-body">{value}</Text>
      <Text className="font-body-bold text-caption text-white/60">{label}</Text>
    </View>
  );
}

function CardBody({ profile }: { profile: MyProfile }) {
  const fullName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");
  const nick = profile.handle ? `@${profile.handle}` : undefined;
  const subtitle = [nick, positionLabel(profile.position)]
    .filter(Boolean)
    .join(" · ");
  const stats: { label: string; value: number }[] = [
    { label: "ACE", value: profile.ace },
    { label: "BLK", value: profile.blk },
    { label: "ATA", value: profile.ata },
    { label: "DEF", value: profile.def },
    { label: "SRV", value: profile.srv },
    { label: "REC", value: profile.rec },
  ];

  return (
    <>
      {/* The card — lime-bordered navy panel. */}
      <View className="mt-2 rounded-card bg-surface-dark-alt border-2 border-accent-light p-5">
        {/* GERAL number (left) + position tag (right) */}
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-num text-accent-light text-display">
              {profile.overall}
            </Text>
            <Text className="font-body-bold text-caption text-white/60 uppercase mt-1">
              Geral
            </Text>
          </View>
          {profile.position ? (
            <View className="bg-accent rounded-pill px-3 py-1">
              <Text className="font-body-bold text-caption text-surface-dark">
                {profile.position}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Player photo */}
        <View className="items-center my-4">
          <Avatar
            uri={profile.avatarUrl}
            name={profile.firstName}
            size="xl"
            defaultSource={DEFAULT_AVATAR}
          />
        </View>

        {/* Name + @handle · position */}
        <View className="items-center">
          <Text className="font-display text-h1 text-text-on-dark uppercase text-center">
            {fullName}
          </Text>
          {subtitle ? (
            <Text className="font-body-semibold text-body text-accent-light mt-1 text-center">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Divider */}
        <View className="h-px bg-white/10 my-5" />

        {/* 6-stat grid (3 columns × 2 rows) */}
        <View className="flex-row flex-wrap">
          {stats.map((s) => (
            <View key={s.label} className="w-1/3 py-2">
              <CardStat label={s.label} value={s.value} />
            </View>
          ))}
        </View>
      </View>

      {/* Share */}
      <View className="mt-6">
        <Button
          variant="grad"
          onPress={() => shareCard(fullName, profile.overall)}
          leftIcon={<Share2 size={18} color={colors.textOnDark} />}
          testID="share-card"
        >
          Compartilhar carta
        </Button>
      </View>

      {/* Premium note */}
      <View className="flex-row items-center justify-center gap-2 mt-4">
        <Lock size={14} color={colors.textMuted} />
        <Text className="font-body text-caption text-white/60">
          Carta animada na{" "}
          <Text className="font-body-bold text-accent-light">
            Versão Premium
          </Text>
        </Text>
      </View>
    </>
  );
}

export default function CardScreen() {
  const { data, isPending, isError, refetch } = useMyProfile();
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);

  return (
    <View className="flex-1 bg-surface-dark">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="px-5 pb-10"
          contentContainerStyle={{ paddingTop: headerHeight }}
        >
          {isPending ? (
            <SkeletonBlock className="h-96 mt-2" />
          ) : isError ? (
            <ErrorBlock onRetry={() => refetch()} />
          ) : (
            <CardBody profile={data} />
          )}
        </ScrollView>
      </BlurTargetView>

      <GlassHeader
        tint="dark"
        blurTarget={blurTarget}
        onHeight={setHeaderHeight}
      >
        <CardHeader />
      </GlassHeader>
    </View>
  );
}
