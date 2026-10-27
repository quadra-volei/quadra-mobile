import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Check, ChevronLeft, Download, Lock, Maximize2, Plus, RefreshCw } from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { CollectionCard, CollectionCardSoon } from "@/components/domain/CollectionCard";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useCardCollection, useSeasonPass, type CollectionCard as CollectionCardData } from "@/features/pass/api/seasonPass";
import { missingPieces } from "@/features/pass/lib/cardPieces";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useSaveCardStyle } from "@/features/profile/api/saveCardStyle";
import { CARD_TITLES, SEASON_TITLES, cardTitleCode, type CardTitleCode } from "@/features/profile/card/cardTitles";
import type { MyProfile } from "@/features/profile/types/profile";
import { ActionsSummary } from "@/components/domain/ActionsSummary";
import {
  CARD_FINISHES,
  CARD_FINISH_ORDER,
  CARD_SCREEN,
  CARD_TIERS,
  CARD_TIER_ORDER,
  cardFinishTokens,
  cardTier,
  type CardFinish,
} from "@/theme/cardFinish";
import { colors } from "@/theme/colors";

const TABS = ["Acabamento", "Título", "Coleção", "Estatísticas"] as const;
type Tab = (typeof TABS)[number];

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="mt-10 items-center gap-4" accessibilityLiveRegion="polite">
      <Text className="font-body text-body text-white/70 text-center">
        Não foi possível carregar a carta
      </Text>
      <Button variant="outlineW" onPress={onRetry}>
        Tentar novamente
      </Button>
    </View>
  );
}

// One of the outlined buttons under the card ("Ver verso", "Ampliar").
function ToolButton({ label, icon, onPress, disabled, testID }: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean; testID?: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      className="flex-1 flex-row items-center justify-center gap-2 rounded-chip border border-white/20 bg-white/5 py-3"
    >
      <Text className="font-body-bold text-caption text-text-on-dark">{label}</Text>
      {icon}
    </PressableScale>
  );
}

type Save = ReturnType<typeof useSaveCardStyle>;

// Which tier the level gives and when the next one comes (placeholders, see CARD_TIERS).
function TierNote({ level }: { level: number }) {
  const tier = cardTier(level);
  const next = CARD_TIER_ORDER[CARD_TIER_ORDER.indexOf(tier) + 1];
  return (
    <Text className="font-body text-caption text-white/60 my-4">
      {`Carta ${CARD_TIERS[tier].name} no nível ${level}.`}
      {next ? ` No nível ${CARD_TIERS[next].from} ela vira ${CARD_TIERS[next].name}.` : ""}
    </Text>
  );
}

function goPass() {
  router.push("/profile/pass");
}

// The card collection (API DECISIONS #99, #194): a card per season (and, later,
// per event); the one chosen shows on the big card above, as it was left. A
// complete card is equipped from here; the season being played opens the pass.
function CollectionTab({
  profile,
  save,
  cards,
  chosen,
  onChoose,
}: {
  profile: MyProfile;
  save: Save;
  cards: CollectionCardData[];
  chosen: CollectionCardData | null;
  onChoose: (card: CollectionCardData) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (Math.min(screenWidth, 480) - 40 - 12) / 2 - 18;
  const equipped = chosen != null && profile.cardStyle.finish === chosen.finish;

  return (
    <>
      <Text className="font-body text-caption text-white/60 mb-3">
        Cada temporada, e cada evento, tem uma carta que só existe ali. A que ficar pela metade fica assim na sua coleção.
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {cards.map((card) => (
          <Pressable
            key={card.season}
            accessibilityRole="button"
            accessibilityState={{ selected: chosen?.season === card.season }}
            onPress={() => onChoose(card)}
            testID={`collection-${card.season}`}
            className={`rounded-chip border-2 p-2 ${chosen?.season === card.season ? "border-accent-light" : "border-transparent"}`}
          >
            <CollectionCard card={card} width={cardWidth} />
          </Pressable>
        ))}
        <View className="p-2 border-2 border-transparent">
          <CollectionCardSoon width={cardWidth} />
        </View>
      </View>
      {chosen ? (
        <View className="mt-4 mb-4">
          {chosen.complete ? (
            equipped ? (
              <Text className="font-body-bold text-body text-accent-light text-center">Equipada na sua carta</Text>
            ) : (
              <Button
                variant="grad"
                onPress={() => save.mutate({ finish: chosen.finish as CardFinish, title: profile.cardStyle.title })}
                testID="collection-equip"
              >
                Equipar esta carta
              </Button>
            )
          ) : chosen.status === "Ended" ? (
            <Text className="font-body text-caption text-white/60">
              {`A temporada acabou com ${chosen.pieces} de ${chosen.levels} pedaços.`}
            </Text>
          ) : (
            <Button variant="outlineLime" onPress={goPass} testID="collection-open-pass">
              Ver o passe
            </Button>
          )}
        </View>
      ) : null}
    </>
  );
}

function FinishPicker({ profile, save }: { profile: MyProfile; save: Save }) {
  const current = profile.cardStyle;
  return (
    <>
      <View className="flex-row gap-2">
        {CARD_FINISH_ORDER.map((finish) => {
          const t = CARD_FINISHES[finish];
          const equipped = current.finish === finish;
          return (
            <PressableScale
              key={finish}
              accessibilityRole="button"
              accessibilityState={{ selected: equipped }}
              onPress={() => save.mutate({ finish, title: current.title })}
              testID={`finish-${finish}`}
              className={`flex-1 rounded-chip border p-2 ${equipped ? "border-accent-light" : "border-white/15"}`}
              style={{ backgroundColor: CARD_SCREEN.bg }}
            >
              {/* Text only: the card above already shows the finish (owner's 4th review, item 11). */}
              <Text className="font-body-bold text-caption text-text-on-dark">{t.name}</Text>
              <Text className="font-mono text-mono text-white/60 mt-1">{equipped ? "EQUIPADO" : "EXPERIMENTAR"}</Text>
            </PressableScale>
          );
        })}
      </View>
      {/* A season finish shines the same at any level: the tier note does not apply. */}
      {cardFinishTokens(current.finish).tier ? <View className="h-4" /> : <TierNote level={profile.level} />}
    </>
  );
}

// The season pass's titles: picked like the others once their level is reached;
// until then they say which level gives them and open the pass.
function SeasonTitles({ profile, save, shown }: { profile: MyProfile; save: Save; shown: CardTitleCode }) {
  const { data: pass } = useSeasonPass();
  if (!pass) return null;
  const rewards = pass.rewards.filter((r) => r.kind === "Title");
  return (
    <>
      <Text className="font-mono text-mono text-white/60 mt-4 mb-2">{`DO PASSE · ${pass.name.toUpperCase()}`}</Text>
      {SEASON_TITLES.filter((t) => rewards.some((r) => r.code === t.code)).map((title) => {
        const reward = rewards.find((r) => r.code === title.code)!;
        const on = shown === title.code;
        const open = reward.unlocked || on;
        return (
          <PressableScale
            key={title.code}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => (open ? save.mutate({ finish: profile.cardStyle.finish, title: title.code }) : goPass())}
            testID={`title-${title.code}`}
            className={`flex-row items-center justify-between gap-3 rounded-chip border px-3 py-3 mb-2 ${on ? "border-accent-light bg-accent-light/10" : "border-white/15 bg-white/5"}`}
          >
            <View className="flex-1">
              <Text className={`font-body-bold text-body ${open ? "text-text-on-dark" : "text-white/60"}`}>{title.name}</Text>
              <Text className="font-body text-caption text-white/60 mt-1">
                {open ? title.description : `Nível ${reward.level} do passe da temporada`}
              </Text>
            </View>
            {on ? (
              <Check size={18} color={colors.accentLight} />
            ) : open ? (
              <Plus size={18} color={colors.textMuted} />
            ) : (
              <Lock size={16} color={colors.textMuted} />
            )}
          </PressableScale>
        );
      })}
    </>
  );
}

function TitlePicker({ profile, save }: { profile: MyProfile; save: Save }) {
  const shown = cardTitleCode(profile.cardStyle.title, profile.position);
  return (
    <>
      {CARD_TITLES.map((title) => {
        const on = shown === title.code;
        return (
          <PressableScale
            key={title.code}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => save.mutate({ finish: profile.cardStyle.finish, title: title.code })}
            testID={`title-${title.code}`}
            className={`flex-row items-center justify-between gap-3 rounded-chip border px-3 py-3 mb-2 ${on ? "border-accent-light bg-accent-light/10" : "border-white/15 bg-white/5"}`}
          >
            <View className="flex-1">
              <Text className="font-body-bold text-body text-text-on-dark">{title.name}</Text>
              <Text className="font-body text-caption text-white/60 mt-1">{title.description}</Text>
            </View>
            {on ? <Check size={18} color={colors.accentLight} /> : <Plus size={18} color={colors.textMuted} />}
          </PressableScale>
        );
      })}
      <SeasonTitles profile={profile} save={save} shown={shown} />
    </>
  );
}

export function StatsList({ profile }: { profile: MyProfile }) {
  const r = profile.record;
  const rows: [string, string, number][] = [
    ["Partidas", "", r.matches],
    ["Vitórias", "", r.wins],
    ["Derrotas", "", r.losses],
    ["Empates", "", r.draws],
    ["MVPs", "", r.mvps],
    // The only rule a player cannot guess: how points are earned.
    ["Pontos", "Presença +10, vitória +15, MVP +25", profile.points],
  ];
  return (
    <>
      {/* The recorded actions behind ATK, DEF, BLK and ACE (API DECISIONS #85). */}
      <View className="rounded-chip border border-white/15 bg-white/5 px-3 py-3 mb-2">
        <Text className="font-body-bold text-body text-text-on-dark mb-2">Em quadra</Text>
        <ActionsSummary actions={profile.actions} tone="dark" testID="card-actions" />
      </View>
      {rows.map(([label, hint, value]) => (
        <View key={label} className="flex-row items-center justify-between rounded-chip border border-white/15 bg-white/5 px-3 py-3 mb-2">
          <View className="flex-1">
            <Text className="font-body-bold text-body text-text-on-dark">{label}</Text>
            {hint ? <Text className="font-body text-caption text-white/60 mt-1">{hint}</Text> : null}
          </View>
          <Text className="font-num text-h3 text-text-on-dark">{value}</Text>
        </View>
      ))}
      <Text className="font-body text-caption text-white/60 my-3">
        Acabamentos e títulos não dão pontos nem vantagem no sorteio.
      </Text>
    </>
  );
}

function CardBody({ profile }: { profile: MyProfile }) {
  const { width: screenWidth } = useWindowDimensions();
  const [flipped, setFlipped] = useState(false);
  const [tab, setTab] = useState<Tab>("Acabamento");
  const [inspecting, setInspecting] = useState(false);
  const save = useSaveCardStyle();
  const flip = () => setFlipped((v) => !v);
  const faceRefs = { front: useRef<View>(null), back: useRef<View>(null) };
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // A still image of the face being shown (no tilt, no live light), 3× the card's grid.
  const exportPng = async () => {
    const face = (flipped ? faceRefs.back : faceRefs.front).current;
    if (!face) return;
    setExporting(true);
    setExportMessage(null);
    try {
      const uri = await captureRef(face, { format: "png", width: 876, height: 1218, result: "tmpfile" });
      if (!(await Sharing.isAvailableAsync())) {
        setExportMessage("Este aparelho não permite compartilhar arquivos.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Minha carta Quadra", UTI: "public.png" });
    } catch {
      setExportMessage("Não foi possível exportar a carta. Tente novamente.");
    } finally {
      setExporting(false);
    }
  };

  // On the Coleção tab the big card shows the collection card chosen (the newest
  // until one is tapped), with the pieces it still misses.
  const collection = useCardCollection();
  const [chosen, setChosen] = useState<CollectionCardData | null>(null);
  const cards = collection.data?.cards ?? [];
  const shown = tab === "Coleção" ? (chosen ?? cards[0] ?? null) : null;

  const style = profile.cardStyle;
  const cardProps = {
    profile,
    finish: shown ? (shown.finish as CardFinish) : style.finish,
    pieces:
      shown && !shown.complete ? { missing: missingPieces(shown.status === "Upcoming" ? 0 : shown.pieces) } : undefined,
    title: cardTitleCode(style.title, profile.position),
    // The card always shows the profile photo (changed only in Editar perfil).
    photoUrl: profile.avatarUrl,
    flipped,
    onFlip: flip,
  };

  return (
    <>
      <View className="items-center mt-2 mb-4">
        <PlayerCard {...cardProps} width={Math.min(screenWidth - 80, 300)} faceRefs={faceRefs} testID="player-card" />
      </View>
      <View className="flex-row gap-2 mb-4">
        <ToolButton
          label={flipped ? "Ver frente" : "Ver verso"}
          icon={<RefreshCw size={14} color={colors.textOnDark} />}
          onPress={flip}
          testID="flip-card"
        />
        <ToolButton
          label="Ampliar"
          icon={<Maximize2 size={14} color={colors.textOnDark} />}
          onPress={() => setInspecting(true)}
          testID="inspect-card"
        />
        <ToolButton
          label={exporting ? "Exportando…" : "Salvar PNG"}
          icon={<Download size={14} color={colors.textOnDark} />}
          onPress={exportPng}
          disabled={exporting}
          testID="export-card"
        />
      </View>

      {exportMessage ? (
        <Text className="font-body text-caption text-danger mb-3" accessibilityLiveRegion="polite">
          {exportMessage}
        </Text>
      ) : null}

      {save.error ? (
        <Text className="font-body text-caption text-danger mb-3" accessibilityLiveRegion="polite">
          {save.error.message}
        </Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-white/10 mb-4 grow-0"
        contentContainerClassName="gap-5"
        accessibilityRole="tablist"
      >
        {TABS.map((t) => (
          <Pressable
            key={t}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            onPress={() => setTab(t)}
            className={`pb-3 border-b-2 ${tab === t ? "border-accent-light" : "border-transparent"}`}
          >
            <Text className={`font-body-bold text-body ${tab === t ? "text-accent-light" : "text-white/60"}`}>{t}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === "Acabamento" ? (
        <FinishPicker profile={profile} save={save} />
      ) : tab === "Título" ? (
        <TitlePicker profile={profile} save={save} />
      ) : tab === "Coleção" ? (
        collection.isPending ? (
          <SkeletonBlock tone="dark" className="h-56" />
        ) : (
          <CollectionTab profile={profile} save={save} cards={cards} chosen={shown} onChoose={setChosen} />
        )
      ) : (
        <StatsList profile={profile} />
      )}

      <Modal visible={inspecting} transparent animationType="fade" onRequestClose={() => setInspecting(false)} statusBarTranslucent>
        <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: CARD_SCREEN.bg }}>
          <Text className="font-mono text-mono text-white/60 tracking-widest mb-4">SUA CARTA</Text>
          <PlayerCard {...cardProps} width={Math.min(screenWidth - 40, 380)} testID="player-card-inspect" />
          <View className="flex-row gap-2 self-stretch mt-6">
            <ToolButton label="Virar" icon={<RefreshCw size={14} color={colors.textOnDark} />} onPress={flip} />
            <ToolButton label="Concluir" icon={<Check size={14} color={colors.textOnDark} />} onPress={() => setInspecting(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function CardScreen() {
  const { data, isPending, isError, refetch } = useMyProfile();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: CARD_SCREEN.bg }}>
      {/* Blue glow behind the card. */}
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
        <Text className="flex-1 text-center font-body-bold text-body-bold text-text-on-dark">Sua carta</Text>
        <View className="w-9" />
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">
        {isPending ? (
          <SkeletonBlock tone="dark" className="h-96 mt-2" />
        ) : isError ? (
          <ErrorBlock onRetry={() => refetch()} />
        ) : (
          <CardBody profile={data} />
        )}
      </ScrollView>
    </View>
  );
}
