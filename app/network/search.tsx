import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { TextField } from '@/components/ui/TextField';
import { toHandleQuery, usePlayerSearch } from '@/features/network/api/postsApi';
import { positionLabel } from '@/features/profile/schema/onboarding';
import { useDebounced } from '@/hooks/useDebounced';

// "Buscar jogador" (Rede): by @ only, never by name (API DECISIONS #75).
export default function PlayerSearchScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [text, setText] = useState('');
  const query = toHandleQuery(useDebounced(text, 300));
  const search = usePlayerSearch(query);

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        contentContainerStyle={{ paddingTop: headerHeight + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Buscar pelo @"
          value={text}
          onChangeText={setText}
          placeholder="@usuario"
          maxLength={21}
          testID="player-search-input"
        />
        <Text className="mt-2 font-body text-caption text-text-muted">
          Só pelo @ do jogador, nunca pelo nome.
        </Text>

        <View className="mt-4">
          {query === null ? null : search.isPending ? (
            <SkeletonBlock className="h-16" />
          ) : search.isError ? (
            <StateMessage message="Não foi possível buscar" actionLabel="Tentar novamente" onAction={() => search.refetch()} />
          ) : search.data.length === 0 ? (
            <StateMessage message={`Ninguém com @ começando por "${query}".`} />
          ) : (
            <View className="bg-white rounded-card shadow-card overflow-hidden">
              {search.data.map((player, index) => (
                <Pressable
                  key={player.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver perfil de ${player.displayName}`}
                  onPress={() => router.push({ pathname: '/players/[id]', params: { id: player.userId } })}
                  className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
                  testID="player-search-result"
                >
                  <Avatar uri={player.photoUrl ?? undefined} name={player.displayName} size="sm" />
                  <View className="flex-1">
                    <Text className="font-body-bold text-body-bold text-text-primary">@{player.handle}</Text>
                    <Text className="font-body text-caption text-text-muted" numberOfLines={1}>
                      {[player.displayName, positionLabel(player.position ?? undefined)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BackHeader title="Buscar jogador" onHeight={setHeaderHeight} />
    </View>
  );
}
