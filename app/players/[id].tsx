import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import {
  useFollowState,
  usePlayerProfile,
  useSetFollow,
} from '@/features/network/api/postsApi';
import { useMyProfile } from '@/features/profile/api/getMyProfile';
import type { ApiLevel } from '@/features/profile/api/profileApi';
import { positionLabel } from '@/features/profile/schema/onboarding';

const LEVEL_LABEL: Record<ApiLevel, string> = {
  Beginner: 'Iniciante',
  Intermediate: 'Intermediário',
  Advanced: 'Avançado',
  Elite: 'Elite',
};

function Count({ value, label }: { value: number | undefined; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-num text-h2 text-text-primary">{value ?? '–'}</Text>
      <Text className="font-body text-caption text-text-muted">{label}</Text>
    </View>
  );
}

/** Another player's public profile, with the follow button. */
export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [headerHeight, setHeaderHeight] = useState(0);
  const profile = usePlayerProfile(id);
  const follow = useFollowState(id);
  const setFollow = useSetFollow(id);
  const me = useMyProfile();
  const isMe = me.data?.id === id;
  const following = follow.data?.followedByMe ?? false;

  return (
    <View className="flex-1 bg-bg-light">
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        contentContainerStyle={{ paddingTop: headerHeight + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {profile.isPending ? (
          <View className="gap-4">
            <SkeletonBlock className="h-[180px]" />
            <SkeletonBlock className="h-[96px]" />
          </View>
        ) : profile.isError ? (
          <StateMessage
            message="Não foi possível carregar este jogador"
            actionLabel="Tentar novamente"
            onAction={() => profile.refetch()}
          />
        ) : (
          <>
            <View className="bg-white rounded-card shadow-card p-4 items-center">
              <Avatar
                uri={profile.data.photoUrl ?? undefined}
                name={profile.data.displayName}
                size="lg"
                level={profile.data.stats.levelNumber}
              />
              <Text className="mt-3 font-body-extrabold text-h3 text-text-primary text-center">
                {profile.data.displayName}
              </Text>
              <Text className="font-body text-caption text-text-muted text-center">
                {[
                  profile.data.handle ? `@${profile.data.handle}` : null,
                  LEVEL_LABEL[profile.data.level],
                  positionLabel(profile.data.position ?? undefined),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              <View className="flex-row mt-4 self-stretch">
                <Count value={follow.data?.followersCount} label="Seguidores" />
                <Count value={follow.data?.followingCount} label="Seguindo" />
              </View>

              {isMe ? null : (
                <View className="mt-4 self-stretch">
                  <Button
                    variant={following ? 'outline' : 'grad'}
                    onPress={() => setFollow.mutate(!following)}
                    disabled={follow.isPending}
                    loading={setFollow.isPending}
                    testID="follow-button"
                  >
                    {following ? 'Seguindo' : 'Seguir'}
                  </Button>
                  {setFollow.isError ? (
                    <Text
                      className="mt-2 text-center font-body text-caption text-danger"
                      accessibilityLiveRegion="polite"
                    >
                      Não foi possível atualizar. Tente novamente.
                    </Text>
                  ) : null}
                </View>
              )}
            </View>

            <View className="mt-4 bg-white rounded-card shadow-card p-4 flex-row">
              <Count value={profile.data.stats.matchesPlayed} label="Partidas" />
              <Count value={profile.data.stats.wins} label="Vitórias" />
              <Count value={profile.data.stats.mvpsReceived} label="MVPs" />
            </View>

            <View className="mt-4">
              <Button
                variant="outline"
                onPress={() => router.push({ pathname: '/players/[id]/card', params: { id } })}
                testID="see-card"
              >
                Ver carta
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <BackHeader title="Jogador" onHeight={setHeaderHeight} />
    </View>
  );
}
