import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { MOTION } from '@/theme/motion';

/**
 * The underline of a row of equal-width tabs (`flex-1` each), sliding to the
 * selected one (MOTION.tab). Render it last inside the row, which must be
 * `relative` (the default) and hold only the tabs. `widthRatio` is the share of
 * a tab the line covers, centered under it.
 */
export function TabIndicator({
  index,
  count,
  thickness,
  widthRatio = 1,
}: {
  index: number;
  count: number;
  thickness: number;
  widthRatio?: number;
}) {
  const [rowWidth, setRowWidth] = useState(0);
  const position = useSharedValue(index);
  useEffect(() => {
    position.value = withTiming(index, MOTION.tab);
  }, [index, position]);

  const tabWidth = rowWidth / count;
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: (position.value + (1 - widthRatio) / 2) * tabWidth }],
  }));

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      className="absolute bottom-0 left-0 right-0"
      style={{ height: thickness }}
    >
      <Animated.View
        className="h-full rounded-full bg-primary"
        style={[{ width: tabWidth * widthRatio }, slide]}
      />
    </View>
  );
}

/**
 * A tab label whose color fades between muted and `activeColor` with the
 * underline. Color is an animated style, not a toggled className (DECISIONS #87).
 */
export function TabLabel({
  selected,
  activeColor,
  className,
  children,
}: {
  selected: boolean;
  activeColor: string;
  className: string;
  children: ReactNode;
}) {
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, MOTION.tab);
  }, [selected, progress]);
  const color = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, activeColor]),
  }));

  return (
    <Animated.Text className={className} style={color}>
      {children}
    </Animated.Text>
  );
}
