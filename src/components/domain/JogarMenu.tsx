import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { CTA_GRADIENT, colors } from '@/theme/colors';

export type JogarMenuProps = {
  visible: boolean;
  /** Dismiss without choosing (backdrop / close button). */
  onClose: () => void;
  /** "Criar partida" — pushes the create-match flow. */
  onCreate: () => void;
  /** "Buscar partida" — pushes the explore/search flow. */
  onSearch: () => void;
  testID?: string;
};

/** One circular action (gradient or solid) with its label underneath. */
function ActionOption({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center"
    >
      {children}
      <Text className="mt-3 font-body-semibold text-body-bold text-white">{label}</Text>
    </Pressable>
  );
}

/**
 * Full-screen "BORA JOGAR?" action menu opened by the central Jogar FAB. Instead
 * of jumping straight to create-match, the FAB now offers the two entry points
 * ("Criar partida" / "Buscar partida") over a navy backdrop, matching the
 * Quadra prototype. Controlled by the tab layout via `visible`.
 */
export function JogarMenu({
  visible,
  onClose,
  onCreate,
  onSearch,
  testID,
}: JogarMenuProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Navy backdrop — tap anywhere to dismiss. A plain, nearly opaque scrim
          (no blur): it hides the screen behind and keeps the white text legible
          the same way on every device. */}
      <View className="flex-1">
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={onClose}
          className="flex-1 items-center justify-center bg-surface-dark/95 px-8"
        >
          {/* Inner content — stopPropagation so taps on the actions don't
              bubble up to the dismiss backdrop. */}
          <Pressable onPress={() => {}} className="items-center self-stretch">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="font-display text-white uppercase self-stretch"
              style={{
                fontSize: 30,
                letterSpacing: 1,
                textAlign: 'center',
                textShadowColor: 'rgba(10,10,60,0.35)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 8,
              }}
            >
              Bora jogar?
            </Text>

            <View className="mt-8 flex-row items-start justify-center gap-8">
              {/* Criar — blue→lime gradient circle */}
              <ActionOption label="Criar partida" onPress={onCreate}>
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 9999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 22px rgba(26,26,255,0.35)',
                  }}
                >
                  <Plus size={40} color={colors.textOnDark} strokeWidth={2.4} />
                </LinearGradient>
              </ActionOption>

              {/* Buscar — solid white circle */}
              <ActionOption label="Buscar partida" onPress={onSearch}>
                <View
                  className="items-center justify-center rounded-full bg-white"
                  style={{
                    width: 92,
                    height: 92,
                    boxShadow: '0 8px 22px rgba(10,10,60,0.25)',
                  }}
                >
                  <Search
                    size={38}
                    color={colors.surfaceDark}
                    strokeWidth={2.4}
                  />
                </View>
              </ActionOption>
            </View>

            {/* Close — sits below the options, echoing the prototype. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="mt-10 items-center justify-center rounded-full bg-white/30 border border-white/40"
              style={{ width: 52, height: 52 }}
            >
              <X size={26} color={colors.textOnDark} strokeWidth={2.4} />
            </Pressable>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}
