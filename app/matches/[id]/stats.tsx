import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Minus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP } from '@/theme/layout';

/**
 * The match's stats sheet (API DECISIONS #84): cortadas, blocks, aces, salvadas
 * and assistências of each player who played. The organizer fills it from the
 * start of the game until the summary: tapping a count adds one, "−" takes one
 * back, and a player nobody tapped stays without a record (never zero). Everyone
 * else, and the organizer once the summary is out, reads it.
 *
 * Route param: id (match id).
 */
export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const matchId = id ?? '';
  const userId = useAuthStore((s) => s.userId);
  const detail = useMatchDetail(matchId);
  const sheet = usePlayerStats(matchId);
  const save = useSavePlayerStats(matchId);

  const [draft, setDraft] = useState<Record<string, PlayerActions> | null>(null);
  // Start from what is saved, once it arrives.
  useEffect(() => {
    if (sheet.data && draft === null) setDraft(sheet.data.byPlayer);
  }, [sheet.data, draft]);

  const match = detail.data;
  const canEdit = Boolean(match && match.organizerId === userId && sheet.data?.editable);
  // Who played: everyone confirmed with an account (guests have no profile to grow).
  const players = (match?.players ?? []).filter((p) => p.status === 'CONFIRMADO' && !p.isGuest);
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

  const onSave = () =>
    save.mutate(rows, {
      onSuccess: () => router.back(),
      onError: (error) => dialog.alert('Erro ao salvar', error.message),
    });

  const loading = detail.isPending || sheet.isPending;
  const failed = detail.isError || sheet.isError;

  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={ICON_HIT_SLOP}
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            testID="stats-back"
          >
            <ChevronLeft size={22} color={colors.surfaceDark} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-h1 text-text-primary uppercase">Estatísticas</Text>
            {match ? (
              <Text className="font-body text-caption text-text-muted" numberOfLines={1}>
                {match.name}
              </Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View className="px-4 gap-3" testID="stats-skeleton">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-28" />
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
        ) : (
          <>
            <ScrollView contentContainerClassName="px-4 pb-6 gap-3">
              {canEdit ? (
                <Text className="font-body text-caption text-text-muted">
                  Toque no número para somar. Quem ficar sem nada marcado não entra na conta.
                </Text>
              ) : null}
              {players.length === 0 ? (
                <StateMessage message="Ninguém confirmado nesta partida." />
              ) : (
                players.map((player) => (
                  <PlayerSheetRow
                    key={player.id}
                    player={player}
                    actions={rows[player.id]}
                    editable={canEdit}
                    onBump={(key, delta) => bump(player.id, key, delta)}
                    onClear={() => clear(player.id)}
                  />
                ))
              )}
            </ScrollView>
            {canEdit ? (
              <View className="px-4 pt-3 pb-2 border-t border-line bg-white">
                <Button
                  variant="grad"
                  onPress={onSave}
                  disabled={!changed}
                  loading={save.isPending}
                  testID="stats-save"
                >
                  Salvar estatísticas
                </Button>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

/** One player: the five counts; "—" while nothing is recorded for them. */
function PlayerSheetRow({
  player,
  actions,
  editable,
  onBump,
  onClear,
}: {
  player: PresencePlayer;
  actions: PlayerActions | undefined;
  editable: boolean;
  onBump: (key: PlayerActionKey, delta: 1 | -1) => void;
  onClear: () => void;
}) {
  return (
    <View className="rounded-card bg-white p-3 shadow-card" testID={`stats-row-${player.id}`}>
      <View className="flex-row items-center gap-3">
        <Avatar uri={player.avatarUrl} name={player.name} size="sm" />
        <View className="flex-1">
          <Text className="font-body-bold text-body-bold text-text-primary" numberOfLines={1}>
            {player.name}
          </Text>
          {player.handle ? (
            <Text className="font-body text-caption text-text-muted">@{player.handle}</Text>
          ) : null}
        </View>
        {editable && actions ? (
          <Pressable onPress={onClear} accessibilityRole="button" hitSlop={ICON_HIT_SLOP} testID={`stats-clear-${player.id}`}>
            <Text className="font-body-semibold text-caption text-text-muted">Limpar</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-3 flex-row gap-2">
        {PLAYER_ACTIONS.map(({ key, short, label }) => {
          const value = actions?.[key];
          const count = (
            <>
              <Text className="font-body-bold text-eyebrow text-text-muted uppercase">{short}</Text>
              <Text
                className="font-num text-h3"
                // Recorded counts in navy, "—" (nothing recorded) in muted: an inline
                // color, never a toggled className (DECISIONS #87).
                style={{ color: value === undefined ? colors.textMuted : colors.surfaceDark }}
              >
                {value ?? '—'}
              </Text>
            </>
          );
          return (
            <View key={key} className="flex-1 items-center">
              {editable ? (
                <Pressable
                  onPress={() => onBump(key, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} de ${player.name}: ${value ?? 0}. Somar um`}
                  className="w-full items-center rounded-chip bg-bg-light py-2"
                  testID={`stats-add-${key}-${player.id}`}
                >
                  {count}
                </Pressable>
              ) : (
                <View className="w-full items-center py-2">{count}</View>
              )}
              {editable ? (
                <Pressable
                  onPress={() => onBump(key, -1)}
                  disabled={!value}
                  accessibilityRole="button"
                  accessibilityLabel={`Tirar um de ${label}`}
                  hitSlop={ICON_HIT_SLOP}
                  className="mt-1 h-7 w-7 items-center justify-center rounded-full"
                  style={{ opacity: value ? 1 : 0.3 }}
                  testID={`stats-minus-${key}-${player.id}`}
                >
                  <Minus size={14} color={colors.surfaceDark} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
