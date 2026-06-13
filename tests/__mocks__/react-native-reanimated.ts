/**
 * Minimal mock for react-native-reanimated that avoids native initialization.
 * We stub only what SplashScreen uses:
 *   - useSharedValue
 *   - withRepeat / withTiming
 *   - useAnimatedStyle
 *   - Easing
 *   - Animated.View (default export sub-component)
 */
import React from 'react';
import { View } from 'react-native';

const useSharedValue = (initial: number) => ({ value: initial });

const withTiming = (toValue: number, _config?: object) => toValue;
const withRepeat = (animation: unknown, _count?: number, _reverse?: boolean) => animation;
const useAnimatedStyle = (cb: () => object) => cb();

const Easing = {
  inOut: (_fn: unknown) => _fn,
  ease: 0,
  linear: 0,
  quad: 0,
  cubic: 0,
  poly: (_n: number) => 0,
  sin: 0,
  circle: 0,
  exp: 0,
  elastic: (_bounciness?: number) => 0,
  back: (_s?: number) => 0,
  bounce: 0,
  bezier: (_x1: number, _y1: number, _x2: number, _y2: number) => 0,
  bezierFn: (_x1: number, _y1: number, _x2: number, _y2: number) => (_t: number) => 0,
  steps: (_n: number, _start?: boolean) => 0,
  in: (_fn: unknown) => _fn,
  out: (_fn: unknown) => _fn,
};

// Animated.View stub — forwards all props including testID and className
const AnimatedView = ({ children, style, ...props }: any) =>
  React.createElement(View, { ...props, style }, children);

const Animated = {
  View: AnimatedView,
  Text: ({ children, ...props }: any) => React.createElement('Text', props, children),
  Image: (props: any) => React.createElement('Image', props),
};

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue,
  withTiming,
  withRepeat,
  useAnimatedStyle,
  Easing,
  Animated,
  // Also export as named to support both import styles
  View: AnimatedView,
};
