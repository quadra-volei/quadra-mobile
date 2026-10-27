import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CollectionCard, CollectionCardSoon, collectionStatus } from "@/components/domain/CollectionCard";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useCardCollection, type CollectionCard as CollectionCardData } from "@/features/pass/api/seasonPass";
import { missingPieces } from "@/features/pass/lib/cardPieces";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { cardTitleCode } from "@/features/profile/card/cardTitles";
import { CARD_SCREEN, type CardFinish } from "@/theme/cardFinish";
import { colors } from "@/theme/colors";

const GAP = 16;

/**
 * The player's card collection (API DECISIONS #99): a card per season (and,
 * later, per event), complete or with the pieces won, plus the slot of the
 * cards still to come. The season being played opens the pass; an ended one
 * opens the card as it was left.
 */
export default function CollectionScreen() {
  const collection = useCardCollection();
  const profile = useMyProfile();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [open, setOpen] = useState<CollectionCardData | null>(null);
  const cardWidth = (Math.min(screenWidth, 480) - 40 - GAP) / 2;
  const cards = collection.data?.cards ?? [];
  const complete = cards.filter((c) => c.complete).length;

  const choose = (card: CollectionCardData) => (card.status === "Ended" ? setOpen(card) : router.push("/profile/pass"));

  return (
    <View className="flex-1" style={{ backgroundColor: CARD_SCREEN.bg }}>
      <LinearGradient
        colors={[CARD_SCREEN.glow, "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 420 }}
      />
      <View className="flex-row items-center px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-chip bg-white/10"
        >
          <ChevronLeft size={22} color={colors.textOnDark} />
        </Pressable>
        <Text className="flex-1 text-center font-body-bold text-body-bold text-text-on-dark">Coleção de cartas</Text>
        <View className="w-9" />
      </View>
      <ScrollView contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Text className="font-body text-body text-white/70 mt-2">
          Cada temporada, e cada evento, tem uma carta que só existe ali. Complete o passe para guardar a carta inteira; a que ficar pela metade fica assim para sempre.
        </Text>
        {collection.isPending ? (
          <SkeletonBlock tone="dark" className="h-72 mt-6" />
        ) : collection.isError ? (
          <View className="mt-10 items-center gap-4" accessibilityLiveRegion="polite">
            <Text className="font-body text-body text-white/70 text-center">Não foi possível carregar a coleção</Text>
            <Button variant="outlineW" onPress={() => collection.refetch()}>
              Tentar novamente
            </Button>
          </View>
        ) : (
          <>
            <Text className="font-mono text-mono text-accent-light tracking-widest mt-6 mb-4" testID="collection-count">
              {`${complete} ${complete === 1 ? "CARTA COMPLETA" : "CARTAS COMPLETAS"} · ${cards.length} NA COLEÇÃO`}
            </Text>
            <View className="flex-row flex-wrap" style={{ gap: GAP }}>
              {cards.map((card) => (
                <Pressable
                  key={card.season}
                  accessibilityRole="button"
                  onPress={() => choose(card)}
                  testID={`collection-${card.season}`}
                >
                  <CollectionCard card={card} width={cardWidth} />
                </Pressable>
              ))}
              <CollectionCardSoon width={cardWidth} />
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={open != null} transparent animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: CARD_SCREEN.bg }}>
          {open && profile.data ? (
            <>
              <Text className="font-mono text-mono text-accent-light tracking-widest">{open.name.toUpperCase()}</Text>
              <Text className="font-body text-caption text-white/60 mt-1 mb-6">{collectionStatus(open)}</Text>
              <PlayerCard
                profile={profile.data}
                finish={open.finish as CardFinish}
                title={cardTitleCode(profile.data.cardStyle.title, profile.data.position)}
                photoUrl={profile.data.avatarUrl}
                flipped={false}
                onFlip={() => undefined}
                width={Math.min(screenWidth - 80, 320)}
                pieces={open.complete ? undefined : { missing: missingPieces(open.pieces) }}
                testID="collection-open-card"
              />
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={() => setOpen(null)}
            className="mt-8 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          >
            <X size={20} color={colors.textOnDark} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
