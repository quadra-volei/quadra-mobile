import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import { Bell, Settings, Users } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassHeader } from '@/components/ui/GlassHeader';
import { useRegisterNavBlurTarget } from '@/stores/navBlurTarget';
import { colors } from '@/theme/colors';

function goSettings() {
  router.push('/profile/settings');
}

export default function NetworkScreen() {
  const [headerHeight, setHeaderHeight] = useState(0);
  const blurTarget = useRef<View>(null);
  useRegisterNavBlurTarget(blurTarget);

  return (
    <View className="flex-1 bg-bg-light">
      {/* Placeholder / empty state — vertically centered below the header */}
      <BlurTargetView
        ref={blurTarget}
        className="flex-1 items-center justify-center px-8 bg-bg-light"
        style={{ paddingTop: headerHeight }}
        accessibilityLiveRegion="polite"
      >
        <View className="bg-white rounded-full shadow-card w-20 h-20 items-center justify-center">
          <Users size={40} color={colors.textMuted} />
        </View>

        <Text className="font-body text-h3 text-text-primary text-center mt-6">
          Em breve: rede social de jogadores
        </Text>
        <Text className="font-body text-caption text-text-muted text-center mt-2">
          Aqui você vai acompanhar a galera, ver resultados e novidades das suas
          quadras.
        </Text>
      </BlurTargetView>

      {/* Glass header — mirrors S5 Home / S6 Explore */}
      <GlassHeader blurTarget={blurTarget} onHeight={setHeaderHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text className="font-display text-h1 text-text-primary uppercase">
            REDE
          </Text>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notificações"
              onPress={() => {}}
            >
              <Bell size={24} color={colors.surfaceDark} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Configurações"
              onPress={goSettings}
            >
              <Settings size={24} color={colors.surfaceDark} />
            </Pressable>
          </View>
        </View>
      </GlassHeader>
    </View>
  );
}
