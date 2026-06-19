import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type ButtonVariant =
  | "grad"
  | "primary"
  | "outline"
  | "outlineW"
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

// Brand gradient stops (DESIGN_SYSTEM "Gradients"). Kept as token-equivalent
// constants because expo-linear-gradient needs raw color arrays, not className.
const GRADIENT_CTA = ["#1A1AFF", "#AADD00"] as const; // bg-gradient-cta (blue → lime)
const GRADIENT_PRIMARY = ["#0A0A3C", "#1A1AFF"] as const; // bg-gradient-primary (navy → blue)
const GRADIENT_DISABLED = ["#E8EEF8", "#E8EEF8"] as const; // bg-light-alt token — muted disabled fill
const TEXT_DISABLED = "#7A7A9A"; // text-muted token — disabled label color

// boxShadow tokens (DESIGN_SYSTEM "Gradients"). Applied via inline style — NOT a
// toggled className — so enabling the button never mutates NativeWind styles
// after the initial render (which makes css-interop remount/warn and crash).
const SHADOW_CTA = "0 4px 16px rgba(170,221,0,0.30)"; // shadow-cta
const SHADOW_PRIMARY = "0 4px 16px rgba(26,26,255,0.28)"; // shadow-primary

const BASE = "h-12 rounded-btn flex-row items-center justify-center px-6";

// Per-variant text classes (font weight/family + enabled color).
const TEXT_CLASS: Record<ButtonVariant, string> = {
  grad: "font-body text-body-bold text-text-on-dark",
  primary: "font-body text-body-bold text-text-on-dark",
  outline: "font-body text-body-bold text-primary",
  outlineW: "font-body text-body-bold text-text-on-dark",
  ghost: "font-body text-body-bold text-primary",
};

function isGradient(variant: ButtonVariant): boolean {
  return variant === "grad" || variant === "primary";
}

function Content({
  variant,
  children,
  loading,
  leftIcon,
  isDisabled,
}: Pick<ButtonProps, "variant" | "children" | "loading" | "leftIcon"> & {
  isDisabled: boolean;
}) {
  if (loading) {
    return (
      <ActivityIndicator
        color={
          variant === "outline" || variant === "ghost" ? "#1A1AFF" : "#FFFFFF"
        }
      />
    );
  }
  return (
    <>
      {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
      {/* Disabled gradient buttons sit on a light fill, so override the white
          label with the muted token (inline style, not a toggled className). */}
      <Text
        className={TEXT_CLASS[variant]}
        style={isDisabled && isGradient(variant) ? { color: TEXT_DISABLED } : undefined}
      >
        {children}
      </Text>
    </>
  );
}

/**
 * Shared CTA button covering all DESIGN_SYSTEM variants.
 * - `grad` / `primary` render an `expo-linear-gradient` fill behind the content.
 * - `outline` / `outlineW` / `ghost` are transparent with border/text treatments.
 * Disabled (or loading) applies a muted fill for gradient variants and 50%
 * opacity for the rest, per `login-acesse-sua-conta.png`.
 *
 * The gradient variant keeps a fully stable render tree across enabled/disabled
 * (the gradient stays mounted and only its `colors` change; shadow and disabled
 * text are inline styles). Mutating NativeWind classNames after the initial
 * render makes react-native-css-interop remount the node and emit an upgrade
 * warning that crashes while reading navigation context.
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

  if (isGradient(variant)) {
    const enabledColors = variant === "grad" ? GRADIENT_CTA : GRADIENT_PRIMARY;
    const colors = isDisabled ? GRADIENT_DISABLED : enabledColors;
    const shadow = variant === "grad" ? SHADOW_CTA : SHADOW_PRIMARY;
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        className="rounded-btn overflow-hidden"
        style={isDisabled ? undefined : { boxShadow: shadow }}
      >
        {/* Layout lives on this View (NativeWind-aware). The gradient is an
            absolute fill behind the content and stays mounted in every state —
            `className` is never placed on LinearGradient. */}
        <View className={BASE}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <Content
            variant={variant}
            loading={loading}
            leftIcon={leftIcon}
            isDisabled={isDisabled}
          >
            {children}
          </Content>
        </View>
      </Pressable>
    );
  }

  // Non-gradient variants only (gradient variants returned above).
  const outlineVariant = variant as "outline" | "outlineW" | "ghost";
  const variantClass: Record<"outline" | "outlineW" | "ghost", string> = {
    outline: "border-2 border-primary bg-transparent",
    outlineW: "border-2 border-white bg-transparent",
    ghost: "bg-transparent",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${BASE} ${variantClass[outlineVariant]}`}
      // Opacity via inline style (not a toggled className) to keep NativeWind
      // styles stable across the disabled flip.
      style={isDisabled ? { opacity: 0.5 } : undefined}
    >
      <Content
        variant={variant}
        loading={loading}
        leftIcon={leftIcon}
        isDisabled={isDisabled}
      >
        {children}
      </Content>
    </Pressable>
  );
}
