import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerCard } from '@/components/domain/PlayerCard';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { StateMessage } from '@/components/ui/StateMessage';
import { usePlayerProfile } from '@/features/network/api/postsApi';
import { cardTitleCode } from '@/features/profile/card/cardTitles';
import { toMyProfile } from '@/features/profile/api/getMyProfile';
import { CARD_SCREEN } from '@/theme/cardFinish';
import { colors } from '@/theme/colors';

import { StatsList } from '../../profile/card';

/**
 * Another player's card, front and back, as they styled it (finish, title, card photo) and with
 * their public numbers (`GET /profiles/{id}`: totals only, never which match). Read-only.
 */
export default function PlayerCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [flipped, setFlipped] = useState(false);
  const player = usePlayerProfile(id);
  const profile = player.data ? toMyProfile(player.data, null) : null;

  return (
    <View className="flex-1" style={{ backgroundColor: CARD_SCREEN.bg }}>
      <LinearGradient
        colors={[CARD_SCREEN.glow, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
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
        <Text className="flex-1 text-center font-body-bold text-body-bold text-text-on-dark" numberOfLines={1}>
          {player.data ? `Carta de ${player.data.firstName}` : 'Carta'}
        </Text>
        <View className="w-9" />
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">
        {player.isPending ? (
          <SkeletonBlock tone="dark" className="h-96 mt-2" />
        ) : player.isError || !profile ? (
          <StateMessage
            tone="dark"
            message="Não foi possível carregar a carta"
            actionLabel="Tentar novamente"
            onAction={() => player.refetch()}
          />
        ) : (
          <>
            <View className="items-center mt-2 mb-4">
              <PlayerCard
                profile={profile}
                finish={profile.cardStyle.finish}
                title={cardTitleCode(profile.cardStyle.title, profile.position)}
                photoUrl={profile.cardStyle.photoUrl ?? profile.avatarUrl}
                flipped={flipped}
                onFlip={() => setFlipped((v) => !v)}
                width={Math.min(width - 80, 300)}
                testID="friend-card"
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFlipped((v) => !v)}
              className="flex-row items-center justify-center gap-2 rounded-chip border border-white/15 bg-white/5 py-3 mb-4"
              testID="friend-card-flip"
            >
              <RefreshCw size={14} color={colors.textOnDark} />
              <Text className="font-body-bold text-body text-text-on-dark">{flipped ? 'Ver frente' : 'Ver verso'}</Text>
            </Pressable>
            <StatsList profile={profile} />
          </>
        )}
      </ScrollView>
    </View>
  );
}
