import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

import { Avatar } from '@/components/ui/Avatar';
import { positionLabel } from '@/features/profile/schema/onboarding';
import type { MyProfile } from '@/features/profile/types/profile';
import { cardRarity, type CardRarity } from '@/theme/cardRarity';
import { colors, withAlpha } from '@/theme/colors';
import { DEFAULT_AVATAR } from '@/theme/defaultAvatars';
import { levelTier } from '@/theme/levelTier';

export type PlayerCardProps = { profile: MyProfile; testID?: string };

// Diagonal light band that sweeps across the card, like a foil card under a lamp.
// Reanimated skips it when the system "remove animations" setting is on.
function Shine({ width }: { width: number }) {
  const x = useSharedValue(-160);
  useEffect(() => {
    x.value = withRepeat(
      withDelay(1400, withTiming(width + 160, { duration: 1800, easing: Easing.inOut(Easing.cubic) })),
      -1,
    );
  }, [x, width]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: '18deg' }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute -top-20 -bottom-20 w-24"
      style={style}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// Faint volleyball court behind the photo: side lines, net and both attack lines.
function CourtLines({ ink }: { ink: string }) {
  const stroke = withAlpha(ink, 0.12);
  return (
    <Svg
      pointerEvents="none"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <Rect x={12} y={10} width={76} height={120} stroke={stroke} strokeWidth={0.6} fill="none" />
      <Line x1={6} y1={70} x2={94} y2={70} stroke={withAlpha(ink, 0.2)} strokeWidth={1.2} />
      <Line x1={12} y1={50} x2={88} y2={50} stroke={stroke} strokeWidth={0.5} />
      <Line x1={12} y1={90} x2={88} y2={90} stroke={stroke} strokeWidth={0.5} />
    </Svg>
  );
}

// One FIFA-style stat line: big number, short label.
function Stat({ label, value, ink }: { label: string; value: number; ink: string }) {
  return (
    <View className="flex-row items-baseline gap-2 py-1">
      <Text className="font-num text-h3" style={{ color: ink }}>
        {value}
      </Text>
      <Text className="font-body-bold text-caption text-white/70">{label}</Text>
    </View>
  );
}

function StatColumn({ stats, ink }: { stats: [string, number][]; ink: string }) {
  return (
    <View className="flex-1 items-center">
      {stats.map(([label, value]) => (
        <Stat key={label} label={label} value={value} ink={ink} />
      ))}
    </View>
  );
}

function Frame({ rarity, className, children }: { rarity: CardRarity; className?: string; children: ReactNode }) {
  return (
    <LinearGradient
      colors={rarity.frame}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      // Rounding is per use, so it goes through style, never a className on LinearGradient.
      style={{ borderRadius: 999 }}
    >
      <View className={className}>{children}</View>
    </LinearGradient>
  );
}

/**
 * The collectible player card (S8b): a metallic frame whose rarity follows GERAL
 * (Bronze / Prata / Ouro / Elite, `cardRarity`), the rating and position in the
 * top corner, the photo over a faint court, the name on a foil ribbon, the six
 * ratings in two columns and a footer with level, the wordmark and the card
 * number. A light band sweeps across it now and then.
 */
export function PlayerCard({ profile, testID }: PlayerCardProps) {
  const rarity = cardRarity(profile.overall);
  const { width } = useWindowDimensions();
  const level = levelTier(profile.level);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const nick = profile.handle ? `@${profile.handle}` : undefined;
  const subtitle = [nick, positionLabel(profile.position)].filter(Boolean).join(' · ');
  const serial = `#${profile.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`;

  return (
    <LinearGradient
      testID={testID}
      colors={rarity.frame}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 26, padding: 4 }}
    >
      <View className="rounded-[22px] overflow-hidden">
        <LinearGradient
          colors={[rarity.deep, colors.surfaceDark]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 }}
        >
          <CourtLines ink={rarity.ink} />

          {/* GERAL + position (left), rarity tag (right) */}
          <View className="flex-row items-start justify-between">
            <View className="items-center">
              <Text className="font-num text-[56px] leading-[60px]" style={{ color: rarity.ink }}>
                {profile.overall}
              </Text>
              <Text className="font-body-bold text-eyebrow text-white/70 uppercase tracking-widest">
                Geral
              </Text>
              {profile.position ? (
                <Text className="font-num text-h3 text-text-on-dark mt-1">{profile.position}</Text>
              ) : null}
            </View>
            <Frame rarity={rarity} className="px-3 py-1">
              <Text className="font-body-extrabold text-eyebrow tracking-widest" style={{ color: rarity.onFrame }}>
                {rarity.label}
              </Text>
            </Frame>
          </View>

          {/* Photo with a foil ring and a soft glow */}
          <View className="items-center -mt-10 mb-4">
            <View
              className="absolute top-2 h-40 w-40 rounded-full"
              style={{ backgroundColor: withAlpha(rarity.ink, 0.14) }}
            />
            <Frame rarity={rarity} className="p-1">
              <Avatar uri={profile.avatarUrl} name={profile.firstName} size="xl" defaultSource={DEFAULT_AVATAR} />
            </Frame>
          </View>

          {/* Name ribbon */}
          <LinearGradient
            colors={rarity.frame}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginHorizontal: -8 }}
          >
            <Text
              className="font-display text-h1 uppercase text-center"
              style={{ color: rarity.onFrame }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fullName}
            </Text>
          </LinearGradient>
          {subtitle ? (
            <Text className="font-body-semibold text-caption text-white/80 mt-2 text-center">{subtitle}</Text>
          ) : null}

          {/* Six ratings, two columns split by a foil rule */}
          <View className="flex-row mt-3">
            <StatColumn
              ink={rarity.ink}
              stats={[['ATA', profile.ata], ['ACE', profile.ace], ['SRV', profile.srv]]}
            />
            <View className="w-px my-2" style={{ backgroundColor: withAlpha(rarity.ink, 0.35) }} />
            <StatColumn
              ink={rarity.ink}
              stats={[['DEF', profile.def], ['BLK', profile.blk], ['REC', profile.rec]]}
            />
          </View>

          {/* Footer: level · wordmark · card number */}
          <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-white/10">
            <View className="rounded-pill px-2 py-[2px]" style={{ backgroundColor: level.color }}>
              <Text className="font-num text-caption" style={{ color: level.textColor }}>
                NV {profile.level}
              </Text>
            </View>
            <Text className="font-word text-body text-text-on-dark">quadra</Text>
            <Text className="font-mono text-mono text-white/60">{serial}</Text>
          </View>
        </LinearGradient>
        <Shine width={width} />
      </View>
    </LinearGradient>
  );
}
