import { type RefObject, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  runOnJS,
  SensorType,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { QuadraWordmark } from '@/components/icons/QuadraWordmark';
import { cardTitleName, type CardTitleCode } from '@/features/profile/card/cardTitles';
import { positionLabel } from '@/features/profile/schema/onboarding';
import type { MyProfile } from '@/features/profile/types/profile';
import {
  CARD_FINISHES,
  CARD_LIGHT,
  CARD_TIERS,
  HOLO_FOIL,
  cardTier,
  type CardFinish,
  type CardFinishTokens,
  type CardTierTokens,
} from '@/theme/cardFinish';

// The card is drawn on a 292 × 406 grid (the prototype's size) and scaled to `width`.
const W = 292;
const H = 406;
const PHOTO_H = 292;
// Resting pose and the reach of a drag (Johny's spec: about ±11° and ±14°).
const REST = { rx: -3, ry: -7 };
const TILT = { x: 22, y: 28 };
const SETTLE_MS = 350;
const FLIP_MS = 600;
// A horizontal swipe this long flips the card; shorter drags only tilt it.
const SWIPE_FLIP = 65;
// Tilting the phone tilts the card (rotation sensor). The rest pose follows
// the phone slowly (`follow` per sample), so only a movement shows, never
// how the phone is held. Calibration knobs: flip a `sign` if an axis turns the
// wrong way on a device; `gain` is card degrees per phone degree.
// ponytail: no wrap-around at ±180° roll; fine for a card held in front of you.
const GYRO = { gain: 0.8, follow: 0.02, signX: 1, signY: 1 };
const RAD_TO_DEG = 180 / Math.PI;

const CHAMFER_OUTER = '0,18 18,0 258,0 292,34 292,388 274,406 18,406 0,388';
const CHAMFER_INNER = '3,19.5 19.5,3 256.5,3 289,35.5 289,386.5 272.5,403 19.5,403 3,386.5';

// The card's art until the player sets a photo (the prototype's illustration).
const CARD_DEFAULT_ART = require('../../../assets/card/carta-padrao.jpg');

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type PlayerCardProps = {
  profile: MyProfile;
  finish: CardFinish;
  title: CardTitleCode;
  /** The card's own photo, else the profile photo; none shows the default art. */
  photoUrl?: string;
  flipped: boolean;
  onFlip: () => void;
  /** Rendered width; the height follows the card's proportion. */
  width: number;
  /** The two faces, flat (no tilt), for the PNG export. */
  faceRefs?: { front: RefObject<View | null>; back: RefObject<View | null> };
  testID?: string;
};

function Shape({ t, inner, fill }: { t: CardFinishTokens; inner: boolean; fill: string }) {
  if (t.shape === 'rounded') {
    return inner ? (
      <Rect x={3} y={3} width={W - 6} height={H - 6} rx={24} fill={fill} />
    ) : (
      <Rect x={0} y={0} width={W} height={H} rx={27} fill={fill} />
    );
  }
  return <Polygon points={inner ? CHAMFER_INNER : CHAMFER_OUTER} fill={fill} />;
}

/**
 * The card's material: metallic frame, body, photo (front) and the light that
 * follows the finger — a foil band on the frame, a faint one over the face and
 * a soft glare. `mx` / `my` are the touch point, 0–1 across the card.
 */
function Material({
  t,
  tier,
  side,
  photoUrl,
  mx,
  my,
}: {
  t: CardFinishTokens;
  tier: CardTierTokens;
  side: 'front' | 'back';
  photoUrl?: string;
  mx: { value: number };
  my: { value: number };
}) {
  const foilFrame = useAnimatedProps(() => ({ x: -W * 1.6 + mx.value * W * 1.6 }));
  const foilFace = useAnimatedProps(() => ({ x: -W * 1.6 + (1 - my.value) * W * 1.6 }));
  const glare = useAnimatedProps(() => ({ cx: mx.value * W, cy: my.value * H }));
  const id = (name: string) => `${side}-${name}`;
  const foil = tier.rainbow ? HOLO_FOIL : t.foil;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id={id('frame')} x1="0" y1="0" x2="1" y2="1">
          {t.frame.map((c, i) => (
            <Stop key={i} offset={i / (t.frame.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
        <LinearGradient id={id('foil')} x1="0" y1="0" x2="1" y2="0.35">
          {foil.map((c, i) => (
            <Stop key={i} offset={i / (foil.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
        <RadialGradient id={id('glare')} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={CARD_LIGHT.glare} stopOpacity={0.55} />
          <Stop offset="1" stopColor={CARD_LIGHT.glare} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={id('shade')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={CARD_LIGHT.photoTop} stopOpacity={0.45} />
          <Stop offset="0.27" stopColor={t.surface} stopOpacity={0} />
          <Stop offset="0.56" stopColor={t.surface} stopOpacity={0} />
          <Stop offset="0.74" stopColor={t.surface} stopOpacity={1} />
        </LinearGradient>
        <RadialGradient id={id('glow')} cx="1" cy="0" r="0.8">
          <Stop offset="0" stopColor={t.accent} stopOpacity={0.18} />
          <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
        </RadialGradient>
        <ClipPath id={id('inner')}>
          <Shape t={t} inner fill="#000" />
        </ClipPath>
        <ClipPath id={id('outer')}>
          <Shape t={t} inner={false} fill="#000" />
        </ClipPath>
      </Defs>

      {/* Frame, then the foil band sliding over it, kept inside the cut corners
          (the body covers its middle). */}
      <Shape t={t} inner={false} fill={`url(#${id('frame')})`} />
      <G clipPath={`url(#${id('outer')})`}>
        <AnimatedRect animatedProps={foilFrame} y={0} width={W * 2.6} height={H} fill={`url(#${id('foil')})`} opacity={tier.frameFoil} />
      </G>
      <Shape t={t} inner fill={t.surface} />

      <G clipPath={`url(#${id('inner')})`}>
        {side === 'front' ? (
          <SvgImage
            href={photoUrl ? { uri: photoUrl } : CARD_DEFAULT_ART}
            x={3}
            y={3}
            width={W - 6}
            height={PHOTO_H}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : null}
        {side === 'front' ? (
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${id('shade')})`} />
        ) : (
          <Rect x={0} y={0} width={W} height={H} fill={`url(#${id('glow')})`} />
        )}
        {/* Faint foil over the face: the face stays readable. */}
        <AnimatedRect animatedProps={foilFace} y={0} width={W * 2.6} height={H} fill={`url(#${id('foil')})`} opacity={tier.faceFoil} />
        <AnimatedCircle animatedProps={glare} r={130} fill={`url(#${id('glare')})`} opacity={tier.glare} />
      </G>

    </Svg>
  );
}


/**
 * The logo on the card: always the designer's "Ativo 17" lockup (blue + lime),
 * never recolored by the finish or the light, on its own navy plate in the top
 * corner, clear of the frame, so it reads over any photo.
 */
export function CardLogo({ height }: { height: number }) {
  return (
    <View
      className="self-start bg-surface-dark"
      style={{ borderRadius: height * 0.4, paddingHorizontal: height * 0.35, paddingVertical: height * 0.22 }}
    >
      <QuadraWordmark variant="blue" height={height} />
    </View>
  );
}

function Front({ profile, t, k, title }: { profile: MyProfile; t: CardFinishTokens; k: number; title: string }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return (
    <View className="absolute inset-0" style={{ paddingHorizontal: 20 * k, paddingTop: 20 * k, paddingBottom: 22 * k }}>
      <CardLogo height={16 * k} />
      <View className="mt-auto">
        <Text className="font-body-bold uppercase" style={{ color: t.accent, fontSize: 11 * k, letterSpacing: 1.5 * k }}>
          {title}
        </Text>
        <Text className="font-num" numberOfLines={2} style={{ color: t.ink, fontSize: 24 * k, lineHeight: 27 * k, marginTop: 8 * k, marginBottom: 11 * k }}>
          {name}
        </Text>
        <View className="flex-row items-center justify-between" style={{ gap: 8 * k }}>
          <Text className="font-body flex-1" numberOfLines={1} style={{ color: t.muted, fontSize: 12 * k }}>
            {profile.handle ? `@${profile.handle}` : ''}
          </Text>
          {profile.position ? (
            <View className="rounded-full border" style={{ borderColor: t.edge, paddingHorizontal: 9 * k, paddingVertical: 4 * k }}>
              <Text className="font-body-semibold" style={{ color: t.ink, fontSize: 10 * k }}>
                {positionLabel(profile.position)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// "—" until there is a match to count from.
const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '—');

function Back({ profile, t, k, title, tierName }: { profile: MyProfile; t: CardFinishTokens; k: number; title: string; tierName: string }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const r = profile.record;
  const groups: { label: string; cells: [string, string][] }[] = [
    { label: 'Resultados', cells: [['Derrotas', String(r.losses)], ['Empates', String(r.draws)], ['Aproveitamento', percent(r.wins, r.matches)]] },
    { label: 'Evolução', cells: [['Nível', String(profile.level)], ['Pontos', String(profile.points)], ['MVP por jogo', percent(r.mvps, r.matches)]] },
  ];
  const line = { borderColor: t.edge };

  return (
    <View className="absolute inset-0" style={{ paddingHorizontal: 21 * k, paddingTop: 22 * k, paddingBottom: 20 * k }}>
      <CardLogo height={16 * k} />
      <View style={{ marginTop: 20 * k }}>
        <Text className="font-mono" style={{ color: t.muted, fontSize: 8 * k, letterSpacing: 1.6 * k }}>{`EM QUADRA  ·  CARTA ${tierName.toUpperCase()}`}</Text>
        <Text className="font-num" numberOfLines={1} style={{ color: t.ink, fontSize: 19 * k, marginTop: 5 * k }}>{name}</Text>
        <Text className="font-body" style={{ color: t.muted, fontSize: 11 * k, marginTop: 2 * k }}>
          {[title, positionLabel(profile.position)].filter(Boolean).join('  ·  ')}
        </Text>
      </View>

      <View className="flex-row border-b" style={[line, { marginTop: 16 * k, paddingBottom: 14 * k }]}>
        {([['Partidas', r.matches], ['Vitórias', r.wins], ['MVPs', r.mvps]] as const).map(([label, value], i) => (
          <View key={label} className={i ? 'flex-1 border-l' : 'flex-1'} style={[line, { paddingLeft: i ? 12 * k : 0 }]}>
            <Text className="font-num" style={{ color: t.accent, fontSize: 24 * k, lineHeight: 29 * k }}>{value}</Text>
            <Text className="font-body" style={{ color: t.muted, fontSize: 10 * k, marginTop: 2 * k }}>{label}</Text>
          </View>
        ))}
      </View>

      {groups.map((g) => (
        <View key={g.label} style={{ marginTop: 13 * k }}>
          <Text className="font-mono uppercase" style={{ color: t.muted, fontSize: 8 * k, letterSpacing: 1.6 * k }}>{g.label}</Text>
          <View className="flex-row" style={{ marginTop: 6 * k }}>
            {g.cells.map(([label, value]) => (
              <View key={label} className="flex-1">
                <Text className="font-num" style={{ color: t.ink, fontSize: 17 * k, lineHeight: 21 * k }}>{value}</Text>
                <Text className="font-body" numberOfLines={1} style={{ color: t.muted, fontSize: 10 * k }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className="mt-auto flex-row items-center justify-between border-t" style={[line, { paddingTop: 12 * k }]}>
        <Text className="font-body-bold" style={{ color: t.ink, fontSize: 10 * k }}>Bora pra quadra.</Text>
        <Text className="font-body" style={{ color: t.muted, fontSize: 9 * k }}>{profile.handle ? `@${profile.handle}` : ''}</Text>
      </View>
    </View>
  );
}

/**
 * The collectible player card ("Sua carta", DECISIONS #119). Front: the logo
 * on its plate in the top corner (DECISIONS #160), photo, title, name, @handle and position. Back: the real record
 * (matches, wins, MVPs) and grouped numbers. Tilting the phone, or dragging,
 * tilts it on both axes and moves the holographic light; releasing settles it
 * back; a tap or a long horizontal swipe flips it. The foil follows the level
 * tier (`CARD_TIERS`). The gesture lives on the card only, so the screen still
 * scrolls around it. Reduced motion: no tilt, instant flip.
 */
export function PlayerCard({ profile, finish, title, photoUrl, flipped, onFlip, width, faceRefs, testID }: PlayerCardProps) {
  const t = CARD_FINISHES[finish];
  const k = width / W;
  const height = H * k;
  const reduceMotion = useReducedMotion();
  const titleName = cardTitleName(title);
  const tier = CARD_TIERS[cardTier(profile.level)];

  const rx = useSharedValue(REST.rx);
  const ry = useSharedValue(REST.ry);
  const mx = useSharedValue(0.5);
  const my = useSharedValue(0.4);
  const turn = useSharedValue(flipped ? 1 : 0);
  // A finger on the card (or the card settling after it): the sensor waits.
  const held = useSharedValue(false);
  const rest = useSharedValue({ pitch: 0, roll: 0, ready: false });
  const rotation = useAnimatedSensor(SensorType.ROTATION);

  useAnimatedReaction(
    () => rotation.sensor.value,
    (r) => {
      if (reduceMotion || held.value) return;
      const b = rest.value.ready ? rest.value : { pitch: r.pitch, roll: r.roll, ready: true };
      const pitch = b.pitch + (r.pitch - b.pitch) * GYRO.follow;
      const roll = b.roll + (r.roll - b.roll) * GYRO.follow;
      rest.value = { pitch, roll, ready: true };
      const dx = Math.min(Math.max((r.pitch - pitch) * RAD_TO_DEG * GYRO.gain * GYRO.signX, -TILT.x / 2), TILT.x / 2);
      const dy = Math.min(Math.max((r.roll - roll) * RAD_TO_DEG * GYRO.gain * GYRO.signY, -TILT.y / 2), TILT.y / 2);
      rx.value = REST.rx + dx;
      ry.value = REST.ry + dy;
      mx.value = 0.5 + dy / TILT.y;
      my.value = 0.4 - dx / TILT.x;
    },
  );

  useEffect(() => {
    turn.value = withTiming(flipped ? 1 : 0, {
      duration: reduceMotion ? 0 : FLIP_MS,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
    });
  }, [flipped, reduceMotion, turn]);

  const settle = () => {
    'worklet';
    const config = { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) };
    rx.value = withTiming(REST.rx, config);
    ry.value = withTiming(REST.ry, config);
    mx.value = withTiming(0.5, config);
    my.value = withTiming(0.4, config, () => {
      held.value = false;
    });
  };

  const pan = Gesture.Pan()
    .minDistance(4)
    .onBegin(() => {
      held.value = true;
    })
    .onUpdate((e) => {
      const x = Math.min(Math.max(e.x / width, 0), 1);
      const y = Math.min(Math.max(e.y / height, 0), 1);
      mx.value = x;
      my.value = y;
      if (!reduceMotion) {
        rx.value = (0.5 - y) * TILT.x;
        ry.value = (x - 0.5) * TILT.y;
      }
    })
    .onEnd((e) => {
      // Only a clearly horizontal, long swipe flips: a small tilt never does.
      if (Math.abs(e.translationX) > SWIPE_FLIP && Math.abs(e.translationX) > 2 * Math.abs(e.translationY)) {
        runOnJS(onFlip)();
      }
    })
    .onFinalize(() => settle());
  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) {
      runOnJS(onFlip)();
    }
  });

  const tilt = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateX: `${rx.value}deg` }, { rotateY: `${ry.value}deg` }],
  }));
  // Only the face turned towards the viewer is shown.
  const front = useAnimatedStyle(() => ({
    opacity: turn.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${turn.value * 180}deg` }],
  }));
  const back = useAnimatedStyle(() => ({
    opacity: turn.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 1000 }, { rotateY: `${turn.value * 180 - 180}deg` }],
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <Animated.View
        testID={testID}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Carta de ${[profile.firstName, profile.lastName].filter(Boolean).join(' ')}. ${flipped ? 'Verso' : 'Frente'}. Toque para virar.`}
        onAccessibilityTap={onFlip}
        style={[{ width, height }, tilt]}
      >
        <Animated.View key={finish} entering={FadeIn.duration(reduceMotion ? 0 : 300)} className="absolute inset-0">
          <Animated.View ref={faceRefs?.front} collapsable={false} className="absolute inset-0" style={[{ backfaceVisibility: 'hidden' }, front]}>
            <Material t={t} tier={tier} side="front" photoUrl={photoUrl} mx={mx} my={my} />
            <Front profile={profile} t={t} k={k} title={titleName} />
          </Animated.View>
          <Animated.View ref={faceRefs?.back} collapsable={false} className="absolute inset-0" style={[{ backfaceVisibility: 'hidden' }, back]}>
            <Material t={t} tier={tier} side="back" mx={mx} my={my} />
            <Back profile={profile} t={t} k={k} title={titleName} tierName={tier.name} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
