import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/PressableScale";
import { colors } from "@/theme/colors";
import { useThemeColors, type ThemeColors } from "@/theme/useThemeColors";

export type ButtonVariant =
  | "grad"
  | "primary"
  | "outline"
  | "outlineW"
  | "outlineLime"
  | "ghost";

export type ButtonProps = {
  variant: ButtonVariant;
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  testID?: string;
};

const BASE = "h-12 rounded-btn flex-row items-center justify-center px-6";

// Fill + border per variant (DESIGN_SYSTEM "Buttons"): flat fills, never a
// gradient. `grad` keeps its name from when it was the gradient CTA.
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  grad: "border-2 border-edge bg-accent",
  primary: "border-2 border-edge bg-primary",
  outline: "border-2 border-edge bg-card",
  outlineW: "border-2 border-white bg-transparent",
  outlineLime: "border-2 border-accent-light bg-transparent",
  ghost: "bg-transparent",
};

const TEXT_CLASS: Record<ButtonVariant, string> = {
  grad: "font-body-bold text-body-bold text-navy",
  primary: "font-body-bold text-body-bold text-text-on-dark",
  outline: "font-body-bold text-body-bold text-ink",
  outlineW: "font-body-bold text-body-bold text-text-on-dark",
  outlineLime: "font-body-bold text-body-bold text-accent-light",
  ghost: "font-body-semibold text-body-bold text-primary-fg",
};

function indicatorColor(variant: ButtonVariant, theme: ThemeColors): string {
  switch (variant) {
    case "grad":
      return colors.surfaceDark; // navy on lime, in both themes
    case "outline":
      return theme.ink;
    case "ghost":
      return theme.primaryFg;
    case "outlineLime":
      return colors.accentLight;
    default:
      return colors.textOnDark;
  }
}

// Only the filled variants carry the hard shadow (navy in light, blue in dark):
// the transparent ones live on navy, where it would not show.
const HAS_SHADOW: Record<ButtonVariant, boolean> = {
  grad: true,
  primary: true,
  outline: true,
  outlineW: false,
  outlineLime: false,
  ghost: false,
};

/**
 * Shared button covering all DESIGN_SYSTEM variants: flat fill, 2px border and,
 * on the filled variants, the hard offset shadow. `ghost` is a bare text link.
 * Disabled is a grey fill with muted label and no shadow on the filled variants,
 * 50% opacity on the others and while loading.
 *
 * The shadow and the disabled state are inline styles, not toggled classNames:
 * mutating NativeWind classNames after the initial render makes
 * react-native-css-interop remount the node and emit an upgrade warning that
 * crashes while reading navigation context.
 */
export function Button({
  variant,
  onPress,
  children,
  disabled,
  loading,
  leftIcon,
  testID,
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  // A disabled filled button goes grey and keeps its border; the transparent
  // variants (and a loading button) only fade, since grey would vanish on navy.
  const greyed = Boolean(disabled) && !loading && HAS_SHADOW[variant];
  const theme = useThemeColors();

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      // "busy" only while loading: a busy: false still made Android describe every
      // button as "busy" (relatório 05/11).
      accessibilityState={loading ? { disabled: isDisabled, busy: true } : { disabled: isDisabled }}
      className={`${BASE} ${VARIANT_CLASS[variant]}`}
      style={
        greyed
          ? { backgroundColor: theme.line }
          : isDisabled
            ? { opacity: 0.5 }
            : HAS_SHADOW[variant]
              ? theme.hardShadow
              : undefined
      }
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor(variant, theme)} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text
            className={TEXT_CLASS[variant]}
            style={greyed ? { color: theme.muted } : undefined}
          >
            {children}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
