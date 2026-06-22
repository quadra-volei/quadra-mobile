import { Bell, Sun, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export default function NetworkScreen() {
  return (
    <View className="flex-1 bg-bg-light">
      <SafeAreaView edges={['top']} className="flex-1">
        {/* Header — mirrors S5 Home / S6 Explore */}
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
              accessibilityLabel="Alternar tema"
              onPress={() => {}}
            >
              <Sun size={24} color={colors.surfaceDark} />
            </Pressable>
          </View>
        </View>

        {/* Placeholder / empty state — vertically centered in remaining space */}
        <View
          className="flex-1 items-center justify-center px-8"
          accessibilityLiveRegion="polite"
        >
          <View className="bg-white rounded-full shadow-card w-20 h-20 items-center justify-center">
            <Users size={40} color={colors.textMuted} />
          </View>

          <Text className="font-body text-h3 text-text-primary text-center mt-6">
            Em breve: rede social de jogadores
          </Text>
          <Text className="font-body text-caption text-text-muted text-center mt-2">
            Aqui você vai acompanhar a galera, ver resultados e novidades das
            suas quadras.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
