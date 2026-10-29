import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronLeft, Fence, HandHelping, Lock, Minus, Plus, Volleyball, Zap } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { useMatchDetail } from '@/features/matches/api/getMatchDetail';
import { usePlayerStats, useSavePlayerStats } from '@/features/matches/api/playerStats';
import {
  MAX_ACTION_COUNT,
  NO_ACTIONS,
  PLAYER_ACTIONS,
  type PlayerActionKey,
  type PlayerActions,
} from '@/features/matches/lib/playerActions';
import type { PresencePlayer } from '@/features/matches/types/matchDetail';
import { positionLabel } from '@/features/profile/schema/onboarding';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { colors, withAlpha } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

/** The icon of each action's row, in the designer's style. */
const ACTION_ICON: Record<PlayerActionKey, LucideIcon> = {
  kills: Volleyball,
  blocks: Fence,
  aces: Zap,
  digs: Lock,
  assists: HandHelping,
};

/**
 * The match's stats sheet (API DECISIONS #84), one player at a time: their
 * photo and name, then the five actions by their whole name (Cortadas, Blocks,
 * Aces, Salvadas, Assistências) with "−" / "+". The
 * organizer fills it from the start of the game until the summary and picks the
 * player in the strip at the top; a player nobody touched stays without a
 * record (never zero). Everyone else, and the organizer once the summary is
 * out, reads it.
 *
 * Route params: id (match id); flow = "end" when the organizer has just ended
 * the match — "Confirmar estatísticas" then goes on to the MVP vote instead of
 * back.
 */
export default function StatsScreen() {
  const { id, flow } = useLocalSearchParams<{ id?: string; flow?: string }>();
  const matchId = id ?? '';
  const endFlow = flow === 'end';
  const userId = useAuthStore((s) => s.userId);
  const detail = useMatchDetail(matchId);
  const sheet = usePlayerStats(matchId);
  const save = useSavePlayerStats(matchId);

  const [draft, setDraft] = useState<Record<string, PlayerActions> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Start from what is saved, once it arrives.
  useEffect(() => {
    if (sheet.data && draft === null) setDraft(sheet.data.byPlayer);
  }, [sheet.data, draft]);

  const match = detail.data;
  const canEdit = Boolean(match && match.organizerId === userId && sheet.data?.editable);
  // Who played: everyone confirmed with an account (guests have no profile to grow).
  const players = (match?.players ?? []).filter((p) => p.status === 'CONFIRMADO' && !p.isGuest);
  // The viewer first when they played, else the first on the list.
  const player =
    players.find((p) => p.id === selectedId) ??
    players.find((p) => p.id === userId) ??
    players[0];
  const rows = draft ?? {};
  const changed = JSON.stringify(rows) !== JSON.stringify(sheet.data?.byPlayer ?? {});

  const bump = (playerId: string, key: PlayerActionKey, delta: 1 | -1) =>
    setDraft((prev) => {
      const current = prev?.[playerId] ?? NO_ACTIONS;
      const value = Math.min(MAX_ACTION_COUNT, Math.max(0, current[key] + delta));
      return { ...prev, [playerId]: { ...current, [key]: value } };
    });
  const clear = (playerId: string) =>
    setDraft((prev) => {
      const next = { ...prev };
      delete next[playerId];
      return next;
    });

  const goOn = () => {
    if (endFlow) {
      router.replace({ pathname: '/matches/[id]/mvp-vote', params: { id: matchId } });
    } else {
      router.back();
    }
  };
  const onConfirm = () => {
    if (!changed) {
      goOn();
      return;
    }
    save.mutate(rows, {
      onSuccess: goOn,
      onError: (error) => dialog.alert('Erro ao salvar', error.message),
    });
  };

  const loading = detail.isPending || sheet.isPending;
  const failed = detail.isError || sheet.isError;

  return (
    <View className="flex-1 bg-surface-dark">
      {/* The blue glow at the top of the designer's screen, over the navy. */}
      <LinearGradient
        colors={[withAlpha(colors.primary, 0.35), withAlpha(colors.primary, 0)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={ICON_HIT_SLOP}
            className="h-11 w-11 items-center justify-center rounded-chip bg-white/10"
            testID="stats-back"
          >
            <ChevronLeft size={22} color={colors.textOnDark} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-mono text-mono uppercase tracking-widest text-white/60">
              {endFlow ? 'Fim de jogo' : 'Estatísticas'}
            </Text>
            {match ? (
              <Text className="font-body-bold text-body-bold text-text-on-dark" numberOfLines={1}>
                {match.name}
              </Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View className="px-4 gap-3 items-center" testID="stats-skeleton">
            <SkeletonBlock tone="dark" className="h-32 w-32 rounded-full" />
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} tone="dark" className="h-16 self-stretch" />
            ))}
          </View>
        ) : failed ? (
          <View className="flex-1 justify-center px-6">
            <StateMessage
              message={
                sheet.error instanceof ApiError && sheet.error.status === 403
                  ? 'Só quem jogou a partida vê as estatísticas.'
                  : 'Não foi possível carregar as estatísticas.'
              }
              actionLabel="Tentar de novo"
              onAction={() => {
                void detail.refetch();
                void sheet.refetch();
              }}
            />
          </View>
        ) : !player ? (
          <View className="flex-1 justify-center px-6">
            <Text className="text-center font-body text-body text-white/70">
              Ninguém confirmado nesta partida.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerClassName="px-4 pb-6">
              {players.length > 1 ? (
                <PlayerStrip
                  players={players}
                  selectedId={player.id}
                  recorded={rows}
                  onSelect={setSelectedId}
                />
              ) : null}

              <PlayerHero player={player} isViewer={player.id === userId} editable={canEdit} />

              <View className="mt-5 gap-3" testID={`stats-row-${player.id}`}>
                {PLAYER_ACTIONS.map(({ key, label }) => (
                  <StatRow
                    key={key}
                    icon={ACTION_ICON[key]}
                    label={label}
                    value={rows[player.id]?.[key]}
                    editable={canEdit}
                    onBump={(delta) => bump(player.id, key, delta)}
                    playerName={player.name}
                    testKey={`${key}-${player.id}`}
                  />
                ))}
              </View>

              {canEdit && rows[player.id] ? (
                <Pressable
                  onPress={() => clear(player.id)}
                  accessibilityRole="button"
                  hitSlop={ICON_HIT_SLOP}
                  className="mt-4 self-center py-1"
                  testID={`stats-clear-${player.id}`}
                >
                  <Text className="font-body-semibold text-caption text-white/60">
                    Limpar as estatísticas de {firstName(player.name)}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
            {canEdit || endFlow ? (
              <View className="px-4 pt-4 pb-2 border-t border-white/10">
                <Button
                  variant="grad"
                  onPress={canEdit ? onConfirm : goOn}
                  disabled={canEdit && !endFlow && !changed}
                  loading={save.isPending}
                  leftIcon={<Check size={18} color={colors.surfaceDark} />}
                  testID="stats-save"
                >
                  {canEdit ? 'Confirmar estatísticas' : 'Ir para o MVP'}
                </Button>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

/** Who to fill: one avatar per player, lime ring on the selected one, lime dot once recorded. */
function PlayerStrip({
  players,
  selectedId,
  recorded,
  onSelect,
}: {
  players: PresencePlayer[];
  selectedId: string;
  recorded: Record<string, PlayerActions>;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 pb-4"
      testID="stats-player-strip"
    >
      {players.map((p) => {
        const selected = p.id === selectedId;
        return (
          <Pressable
            key={p.id}
            onPress={() => onSelect(p.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={p.name}
            className="items-center"
            testID={`stats-pick-${p.id}`}
          >
            <View
              className={`rounded-full border-2 p-[2px] ${selected ? 'border-accent' : 'border-transparent'}`}
              style={{ opacity: selected ? 1 : 0.6 }}
            >
              <Avatar uri={p.avatarUrl} name={p.name} size="sm" />
            </View>
            <View
              className={`mt-1 h-1.5 w-1.5 rounded-full ${recorded[p.id] ? 'bg-accent' : 'bg-transparent'}`}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** The big photo with a lime ring, the name in display type, "@handle · Posição" and the hint. */
function PlayerHero({
  player,
  isViewer,
  editable,
}: {
  player: PresencePlayer;
  isViewer: boolean;
  editable: boolean;
}) {
  const meta = [player.handle ? `@${player.handle}` : null, positionLabel(player.position)]
    .filter(Boolean)
    .join(' · ');
  const who = isViewer ? 'você' : firstName(player.name);
  return (
    <View className="items-center">
      <View className="rounded-full border-4 border-accent p-1">
        <Avatar uri={player.avatarUrl} name={player.name} size="xl" level={player.level} />
      </View>
      <Text
        className="mt-4 text-center font-display text-display uppercase text-text-on-dark"
        numberOfLines={1}
        adjustsFontSizeToFit
        testID="stats-player-name"
      >
        {player.name}
      </Text>
      {meta ? (
        <Text className="mt-1 font-body-bold text-caption text-accent">{meta}</Text>
      ) : null}
      <Text className="mt-3 text-center font-body text-body text-white/70">
        {editable
          ? `Anote o que ${who} fez nessa partida.\nIsso conta pro ranking.`
          : 'O que foi registrado nessa partida.'}
      </Text>
    </View>
  );
}

/** One count: icon tile, label, then "−", the number ("—" while nothing is recorded) and "+". */
function StatRow({
  icon: Icon,
  label,
  value,
  editable,
  onBump,
  playerName,
  testKey,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  editable: boolean;
  onBump: (delta: 1 | -1) => void;
  playerName: string;
  testKey: string;
}) {
  return (
    <View className="flex-row items-center gap-4 rounded-card border border-white/10 bg-white/5 px-4 py-3">
      <View className="h-11 w-11 items-center justify-center rounded-chip bg-white/10">
        <Icon size={20} color={colors.textOnDark} />
      </View>
      <Text className="flex-1 font-body-bold text-body-bold text-text-on-dark">{label}</Text>
      {editable ? (
        <Pressable
          onPress={() => onBump(-1)}
          disabled={!value}
          accessibilityRole="button"
          accessibilityLabel={`Tirar um de ${label}`}
          hitSlop={ICON_HIT_SLOP}
          className="h-10 w-10 items-center justify-center rounded-chip border border-white/15"
          style={{ opacity: value ? 1 : 0.4 }}
          testID={`stats-minus-${testKey}`}
        >
          <Minus size={18} color={colors.textOnDark} />
        </Pressable>
      ) : null}
      <Text
        className="w-10 text-center font-num text-h1"
        // Recorded counts in white, "—" (nothing recorded) dimmed: an inline
        // color, never a toggled className (DECISIONS #87).
        style={{ color: value === undefined && !editable ? withAlpha(colors.textOnDark, 0.4) : colors.textOnDark }}
        testID={`stats-value-${testKey}`}
      >
        {value ?? (editable ? 0 : '—')}
      </Text>
      {editable ? (
        <Pressable
          onPress={() => onBump(1)}
          accessibilityRole="button"
          accessibilityLabel={`${label} de ${playerName}: ${value ?? 0}. Somar um`}
          hitSlop={ICON_HIT_SLOP}
          className="h-10 w-10 items-center justify-center rounded-chip bg-accent"
          testID={`stats-add-${testKey}`}
        >
          <Plus size={18} color={colors.surfaceDark} />
        </Pressable>
      ) : null}
    </View>
  );
}
