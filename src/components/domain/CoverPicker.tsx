import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { HERO_GRADIENT, colors } from '@/theme/colors';

export type CoverPickerProps = {
  /** Local URI of the picked cover image; when absent the placeholder shows. */
  uri?: string;
  onPress: () => void;
  testID?: string;
};

/**
 * Rectangular match-cover banner used by S11 (distinct from the circular
 * `Avatar`). Renders a navy `HERO_GRADIENT` block with a "CAPA DA PARTIDA"
 * eyebrow and a dashed "Trocar capa" affordance; once a cover is picked it
 * shows that image with the same affordance overlaid. The consuming screen runs
 * `expo-image-picker` on press.
 */
export function CoverPicker({ uri, onPress, testID }: CoverPickerProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Trocar capa da partida"
      className="h-40 overflow-hidden rounded-card"
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          contentFit="cover"
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : (
        <LinearGradient
          colors={HERO_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      )}

      {/* Eyebrow (top-right). */}
      <Text className="absolute right-4 top-3 font-body text-eyebrow text-text-on-dark uppercase">
        Capa da partida
      </Text>

      {/* Dashed frame + pencil + "Trocar capa" affordance. */}
      <View className="flex-1 items-center justify-center p-4">
        <View className="w-full flex-1 items-center justify-center rounded-card border border-dashed border-white/40">
          <View className="flex-row items-center gap-2">
            <Pencil size={16} color={colors.textOnDark} />
            <Text className="font-body text-body-bold text-text-on-dark">
              Trocar capa
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
