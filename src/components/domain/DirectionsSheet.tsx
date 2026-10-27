import { Car, Navigation, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openRide, rideOptions, type Destination, type RideOption } from '@/features/explore/lib/directions';
import { HARD_SHADOW, colors } from '@/theme/colors';

export type DirectionsSheetProps = {
  /** Where to go; null keeps the sheet closed. */
  destination: Destination | null;
  /** "1,2 km" from the user, when their position is known. */
  distanceLabel?: string;
  onClose: () => void;
};

function OptionRow({ option, onPress }: { option: RideOption; onPress: () => void }) {
  const Icon = option.kind === 'ride' ? Car : Navigation;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={option.kind === 'ride' ? `Pedir um ${option.label}` : `Abrir no ${option.label}`}
      testID={`directions-${option.id}`}
      className="flex-row items-center gap-3 rounded-card border-2 border-surface-dark bg-white px-4 py-3"
      style={HARD_SHADOW}
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${option.kind === 'ride' ? 'bg-accent' : 'bg-bg-light'}`}
      >
        <Icon size={20} color={colors.surfaceDark} />
      </View>
      <Text className="flex-1 font-body-bold text-body text-text-primary">{option.label}</Text>
      <Text className="font-body-semibold text-caption text-text-muted">
        {option.kind === 'ride' ? 'Pedir corrida' : 'Ver rota'}
      </Text>
    </Pressable>
  );
}

/**
 * "Como chegar": the ride apps (Uber, 99) and the navigation apps (Google Maps,
 * Waze, and Apple Maps on iOS) that open with the place as destination. A tap
 * leaves Quadra for the chosen app and closes the sheet.
 */
export function DirectionsSheet({ destination, distanceLabel, onClose }: DirectionsSheetProps) {
  const insets = useSafeAreaInsets();
  const options = destination ? rideOptions(destination) : [];
  const rides = options.filter((o) => o.kind === 'ride');
  const maps = options.filter((o) => o.kind === 'navigation');
  const choose = (option: RideOption) => {
    onClose();
    void openRide(option);
  };

  return (
    <Modal visible={destination !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          testID="directions-sheet"
          onPress={() => {}}
          className="rounded-t-card bg-bg-light px-4 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="font-display text-h2 text-text-primary uppercase">Como chegar</Text>
              {destination?.name || distanceLabel ? (
                <Text numberOfLines={1} className="mt-1 font-body text-caption text-text-muted">
                  {[destination?.name, distanceLabel ? `a ${distanceLabel} de você` : null].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-chip bg-white shadow-card"
            >
              <X size={20} color={colors.surfaceDark} />
            </Pressable>
          </View>

          <Text className="mt-4 font-body-bold text-eyebrow text-text-primary uppercase">Corrida</Text>
          <View className="mt-2 gap-2">
            {rides.map((option) => (
              <OptionRow key={option.id} option={option} onPress={() => choose(option)} />
            ))}
          </View>

          <Text className="mt-4 font-body-bold text-eyebrow text-text-primary uppercase">Rota</Text>
          <View className="mt-2 gap-2">
            {maps.map((option) => (
              <OptionRow key={option.id} option={option} onPress={() => choose(option)} />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
