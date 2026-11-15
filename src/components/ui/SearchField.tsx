import { IconBuscar, IconFechar } from '@/components/icons/quadra';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';
import { useThemeColors } from '@/theme/useThemeColors';

export type SearchFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  /** Read by screen readers; defaults to the Explore search. */
  accessibilityLabel?: string;
  autoFocus?: boolean;
  /** Set: the field is a button that opens a search screen (Rede), not an input. */
  onPress?: () => void;
  testID?: string;
};

/**
 * Label-less search input (pill container, leading search icon, optional
 * trailing clear). Used by S6 Explore to filter the match list as the user
 * types; reused by S11 ("Buscar quadra ou endereço") and S10.
 *
 * Controlled and purely presentational — holds no state and never fetches.
 * Distinct from the catalog `TextField` (an RHF-controlled labeled form field):
 * this is an ephemeral filter control, not a form input (no RHF/Zod).
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
  accessibilityLabel = 'Buscar partidas',
  autoFocus,
  onPress,
  testID,
}: SearchFieldProps) {
  const theme = useThemeColors();
  const showClear = value.length > 0 && Boolean(onClear);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        className="h-12 px-4 rounded-pill bg-card shadow-card flex-row items-center"
      >
        <IconBuscar size={20} color={theme.muted} />
        <Text className="flex-1 ml-2 font-body text-body text-text-muted" numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="h-12 px-4 rounded-pill bg-card shadow-card flex-row items-center">
      <IconBuscar size={20} color={theme.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1 ml-2 font-body text-body text-text-primary"
      />
      {showClear ? (
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Limpar busca"
          className="ml-2"
        >
          <IconFechar size={18} color={theme.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}
