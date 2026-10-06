import { router } from 'expo-router';
import { Bell, Settings, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors } from '@/theme/colors';
import { ICON_HIT_SLOP, ICON_RIPPLE } from '@/theme/layout';

function goSettings() {
  router.push('/profile/settings');
}

export default function NetworkScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View className="flex-1 bg-bg-light">
      {/* Placeholder / empty state — vertically centered below the header */}
      <View
        className="flex-1 items-center justify-center px-8 bg-bg-light"
        style={{ paddingTop: headerHeight }}
        accessibilityLiveRegion="polite"
      >
        <View className="bg-white rounded-full shadow-card w-20 h-20 items-center justify-center">
          <Users size={40} color={colors.textMuted} />
        </View>

        <Text className="font-body-extrabold text-h3 text-text-primary text-center mt-6">
          Em breve: rede social de jogadores
        </Text>
        <Text className="font-body text-body text-text-muted text-center mt-2">
          Aqui você vai acompanhar a galera, ver resultados e novidades das suas
          quadras.
        </Text>
      </View>

      {/* Screen header — mirrors S5 Home / S6 Explore */}
      <ScreenHeader onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            REDE
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              hitSlop={ICON_HIT_SLOP}
              android_ripple={ICON_RIPPLE}
              onPress={() => {}}
            >
              <Bell size={24} color={colors.surfaceDark} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              hitSlop={ICON_HIT_SLOP}
              android_ripple={ICON_RIPPLE}
              onPress={goSettings}
            >
              <Settings size={24} color={colors.surfaceDark} />
            </Pressable>
          </View>
        </View>
      </ScreenHeader>
    </View>
  );
}
