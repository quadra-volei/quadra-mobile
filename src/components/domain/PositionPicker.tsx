import {
  ArrowUp,
  Check,
  Share2,
  ShieldCheck,
  Shuffle,
  Zap,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import {
  POSITION_OPTIONS,
  type Position,
} from "@/features/profile/schema/onboarding";
import { useRiseIn } from "@/hooks/useRiseIn";
import { colors } from "@/theme/colors";

/** Fades its children up into place on mount (the prototype's `.q-rise`). */
function Rise({
  delay,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View className={className} style={useRiseIn({ delay })}>
      {children}
    </Animated.View>
  );
}

const POSITION_ICONS = {
  LEV: Share2,
  PON: ArrowUp,
  OPO: Zap,
  LIB: ShieldCheck,
  COR: Shuffle,
} as const;

export function PositionIcon({
  code,
  size,
  color,
}: {
  code: Position;
  size: number;
  color: string;
}) {
  if (code === "CEN") {
    // Net with a ball over it: the prototype's own drawing, lucide has none.
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M4 7.5V20M20 7.5V20M4 9.5h16M4 14h16M8.5 9.5V14M12 9.5V14M15.5 9.5V14" />
        <Circle cx={12} cy={7} r={2} />
      </Svg>
    );
  }
  const Icon = POSITION_ICONS[code];
  return <Icon size={size} color={color} strokeWidth={1.9} />;
}

/**
 * A player's position as a small tag in the onboarding cards' look: the same
 * icon in a rounded square, DM Sans bold name, 2px border. `selected` is the
 * selected card's blue (pickers); `onDark` for navy surfaces. Used wherever a
 * position shows (match roster, teams, organizer, add-guest sheet).
 */
export function PositionTag({
  code,
  selected = false,
  onDark = false,
  short = false,
  testID,
}: {
  code: Position;
  selected?: boolean;
  onDark?: boolean;
  /** Icon only (tight rows); the name stays as the accessibility label. */
  short?: boolean;
  testID?: string;
}) {
  const name = POSITION_OPTIONS.find((option) => option.code === code)?.name ?? code;
  return (
    <View
      accessible
      accessibilityLabel={name}
      testID={testID}
      // Selected colors inline, never a toggled className (DECISIONS #87).
      className={`flex-row items-center gap-1.5 self-start rounded-pill border-2 p-0.5 ${short ? '' : 'pr-2.5'} ${
        onDark ? 'border-white/15 bg-white/10' : 'border-line bg-white'
      }`}
      style={selected ? { borderColor: colors.primary, backgroundColor: colors.bgLightAlt } : undefined}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-full ${onDark ? 'bg-white/15' : 'bg-bg-light'}`}
        style={selected ? { backgroundColor: colors.primary } : undefined}
      >
        <PositionIcon
          code={code}
          size={14}
          color={selected || onDark ? colors.textOnDark : colors.surfaceDark}
        />
      </View>
      {short ? null : (
        <Text
          className={`font-body-bold text-caption ${onDark ? 'text-text-on-dark' : 'text-surface-dark'}`}
        >
          {name}
        </Text>
      )}
    </View>
  );
}

// Position cards carry their own 4px hard shadow: soft navy at rest, blue when
// selected (inline for the reason given at HARD_SHADOW).
const POSITION_CARD_REST = { boxShadow: "4px 4px 0 0 rgba(10,10,60,0.12)" };
const POSITION_CARD_SELECTED = {
  boxShadow: `4px 4px 0 0 ${colors.primary}`,
  transform: [{ translateX: -1 }, { translateY: -1 }],
};

function PositionCard({
  option,
  index,
  selected,
  onPress,
  testID,
}: {
  option: (typeof POSITION_OPTIONS)[number];
  index: number;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Rise delay={35 * index} className="w-[48%]">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={option.name}
        accessibilityState={{ selected }}
        testID={testID}
        className={`min-h-[112px] rounded-btn border-2 p-3 ${
          selected ? "border-primary bg-bg-light-alt" : "border-line bg-white"
        }`}
        style={selected ? POSITION_CARD_SELECTED : POSITION_CARD_REST}
      >
        <View
          className={`h-10 w-10 items-center justify-center rounded-xl ${
            selected ? "bg-primary" : "bg-bg-light"
          }`}
        >
          <PositionIcon
            code={option.code}
            size={21}
            color={selected ? colors.textOnDark : colors.surfaceDark}
          />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-body-bold text-h2 text-surface-dark">
            {option.name}
          </Text>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${
              selected ? "border-accent bg-accent" : "border-line bg-white"
            }`}
          >
            {selected ? (
              <Check size={11} color={colors.surfaceDark} strokeWidth={3} />
            ) : null}
          </View>
        </View>
      </Pressable>
    </Rise>
  );
}

/**
 * Single-select court-position grid (icon cards + a hint for the chosen one).
 * Shared by the onboarding wizard and the edit-profile form.
 */
export function PositionGrid({
  value,
  onChange,
  testIDPrefix = "position",
}: {
  value: Position | undefined;
  onChange: (v: Position) => void;
  /** Card testIDs are `${testIDPrefix}-${code}`. */
  testIDPrefix?: string;
}) {
  const chosen = POSITION_OPTIONS.find((option) => option.code === value);
  return (
    <View>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {POSITION_OPTIONS.map((option, index) => (
          <PositionCard
            key={option.code}
            option={option}
            index={index}
            selected={value === option.code}
            onPress={() => onChange(option.code)}
            testID={`${testIDPrefix}-${option.code}`}
          />
        ))}
      </View>

      {/* What the chosen position does, once one is picked */}
      {chosen ? (
        <Rise
          key={chosen.code}
          className="mt-4 flex-row items-center rounded-chip bg-surface-dark p-3"
        >
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <PositionIcon
              code={chosen.code}
              size={17}
              color={colors.surfaceDark}
            />
          </View>
          <Text
            className="ml-3 flex-1 font-body text-caption text-text-on-dark/80"
            accessibilityLiveRegion="polite"
            testID={`${testIDPrefix}-hint`}
          >
            <Text className="font-body-bold text-text-on-dark">
              {chosen.name}
            </Text>
            {` · ${chosen.hint}`}
          </Text>
        </Rise>
      ) : null}
    </View>
  );
}
