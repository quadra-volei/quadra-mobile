import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

export type ButtonVariant = 'grad' | 'primary' | 'outline' | 'outlineW' | 'ghost';

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
const GRADIENT_CTA = ['#1A1AFF', '#AADD00'] as const; // bg-gradient-cta (blue → lime)
const GRADIENT_PRIMARY = ['#0A0A3C', '#1A1AFF'] as const; // bg-gradient-primary (navy → blue)

const BASE = 'h-12 rounded-btn flex-row items-center justify-center px-6';

// Per-variant text classes (font weight/family + color).
const TEXT_CLASS: Record<ButtonVariant, string> = {
  grad: 'font-body text-body-bold text-text-on-dark',
  primary: 'font-body text-body-bold text-text-on-dark',
  outline: 'font-body text-body-bold text-primary',
  outlineW: 'font-body text-body-bold text-text-on-dark',
  ghost: 'font-body text-body-bold text-primary',
};

function isGradient(variant: ButtonVariant): boolean {
  return variant === 'grad' || variant === 'primary';
}

function Content({
  variant,
  children,
  loading,
  leftIcon,
}: Pick<ButtonProps, 'variant' | 'children' | 'loading' | 'leftIcon'>) {
  if (loading) {
    return (
      <ActivityIndicator
        color={variant === 'outline' || variant === 'ghost' ? '#1A1AFF' : '#FFFFFF'}
      />
    );
  }
  return (
    <>
      {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
      <Text className={TEXT_CLASS[variant]}>{children}</Text>
    </>
  );
}

/**
 * Shared CTA button covering all DESIGN_SYSTEM variants.
 * - `grad` / `primary` render an `expo-linear-gradient` fill (shadow via NativeWind).
 * - `outline` / `outlineW` / `ghost` are transparent with border/text treatments.
 * Disabled (or loading) applies a muted grey fill for gradient variants and
 * 50% opacity for the rest, per `login-acesse-sua-conta.png`.
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
    const colors = variant === 'grad' ? GRADIENT_CTA : GRADIENT_PRIMARY;
    const shadow = variant === 'grad' ? 'shadow-cta' : 'shadow-primary';
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        className={`rounded-btn ${isDisabled ? '' : shadow}`}
      >
        {isDisabled ? (
          <View className={`${BASE} bg-bg-light-alt`}>
            <Content variant={variant} loading={loading} leftIcon={leftIcon}>
              {children}
            </Content>
          </View>
        ) : (
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className={BASE}
          >
            <Content variant={variant} loading={loading} leftIcon={leftIcon}>
              {children}
            </Content>
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  // Non-gradient variants only (gradient variants returned above).
  const outlineVariant = variant as 'outline' | 'outlineW' | 'ghost';
  const variantClass: Record<'outline' | 'outlineW' | 'ghost', string> = {
    outline: 'border-2 border-primary bg-transparent',
    outlineW: 'border-2 border-white bg-transparent',
    ghost: 'bg-transparent',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`${BASE} ${variantClass[outlineVariant]} ${isDisabled ? 'opacity-50' : ''}`}
    >
      <Content variant={variant} loading={loading} leftIcon={leftIcon}>
        {children}
      </Content>
    </Pressable>
  );
}
