import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Check, ChevronLeft, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardPiecesMini } from "@/components/domain/CardPiecesMini";
import { PlayerCard } from "@/components/domain/PlayerCard";
import { Button } from "@/components/ui/Button";
import { SkeletonBlock } from "@/components/ui/Skeleton";
import { dialog } from "@/components/ui/Dialog";
import { piecesWaiting, piecesWon, seasonFinish, useSeasonPass, type SeasonPass, type SeasonReward } from "@/features/pass/api/seasonPass";
import { PIECE_COUNT, PIECE_ORDER, missingPieces, pieceOfLevel } from "@/features/pass/lib/cardPieces";
import { dayMonth, seasonDays, seasonStatus } from "@/features/pass/lib/seasonText";
import { useMyProfile } from "@/features/profile/api/getMyProfile";
import { useSaveCardStyle } from "@/features/profile/api/saveCardStyle";
import { cardTitleCode, cardTitleName, type CardTitleCode } from "@/features/profile/card/cardTitles";
import type { MyProfile } from "@/features/profile/types/profile";
import { POINT_RULES } from "@/features/ranking/pointRules";
import { useAuthStore } from "@/stores/auth";
import { CARD_SCREEN } from "@/theme/cardFinish";
import { colors } from "@/theme/colors";

// The last number of pieces this phone showed the player, per account and
// season, to play the new piece's reveal once. Non-secret (CLAUDE.md).
const seenKey = (userId: string, season: string) => `quadra.pass.seen.${userId}.${season}`;

/**
 * The newest piece while the phone checks whether the player saw it (`checking`,
 * kept covered so it does not flash), then `reveal` when it is new to them.
 */
function useNewPiece(pass: SeasonPass): { checking: boolean; reveal?: number } {
  const userId = useAuthStore((s) => s.userId);
  const won = piecesWon(pass);
  const [state, setState] = useState<{ won: number; reveal?: number }>();

  useEffect(() => {
    if (!userId || won === 0) return;
    let active = true;
    const key = seenKey(userId, pass.season);
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (active) setState({ won, reveal: Number(seen ?? 0) < won ? pieceOfLevel(won) : undefined });
        return AsyncStorage.setItem(key, String(won));
      })
      // A preference: without it the reveal just does not play.
      .catch(() => active && setState({ won }));
    return () => {
      active = false;
    };
  }, [userId, pass.season, won]);

  return { checking: won > 0 && state?.won !== won, reveal: state?.won === won ? state.reveal : undefined };
}

function Bar({ value, max, testID }: { value: number; max: number; testID?: string }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View className="h-2 rounded-full bg-white/10 overflow-hidden" testID={testID}>
      <View className="h-2 rounded-full bg-accent-light" style={{ width: `${ratio * 100}%` }} />
    </View>
  );
}

// Points to the next piece, this week against the cap, or what the season's state means.
function ProgressPanel({ pass }: { pass: SeasonPass }) {
  const done = pass.level >= pass.levels;
  const intoLevel = pass.points - pass.level * pass.pointsPerLevel;
  const capped = pass.weekPoints >= pass.weeklyCap;

  return (
    <View className="rounded-card border border-white/10 bg-white/5 p-4 gap-4" testID="pass-progress">
      {pass.status === "Upcoming" ? (
        <Text className="font-body text-body text-white/80">
          {`A temporada começa em ${dayMonth(Date.parse(pass.startsAt))}. Os pontos das suas partidas contam a partir daí.`}
        </Text>
      ) : done ? (
        <Text className="font-body-bold text-body text-accent-light">
          {/* Without the paid track the last level does not give the card (DECISIONS #194). */}
          {seasonFinish(pass)?.unlocked ? "Você completou o passe. A carta é sua." : "Você chegou ao último nível do passe."}
        </Text>
      ) : (
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="font-body-bold text-body text-text-on-dark">Próximo pedaço</Text>
            <Text className="font-num text-body text-text-on-dark">{`${intoLevel} / ${pass.pointsPerLevel} pts`}</Text>
          </View>
          <Bar value={intoLevel} max={pass.pointsPerLevel} testID="pass-next-bar" />
        </View>
      )}

      {pass.status === "Active" && !done ? (
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="font-body-bold text-caption text-white/70">Esta semana</Text>
            <Text className="font-num text-caption text-white/70">{`${pass.weekPoints} / ${pass.weeklyCap} pts`}</Text>
          </View>
          <Bar value={pass.weekPoints} max={pass.weeklyCap} />
          <Text className="font-body text-caption text-white/60">
            {capped
              ? "Você chegou ao limite da semana. Os pontos voltam a contar na segunda."
              : `Contam até ${pass.weeklyCap} pontos por semana, de segunda a domingo.`}
          </Text>
        </View>
      ) : null}

      {pass.status === "Ended" ? (
        <Text className="font-body text-caption text-white/60">A temporada acabou. Sua carta fica como está, com os pedaços que você ganhou.</Text>
      ) : null}
    </View>
  );
}

// One level of the pass: its piece and, on some levels, a card title.
function LevelRow({
  level,
  rewards,
  pass,
  profile,
  onUseTitle,
}: {
  level: number;
  rewards: SeasonReward[];
  pass: SeasonPass;
  profile: MyProfile;
  onUseTitle: (code: CardTitleCode) => void;
}) {
  const piece = rewards.find((r) => r.kind === "Piece");
  const title = rewards.find((r) => r.kind === "Title");
  const finish = rewards.find((r) => r.kind === "Finish");
  const reached = pass.level >= level;
  const next = pass.status !== "Ended" && pass.level + 1 === level;
  const missingPoints = level * pass.pointsPerLevel - pass.points;
  const equippedTitle = cardTitleCode(profile.cardStyle.title, profile.position);

  return (
    <View
      className={`flex-row items-center gap-3 rounded-chip border px-3 py-3 mb-2 ${next ? "border-accent-light bg-accent-light/10" : "border-white/10 bg-white/5"}`}
      testID={`pass-level-${level}`}
    >
      <View className={`h-9 w-9 items-center justify-center rounded-full ${reached ? "bg-accent-light" : "border border-white/20"}`}>
        <Text className={`font-num text-body ${reached ? "text-surface-dark" : "text-white/60"}`}>{level}</Text>
      </View>
      <CardPiecesMini collected={piecesWon(pass)} highlight={pieceOfLevel(level)} width={26} />
      <View className="flex-1">
        <Text className={`font-body-bold text-body ${reached ? "text-text-on-dark" : "text-white/70"}`}>
          {finish ? "Último pedaço · carta completa" : `Pedaço ${level}`}
        </Text>
        {title ? (
          <Text className="font-body text-caption text-accent-light mt-1">{`Título "${cardTitleName(title.code as CardTitleCode)}"`}</Text>
        ) : null}
        {finish ? <Text className="font-body text-caption text-accent-light mt-1">Acabamento Pioneira</Text> : null}
        {next && missingPoints > 0 ? (
          <Text className="font-body text-caption text-white/60 mt-1">{`Faltam ${missingPoints} pts`}</Text>
        ) : null}
        {piece && reached && !piece.unlocked ? (
          <Text className="font-body text-caption text-white/60 mt-1">O pedaço vem com o passe pago</Text>
        ) : null}
      </View>
      {title?.unlocked ? (
        equippedTitle === title.code ? (
          <Text className="font-mono text-mono text-accent-light">NA CARTA</Text>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Usar o título ${cardTitleName(title.code as CardTitleCode)}`}
            onPress={() => onUseTitle(title.code as CardTitleCode)}
            className="rounded-full border border-accent-light px-3 py-1"
            testID={`use-title-${title.code}`}
          >
            <Text className="font-body-bold text-caption text-accent-light">Usar</Text>
          </Pressable>
        )
      ) : piece?.unlocked ? (
        <Check size={18} color={colors.accentLight} />
      ) : (
        <Lock size={16} color={colors.textMuted} />
      )}
    </View>
  );
}

// The purchase needs Google Play Billing (not built yet): until then the button
// says so. In the closed test everyone has the paid track, so nobody sees it.
function unlockPass() {
  dialog.alert("A compra do passe chega em breve", "Durante o teste, o passe fica liberado para todo mundo.");
}

function PassBody({ pass, profile }: { pass: SeasonPass; profile: MyProfile }) {
  const { width: screenWidth } = useWindowDimensions();
  const [flipped, setFlipped] = useState(false);
  const save = useSaveCardStyle();
  const { checking, reveal } = useNewPiece(pass);
  const won = piecesWon(pass);
  // Without the paid track the pieces reached stay covered, with a padlock (DECISIONS #194).
  const waiting = piecesWaiting(pass);
  // While checking, the newest piece stays covered like a missing one.
  const missing = checking ? missingPieces(won - 1) : missingPieces(won);
  const finish = seasonFinish(pass);
  const equipped = profile.cardStyle.finish === finish?.code;
  const levels = Array.from({ length: pass.levels }, (_, i) => i + 1);
  const equipTitle = (code: CardTitleCode) => save.mutate({ finish: profile.cardStyle.finish, title: code });

  return (
    <>
      <View className="flex-row items-start justify-between mt-2">
        <View>
          <Text className="font-mono text-mono text-accent-light tracking-widest">{pass.name.toUpperCase()}</Text>
          <Text className="font-body text-caption text-white/60 mt-1">{seasonDays(pass)}</Text>
        </View>
        <View className="rounded-full border border-white/20 px-3 py-1">
          <Text className="font-body-bold text-caption text-text-on-dark" testID="pass-status">{seasonStatus(pass)}</Text>
        </View>
      </View>

      <View className="items-center mt-6">
        <PlayerCard
          profile={profile}
          finish="Pioneira"
          title={cardTitleCode(profile.cardStyle.title, profile.position)}
          photoUrl={profile.avatarUrl}
          flipped={flipped}
          onFlip={() => setFlipped((v) => !v)}
          width={Math.min(screenWidth - 120, 250)}
          pieces={missing.length === 0 && reveal == null ? undefined : {
            missing,
            next: pass.level < PIECE_COUNT ? pieceOfLevel(pass.level + 1) : undefined,
            reveal,
            locked: PIECE_ORDER.slice(won, won + waiting),
          }}
          testID="season-card"
        />
        <Text className="font-num text-num text-text-on-dark mt-5" testID="pass-pieces">{`${won} de ${PIECE_COUNT}`}</Text>
        <Text className="font-body text-caption text-white/60 text-center mt-1 px-6">
          Pedaços da carta Pioneira. Ela só existe nesta temporada; quem não completa fica com a carta incompleta.
        </Text>
      </View>

      {!pass.premium && pass.status !== "Ended" ? (
        <View className="mt-5 rounded-card border border-accent-light/40 bg-accent-light/10 p-4" testID="pass-unlock">
          <Text className="font-body-bold text-body text-text-on-dark">
            {waiting > 0
              ? `Você já conquistou ${waiting} ${waiting === 1 ? "pedaço" : "pedaços"}.`
              : "Os pedaços da carta vêm com o passe."}
          </Text>
          <Text className="font-body text-caption text-white/70 mt-1">
            {waiting > 0
              ? "Libere o passe e eles entram na sua carta na hora. Os títulos da trilha grátis continuam seus."
              : "Seus pontos já contam: quando liberar o passe, os pedaços alcançados entram de uma vez."}
          </Text>
          <View className="mt-3">
            <Button variant="grad" onPress={unlockPass} testID="pass-unlock-button">
              Liberar o passe
            </Button>
          </View>
        </View>
      ) : null}

      {finish?.unlocked ? (
        <View className="mt-5">
          {equipped ? (
            <View className="flex-row items-center justify-center gap-2 py-3">
              <Check size={18} color={colors.accentLight} />
              <Text className="font-body-bold text-body text-accent-light">Equipada na sua carta</Text>
            </View>
          ) : (
            <Button
              variant="grad"
              onPress={() => save.mutate({ finish: "Pioneira", title: profile.cardStyle.title })}
              loading={save.isPending}
              testID="equip-season-card"
            >
              Equipar na minha carta
            </Button>
          )}
        </View>
      ) : null}

      {save.error ? (
        <Text className="font-body text-caption text-danger mt-3" accessibilityLiveRegion="polite">
          {save.error.message}
        </Text>
      ) : null}

      <View className="mt-6">
        <ProgressPanel pass={pass} />
      </View>

      <Text className="font-display text-h2 text-text-on-dark uppercase mt-8 mb-3">Recompensas</Text>
      {levels.map((level) => (
        <LevelRow
          key={level}
          level={level}
          rewards={pass.rewards.filter((r) => r.level === level)}
          pass={pass}
          profile={profile}
          onUseTitle={equipTitle}
        />
      ))}

      <Text className="font-display text-h2 text-text-on-dark uppercase mt-8 mb-3">Como ganhar pontos</Text>
      {POINT_RULES.map((rule) => (
        <View key={rule.title} className="flex-row items-center gap-3 rounded-chip border border-white/10 bg-white/5 px-3 py-3 mb-2">
          <View className={`h-11 w-11 items-center justify-center rounded-chip ${rule.mvp ? "bg-accent" : "bg-white/10"}`}>
            <Text className={`font-num text-body ${rule.mvp ? "text-surface-dark" : "text-text-on-dark"}`}>{rule.badge}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-body-bold text-body text-text-on-dark">{rule.title}</Text>
            <Text className="font-body text-caption text-white/60">{rule.detail}</Text>
          </View>
        </View>
      ))}
      <Text className="font-body text-caption text-white/60 mt-2 mb-4">
        {`São os mesmos pontos do ranking. Um pedaço a cada ${pass.pointsPerLevel} pontos, no máximo ${pass.weeklyCap} pontos por semana.`}
      </Text>
    </>
  );
}

/**
 * Season pass (API DECISIONS #98): the season's card being put together piece
 * by piece, the points to the next piece and this week's, the 12 levels with
 * their rewards, and how points are earned.
 */
export default function SeasonPassScreen() {
  const pass = useSeasonPass();
  const profile = useMyProfile();
  const insets = useSafeAreaInsets();
  const pending = pass.isPending || profile.isPending;
  const failed = pass.isError || profile.isError;

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
        <Text className="flex-1 text-center font-body-bold text-body-bold text-text-on-dark">Passe da temporada</Text>
        <View className="w-9" />
      </View>
      <ScrollView contentContainerClassName="px-5" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {pending ? (
          <SkeletonBlock tone="dark" className="h-96 mt-2" />
        ) : failed ? (
          <View className="mt-10 items-center gap-4" accessibilityLiveRegion="polite">
            <Text className="font-body text-body text-white/70 text-center">Não foi possível carregar o passe</Text>
            <Button variant="outlineW" onPress={() => { pass.refetch(); profile.refetch(); }}>
              Tentar novamente
            </Button>
          </View>
        ) : pass.data && profile.data ? (
          <PassBody pass={pass.data} profile={profile.data} />
        ) : (
          <Text className="font-body text-body text-white/70 text-center mt-10">Nenhuma temporada no momento.</Text>
        )}
      </ScrollView>
    </View>
  );
}
