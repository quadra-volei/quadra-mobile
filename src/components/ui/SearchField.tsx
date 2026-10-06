import { Search, X } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

export type SearchFieldProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onClear?: () => void;
  testID?: string;
};

/**
 * Label-less search input (pill container, leading lucide `Search`, optional
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
  testID,
}: SearchFieldProps) {
  const showClear = value.length > 0 && Boolean(onClear);

  return (
    <View className="h-12 px-4 rounded-pill bg-white shadow-card flex-row items-center">
      <Search size={20} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        testID={testID}
        accessibilityLabel="Buscar partidas"
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
          <X size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
