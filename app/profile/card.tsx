import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Check, ChevronLeft, Download, Maximize2, Plus, RefreshCw } from "lucide-react-native";
import { type ReactNode, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { QuadraWordmark } from "@/components/icons/QuadraWordmark";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useSaveCardStyle } from "@/features/profile/api/saveCardStyle";
import { CARD_TITLES, cardTitleCode } from "@/features/profile/card/cardTitles";
import type { MyProfile } from "@/features/profile/types/profile";
import { CARD_FINISHES, CARD_FINISH_ORDER, CARD_SCREEN, CARD_TIERS, CARD_TIER_ORDER, cardTier } from "@/theme/cardFinish";
import { colors } from "@/theme/colors";

const TABS = ["Acabamento", "Título", "Estatísticas"] as const;
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
              <LinearGradient
                colors={t.swatch}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ height: 56, borderRadius: t.shape === "rounded" ? 14 : 7, alignItems: "center", justifyContent: "center" }}
              >
                <QuadraWordmark variant={t.logo} height={20} />
              </LinearGradient>
              <Text className="font-body-bold text-caption text-text-on-dark mt-2">{t.name}</Text>
              <Text className="font-mono text-mono text-white/60 mt-1">{equipped ? "EQUIPADO" : "EXPERIMENTAR"}</Text>
            </PressableScale>
          );
        })}
      </View>
      <TierNote level={profile.level} />
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
      <Text className="font-body text-caption text-white/60 my-3">
        Títulos de identidade. Eles não representam uma classificação técnica.
      </Text>
    </>
  );
}

export function StatsList({ profile }: { profile: MyProfile }) {
  const r = profile.record;
  const rows: [string, string, number][] = [
    ["Partidas", "Partidas concluídas em quadra", r.matches],
    ["Vitórias", "Partidas em que o time venceu", r.wins],
    ["Derrotas", "Partidas em que o time perdeu", r.losses],
    ["Empates", "Partidas encerradas empatadas", r.draws],
    ["MVPs", "Vezes eleito o melhor da partida", r.mvps],
    ["Pontos", "Presença +10, vitória +15, MVP +25", profile.points],
  ];
  return (
    <>
      <Text className="font-body text-caption text-white/60 mb-3">
        Só partidas concluídas e registradas compõem a carta.
      </Text>
      {rows.map(([label, hint, value]) => (
        <View key={label} className="flex-row items-center justify-between rounded-chip border border-white/15 bg-white/5 px-3 py-3 mb-2">
          <View className="flex-1">
            <Text className="font-body-bold text-body text-text-on-dark">{label}</Text>
            <Text className="font-body text-caption text-white/60 mt-1">{hint}</Text>
          </View>
          <Text className="font-num text-h3 text-text-on-dark">{value}</Text>
        </View>
      ))}
      <Text className="font-body text-caption text-white/60 my-3">
        O nível representa experiência no app. Acabamentos e títulos não dão pontos nem vantagem no sorteio.
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

  const style = profile.cardStyle;
  const cardProps = {
    profile,
    finish: style.finish,
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

      <View className="flex-row gap-6 border-b border-white/10 mb-4" accessibilityRole="tablist">
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
      </View>

      {tab === "Acabamento" ? (
        <FinishPicker profile={profile} save={save} />
      ) : tab === "Título" ? (
        <TitlePicker profile={profile} save={save} />
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
