/**
 * Minimal mock for react-native-reanimated that avoids native initialization.
 * We stub only what SplashScreen uses:
 *   - useSharedValue
 *   - withRepeat / withTiming
 *   - useAnimatedStyle
 *   - Easing
 *   - Animated.View (default export sub-component)
 * plus what the shared motion pieces use (PressableScale, UnderlineTab, the
 * FadeIn entrances): createAnimatedComponent, interpolateColor, layout animations.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

const useSharedValue = (initial: number) => ({ value: initial });

const withTiming = (toValue: number, _config?: object) => toValue;
const withRepeat = (animation: unknown, _count?: number, _reverse?: boolean) => animation;
const withDelay = (_ms: number, animation: unknown) => animation;
// Lands on the last step, like the finished animation.
const withSequence = (...animations: unknown[]) => animations[animations.length - 1];
const useAnimatedStyle = (cb: () => object) => cb();
const useAnimatedProps = (cb: () => object) => cb();
const useReducedMotion = () => false;

// Keyboard hook stub — reports a closed keyboard (height 0).
const useAnimatedKeyboard = () => ({ height: { value: 0 } });

// runOnJS just invokes the function directly in the JS test environment.
const runOnJS = (fn: (...args: unknown[]) => unknown) => fn;

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

// Animated.View stub — forwards all props including testID and className, minus
// the layout-animation props a host View does not take.
const AnimatedView = ({ children, style, entering, exiting, ...props }: any) =>
  React.createElement(View, { ...props, style }, children);

// The animated wrapper renders the component itself, without layout animations.
const createAnimatedComponent = (Component: any) =>
  ({ entering, exiting, ...props }: any) => React.createElement(Component, props);

// Lands on the end color, like the finished animation.
const interpolateColor = (value: number, input: number[], output: string[]) =>
  value >= (input[input.length - 1] ?? 1) ? output[output.length - 1] : output[0];

// Layout-animation builders (FadeIn.duration(180).easing(...)) chain to themselves.
const layoutAnimation: any = {};
for (const key of ['duration', 'delay', 'easing', 'springify', 'damping']) {
  layoutAnimation[key] = () => layoutAnimation;
}

// Animated.ScrollView stub — forwards to RN ScrollView so children render.
const AnimatedScrollView = ({ children, style, ...props }: any) =>
  React.createElement(ScrollView, { ...props, style }, children);

const Animated = {
  View: AnimatedView,
  ScrollView: AnimatedScrollView,
  Text: ({ children, entering, exiting, ...props }: any) =>
    React.createElement('Text', props, children),
  Image: (props: any) => React.createElement('Image', props),
  createAnimatedComponent,
};

module.exports = {
  __esModule: true,
  default: Animated,
  useSharedValue,
  withTiming,
  withRepeat,
  withDelay,
  withSequence,
  useAnimatedStyle,
  useAnimatedProps,
  useReducedMotion,
  useAnimatedKeyboard,
  runOnJS,
  Easing,
  createAnimatedComponent,
  interpolateColor,
  FadeIn: layoutAnimation,
  FadeInDown: layoutAnimation,
  Animated,
  // Also export as named to support both import styles
  View: AnimatedView,
};
