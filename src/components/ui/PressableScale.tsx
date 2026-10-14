import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MOTION } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

/**
 * `Pressable` with the app's press feedback: a slight shrink and fade while the
 * finger is down (MOTION.press), in place of Android's grey ripple. Same props
 * as `Pressable` (className included), except `style` must not be a function.
 * A static `opacity` in `style` (a disabled button) is kept and faded from.
 */
export function PressableScale({ style, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const flatOpacity = StyleSheet.flatten(style)?.opacity;
  const baseOpacity = typeof flatOpacity === 'number' ? flatOpacity : 1;
  const pressStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity * (1 - pressed.value * (1 - MOTION.pressOpacity)),
    transform: [{ scale: 1 - pressed.value * (1 - MOTION.pressScale) }],
  }));

  return (
    <AnimatedPressable
      {...props}
      style={[style, pressStyle]}
      onPressIn={(e: GestureResponderEvent) => {
        pressed.value = withTiming(1, MOTION.press);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        pressed.value = withTiming(0, MOTION.press);
        onPressOut?.(e);
      }}
    />
  );
}
