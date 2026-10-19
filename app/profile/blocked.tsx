import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { dialog } from '@/components/ui/Dialog';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { useBlockedPlayers, useSetBlock } from '@/features/network/api/postsApi';

// "Jogadores bloqueados" (Configurações → Privacidade): who I blocked, and the way back.
export default function BlockedPlayersScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const blocked = useBlockedPlayers();
  const setBlock = useSetBlock();

  const unblock = (userId: string, name: string) =>
    dialog.alert(`Desbloquear ${name}?`, 'Vocês voltam a ver os posts um do outro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbloquear',
        onPress: () =>
          setBlock.mutate(
            { userId, blocked: false },
            { onError: () => dialog.alert('Não deu certo', 'Tente de novo em instantes.') },
          ),
      },
    ]);

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView contentContainerClassName="pb-24" contentContainerStyle={{ paddingTop: headerHeight + 16 }}>
        {blocked.isPending ? (
          <View className="mx-4 gap-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </View>
        ) : blocked.isError ? (
          <StateMessage
            message="Não foi possível carregar"
            actionLabel="Tentar novamente"
            onAction={() => blocked.refetch()}
          />
        ) : blocked.data.length === 0 ? (
          <StateMessage message="Você não bloqueou ninguém." />
        ) : (
          <View className="mx-4 bg-white rounded-card shadow-card overflow-hidden">
            {blocked.data.map((player, index) => (
              <View
                key={player.userId}
                className={`flex-row items-center px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
              >
                <View className="flex-1">
                  <Text className="font-body-extrabold text-h3 text-text-primary">{player.displayName}</Text>
                  {player.handle ? (
                    <Text className="font-body text-caption text-text-muted">@{player.handle}</Text>
                  ) : null}
                </View>
                <Button variant="ghost" onPress={() => unblock(player.userId, player.displayName)}>
                  Desbloquear
                </Button>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <BackHeader title="Bloqueados" onHeight={setHeaderHeight} />
    </View>
  );
}
