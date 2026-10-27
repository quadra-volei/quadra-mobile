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

// Lands on the end value at once and reports the animation as finished.
const withTiming = (toValue: number, _config?: object, done?: (finished: boolean) => void) => {
  done?.(true);
  return toValue;
};
const withSpring = (toValue: number, _config?: object) => toValue;
// Linear, clamped to the output range (every caller here clamps or stays inside).
const interpolate = (value: number, input: number[], output: number[]) => {
  const [i0 = 0, i1 = 1] = input;
  const [o0 = 0, o1 = 1] = output;
  const t = Math.min(Math.max((value - i0) / (i1 - i0), 0), 1);
  return o0 + (o1 - o0) * t;
};
const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
const withRepeat = (animation: unknown, _count?: number, _reverse?: boolean) => animation;
const withDelay = (_ms: number, animation: unknown) => animation;
// Lands on the last step, like the finished animation.
const withSequence = (...animations: unknown[]) => animations[animations.length - 1];
const useAnimatedStyle = (cb: () => object) => cb();
const useAnimatedProps = (cb: () => object) => cb();
const useReducedMotion = () => false;

// Keyboard hook stub — reports a closed keyboard (height 0).
const useAnimatedKeyboard = () => ({ height: { value: 0 } });

// The card's rotation sensor: a phone lying still. Reactions never fire.
const SensorType = { ROTATION: 5 };
const useAnimatedSensor = () => ({
  sensor: { value: { pitch: 0, roll: 0, yaw: 0 } },
  isAvailable: false,
  unregister: () => {},
});
const useAnimatedReaction = () => {};

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
  withSpring,
  interpolate,
  Extrapolation,
  withRepeat,
  withDelay,
  withSequence,
  useAnimatedStyle,
  useAnimatedProps,
  useReducedMotion,
  useAnimatedKeyboard,
  SensorType,
  useAnimatedSensor,
  useAnimatedReaction,
  runOnJS,
  Easing,
  createAnimatedComponent,
  interpolateColor,
  FadeIn: layoutAnimation,
  FadeInDown: layoutAnimation,
  FadeOut: layoutAnimation,
  ZoomIn: layoutAnimation,
  Animated,
  // Also export as named to support both import styles
  View: AnimatedView,
};
