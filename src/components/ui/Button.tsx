import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/PressableScale";
import { HARD_SHADOW, colors } from "@/theme/colors";

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
  grad: "border-2 border-surface-dark bg-accent",
  primary: "border-2 border-surface-dark bg-primary",
  outline: "border-2 border-surface-dark bg-white",
  outlineW: "border-2 border-white bg-transparent",
  outlineLime: "border-2 border-accent-light bg-transparent",
  ghost: "bg-transparent",
};

const TEXT_CLASS: Record<ButtonVariant, string> = {
  grad: "font-body-bold text-body-bold text-surface-dark",
  primary: "font-body-bold text-body-bold text-text-on-dark",
  outline: "font-body-bold text-body-bold text-surface-dark",
  outlineW: "font-body-bold text-body-bold text-text-on-dark",
  outlineLime: "font-body-bold text-body-bold text-accent-light",
  ghost: "font-body-semibold text-body-bold text-primary",
};

const INDICATOR_COLOR: Record<ButtonVariant, string> = {
  grad: colors.surfaceDark,
  primary: colors.textOnDark,
  outline: colors.surfaceDark,
  outlineW: colors.textOnDark,
  outlineLime: colors.accentLight,
  ghost: colors.primary,
};

// The hard shadow is navy, so only the filled variants (light surfaces) carry
// it: it would not show on navy, where outlineW / outlineLime live.
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

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${BASE} ${VARIANT_CLASS[variant]}`}
      style={
        greyed
          ? { backgroundColor: colors.line }
          : isDisabled
            ? { opacity: 0.5 }
            : HAS_SHADOW[variant]
              ? HARD_SHADOW
              : undefined
      }
    >
      {loading ? (
        <ActivityIndicator color={INDICATOR_COLOR[variant]} />
      ) : (
        <>
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <Text
            className={TEXT_CLASS[variant]}
            style={greyed ? { color: colors.textMuted } : undefined}
          >
            {children}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
