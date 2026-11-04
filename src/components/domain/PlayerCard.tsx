import { IconPrivado } from '@/components/icons/quadra';
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
  withDelay,
  withRepeat,
  withSequence,
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
import { PIECE_ORDER, pieceCenter, piecePoints } from '@/features/pass/lib/cardPieces';
import { cardTitleName, type CardTitleCode } from '@/features/profile/card/cardTitles';
import { positionLabel } from '@/features/profile/schema/onboarding';
import type { MyProfile } from '@/features/profile/types/profile';
import {
  CARD_LIGHT,
  HOLO_FOIL,
  PIECE_COVER,
  cardFinishTokens,
  type CardFinish,
  type CardFinishTokens,
  type Extravagant,
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
// Lag on phones (28/10): every write to the tilt values redraws the SVG faces
// (photo, gradients, clips), so the sensor runs at ~30 Hz instead of the screen
// rate and a change under `deadzone` degrees (tremor, noise, the rest pose
// creeping) writes nothing.
const GYRO = { gain: 0.8, follow: 0.02, signX: 1, signY: 1, intervalMs: 33, deadzone: 0.4 };
const RAD_TO_DEG = 180 / Math.PI;

export const CHAMFER_OUTER = '0,18 18,0 258,0 292,34 292,388 274,406 18,406 0,388';
export const CHAMFER_INNER = '3,19.5 19.5,3 256.5,3 289,35.5 289,386.5 272.5,403 19.5,403 3,386.5';

// The card's art until the player sets a photo (the prototype's illustration).
const CARD_DEFAULT_ART = require('../../../assets/card/carta-padrao.jpg');

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

// The finished season card's light sweeps across by itself, then rests (ms).
const SWEEP = { run: 2600, pause: 1400 };
// Its stars, on the 292 × 406 grid: over the frame, the photo's edges and the corners.
const SPARKLES = [
  { x: 30, y: 60, r: 7, delay: 0 },
  { x: 262, y: 96, r: 9, delay: 500 },
  { x: 244, y: 250, r: 6, delay: 1100 },
  { x: 48, y: 214, r: 8, delay: 1600 },
  { x: 150, y: 14, r: 6, delay: 800 },
  { x: 278, y: 330, r: 7, delay: 2000 },
  { x: 14, y: 360, r: 6, delay: 1300 },
  { x: 196, y: 150, r: 5, delay: 2400 },
];
const TWINKLE_MS = 900;

// A piece just won: its cover lights up lime, then fades away.
const REVEAL = { delay: 450, flash: 250, fade: 700 };

/** The season card in pieces (API DECISIONS #98): which ones are still missing. */
export type CardPieces = {
  /** Pieces not won yet (indexes of `PIECES`). */
  missing: readonly number[];
  /** The next one to win, outlined in lime. */
  next?: number;
  /** A piece just won: its cover is drawn once more and fades away. */
  reveal?: number;
  /** Missing pieces already reached, held by the paid track: a padlock instead of the level. */
  locked?: readonly number[];
};

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
  /** Draws the card unfinished: missing pieces covered (the season pass). */
  pieces?: CardPieces;
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
  side,
  photoUrl,
  mx,
  my,
  sweep,
}: {
  t: CardFinishTokens;
  side: 'front' | 'back';
  photoUrl?: string;
  mx: { value: number };
  my: { value: number };
  /** 0–1, the light that moves by itself on the finished season card; null = only the tilt moves it. */
  sweep: { value: number } | null;
}) {
  const tier = t.light;
  const foilFrame = useAnimatedProps(() => ({ x: -W * 1.6 + (sweep ? sweep.value : mx.value) * W * 1.6 }));
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


/** One star of the finished season card: grows, shines and fades, again and again. */
function Sparkle({ x, y, r, delay, color }: { x: number; y: number; r: number; delay: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const on = useSharedValue(reduceMotion ? 0.7 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    on.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(1, { duration: TWINKLE_MS }), withTiming(0, { duration: TWINKLE_MS }), withTiming(0, { duration: TWINKLE_MS })), -1),
    );
  }, [delay, on, reduceMotion]);
  const props = useAnimatedProps(() => ({ opacity: on.value }));
  // A four-point star.
  const d = r * 0.22;
  const points = `${x},${y - r} ${x + d},${y - d} ${x + r},${y} ${x + d},${y + d} ${x},${y + r} ${x - d},${y + d} ${x - r},${y} ${x - d},${y - d}`;
  return (
    <>
      <AnimatedCircle animatedProps={props} cx={x} cy={y} r={r * 0.9} fill={color} fillOpacity={0.25} />
      <AnimatedPolygon animatedProps={props} points={points} fill={color} />
    </>
  );
}

/** The finished season card's stars, over the face (front and back). */
function Sparkles({ x }: { x: Extravagant }) {
  return (
    <View pointerEvents="none" className="absolute inset-0" testID="card-sparkles">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        {SPARKLES.map((s, i) => (
          <Sparkle key={i} {...s} color={x.sparkle} />
        ))}
      </Svg>
    </View>
  );
}

/** The glow around the finished season card, behind both faces; it breathes slowly. */
function Aura({ x, t }: { x: Extravagant; t: CardFinishTokens }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.75);
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0.6, { duration: 1800 })), -1);
  }, [pulse, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const pad = 26;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -pad, right: -pad, top: -pad, bottom: -pad }, style]} testID="card-aura">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W + pad * 2} ${H + pad * 2}`} preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="aura" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0.5" stopColor={x.aura[0]} />
            <Stop offset="0.7" stopColor={x.aura[1]} />
            <Stop offset="0.85" stopColor={x.aura[2] ?? x.aura[1]} />
            <Stop offset="1" stopColor={t.surface} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W + pad * 2} height={H + pad * 2} rx={60} fill="url(#aura)" />
      </Svg>
    </Animated.View>
  );
}

/** The seal on the finished season card's front: the season and the card's name, in gold. */
function Seal({ x, t, k }: { x: Extravagant; t: CardFinishTokens; k: number }) {
  return (
    <View
      className="self-start flex-row items-center"
      style={{ backgroundColor: t.accent, borderRadius: 999, paddingHorizontal: 9 * k, paddingVertical: 3 * k, marginBottom: 8 * k, gap: 4 * k }}
      testID="card-seal"
    >
      <Text className="font-body-bold" style={{ color: t.surface, fontSize: 9 * k, letterSpacing: 1.4 * k }}>{`★ ${x.seal}`}</Text>
    </View>
  );
}

/** The cover of a piece just won: lime for a moment, then gone. */
function RevealCover({ piece }: { piece: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const flash = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0;
      return;
    }
    flash.value = withDelay(REVEAL.delay, withSequence(withTiming(1, { duration: REVEAL.flash }), withTiming(0, { duration: REVEAL.fade })));
    opacity.value = withDelay(REVEAL.delay + REVEAL.flash, withTiming(0, { duration: REVEAL.fade, easing: Easing.out(Easing.cubic) }));
  }, [flash, opacity, reduceMotion]);

  const cover = useAnimatedProps(() => ({ opacity: opacity.value }));
  const glow = useAnimatedProps(() => ({ opacity: flash.value }));
  return (
    <>
      <AnimatedPolygon animatedProps={cover} points={piecePoints(piece)} fill={PIECE_COVER.fill} stroke={PIECE_COVER.edge} strokeWidth={1} />
      <AnimatedPolygon animatedProps={glow} points={piecePoints(piece)} fill={PIECE_COVER.next} fillOpacity={0.55} stroke={PIECE_COVER.next} strokeWidth={3} />
    </>
  );
}

/**
 * The missing pieces of the season card, over a face: dark glass shards with the
 * level that gives each one. The back is the front's mirror, without numbers.
 */
function PieceCovers({ t, k, pieces, side }: { t: CardFinishTokens; k: number; pieces: CardPieces; side: 'front' | 'back' }) {
  const id = `${side}-pieces`;
  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      style={side === 'back' ? { transform: [{ scaleX: -1 }] } : undefined}
      testID={side === 'front' ? 'card-pieces' : undefined}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute' }}>
        <Defs>
          <ClipPath id={id}>
            <Shape t={t} inner={false} fill="#000" />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id})`}>
          {pieces.missing.map((p) => (
            <Polygon
              key={p}
              points={piecePoints(p)}
              fill={PIECE_COVER.fill}
              fillOpacity={PIECE_COVER.fillOpacity}
              stroke={p === pieces.next ? PIECE_COVER.next : PIECE_COVER.edge}
              strokeWidth={p === pieces.next ? 2.5 : 1}
            />
          ))}
          {pieces.reveal != null ? <RevealCover key={pieces.reveal} piece={pieces.reveal} /> : null}
        </G>
      </Svg>
      {side === 'front'
        ? pieces.missing.map((p) => {
            const c = pieceCenter(p);
            if (pieces.locked?.includes(p)) {
              return (
                <View key={p} className="absolute" style={{ left: (c.x - 9) * k, top: (c.y - 9) * k }} testID="piece-locked">
                  <IconPrivado size={18 * k} color={PIECE_COVER.next} />
                </View>
              );
            }
            return (
              <Text
                key={p}
                className="font-num absolute text-center"
                style={{
                  color: p === pieces.next ? PIECE_COVER.next : PIECE_COVER.number,
                  fontSize: 15 * k,
                  width: 40 * k,
                  left: (c.x - 20) * k,
                  top: (c.y - 10) * k,
                }}
              >
                {PIECE_ORDER.indexOf(p as (typeof PIECE_ORDER)[number]) + 1}
              </Text>
            );
          })
        : null}
    </View>
  );
}

/**
 * The logo on the card: always the designer's "Ativo 17" lockup (blue + lime),
 * never recolored by the finish or the light, on its own navy plate in the top
 * corner, clear of the frame, so it reads over any photo.
 */
function CardLogo({ height }: { height: number }) {
  return (
    <View
      className="self-start bg-surface-dark"
      style={{ borderRadius: height * 0.4, paddingHorizontal: height * 0.35, paddingVertical: height * 0.22 }}
    >
      <QuadraWordmark variant="blue" height={height} />
    </View>
  );
}

function Front({ profile, t, k, title, extra }: { profile: MyProfile; t: CardFinishTokens; k: number; title: string; extra?: Extravagant }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return (
    <View className="absolute inset-0" style={{ paddingHorizontal: 20 * k, paddingTop: 20 * k, paddingBottom: 22 * k }}>
      <View className="flex-row items-start justify-between">
        <CardLogo height={16 * k} />
        {/* GERAL, the same number as the profile and the ranking. */}
        <View className="items-end" testID="card-overall">
          <Text className="font-num" style={{ color: t.ink, fontSize: 34 * k, lineHeight: 36 * k }}>{profile.overall}</Text>
          <Text className="font-mono" style={{ color: t.muted, fontSize: 8 * k, letterSpacing: 1.6 * k }}>GERAL</Text>
        </View>
      </View>
      <View className="mt-auto">
        {extra ? <Seal x={extra} t={t} k={k} /> : null}
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

function Back({ profile, t, k, title }: { profile: MyProfile; t: CardFinishTokens; k: number; title: string }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const r = profile.record;
  const groups: { label: string; cells: [string, string][] }[] = [
    { label: 'Atributos', cells: [['ATK', String(profile.atk)], ['DEF', String(profile.def)], ['BLK', String(profile.blk)], ['ACE', String(profile.ace)]] },
    { label: 'Resultados', cells: [['Derrotas', String(r.losses)], ['Empates', String(r.draws)], ['Aproveitamento', percent(r.wins, r.matches)]] },
    { label: 'Evolução', cells: [['Nível', String(profile.level)], ['Pontos', String(profile.points)], ['MVP por jogo', percent(r.mvps, r.matches)]] },
  ];
  const line = { borderColor: t.edge };

  return (
    <View className="absolute inset-0" style={{ paddingHorizontal: 21 * k, paddingTop: 22 * k, paddingBottom: 20 * k }}>
      <CardLogo height={16 * k} />
      <View style={{ marginTop: 20 * k }}>
        <Text className="font-mono" style={{ color: t.muted, fontSize: 8 * k, letterSpacing: 1.6 * k }}>{`EM QUADRA  ·  CARTA ${t.name.toUpperCase()}`}</Text>
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
 * back; a tap or a long horizontal swipe flips it. The basic card is matte; the
 * season card, once complete (no `pieces`), gets its extras: stars, an aura, a
 * seal and a light that sweeps by itself (DECISIONS #199). The gesture lives on the card only, so the screen still
 * scrolls around it. Reduced motion: no tilt, instant flip.
 */
export function PlayerCard({ profile, finish, title, photoUrl, flipped, onFlip, width, faceRefs, pieces, testID }: PlayerCardProps) {
  const t = cardFinishTokens(finish);
  const k = width / W;
  const height = H * k;
  const reduceMotion = useReducedMotion();
  const titleName = cardTitleName(title);
  // The extras only on the complete season card: while it is being built, the pieces are the show.
  const extra = pieces ? undefined : t.extravagant;
  const sweepValue = useSharedValue(0);
  useEffect(() => {
    if (!extra || reduceMotion) return;
    sweepValue.value = withRepeat(
      withSequence(withTiming(1, { duration: SWEEP.run, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: SWEEP.pause }), withTiming(0, { duration: 0 })),
      -1,
    );
  }, [extra, reduceMotion, sweepValue]);
  const sweep = extra && !reduceMotion ? sweepValue : null;

  const rx = useSharedValue(REST.rx);
  const ry = useSharedValue(REST.ry);
  const mx = useSharedValue(0.5);
  const my = useSharedValue(0.4);
  const turn = useSharedValue(flipped ? 1 : 0);
  // A finger on the card (or the card settling after it): the sensor waits.
  const held = useSharedValue(false);
  const rest = useSharedValue({ pitch: 0, roll: 0, ready: false });
  // The face turned away keeps its light still: no redraw for what is not seen.
  const still = useSharedValue(0.5);
  const rotation = useAnimatedSensor(SensorType.ROTATION, { interval: GYRO.intervalMs });

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
      if (Math.abs(REST.rx + dx - rx.value) < GYRO.deadzone && Math.abs(REST.ry + dy - ry.value) < GYRO.deadzone) return;
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
        accessibilityLabel={`Carta de ${[profile.firstName, profile.lastName].filter(Boolean).join(' ')}. ${pieces ? `${PIECE_ORDER.length - pieces.missing.length} de ${PIECE_ORDER.length} pedaços. ` : ''}${flipped ? 'Verso' : 'Frente'}. Toque para virar.`}
        onAccessibilityTap={onFlip}
        style={[{ width, height }, tilt]}
      >
        {extra ? <Aura x={extra} t={t} /> : null}
        <Animated.View key={finish} entering={FadeIn.duration(reduceMotion ? 0 : 300)} className="absolute inset-0">
          <Animated.View ref={faceRefs?.front} collapsable={false} className="absolute inset-0" style={[{ backfaceVisibility: 'hidden' }, front]}>
            <Material t={t} side="front" photoUrl={photoUrl} mx={flipped ? still : mx} my={flipped ? still : my} sweep={flipped ? null : sweep} />
            <Front profile={profile} t={t} k={k} title={titleName} extra={extra} />
            {extra && !flipped ? <Sparkles x={extra} /> : null}
            {pieces ? <PieceCovers t={t} k={k} pieces={pieces} side="front" /> : null}
          </Animated.View>
          <Animated.View ref={faceRefs?.back} collapsable={false} className="absolute inset-0" style={[{ backfaceVisibility: 'hidden' }, back]}>
            <Material t={t} side="back" mx={flipped ? mx : still} my={flipped ? my : still} sweep={flipped ? sweep : null} />
            <Back profile={profile} t={t} k={k} title={titleName} />
            {extra && flipped ? <Sparkles x={extra} /> : null}
            {pieces ? <PieceCovers t={t} k={k} pieces={pieces} side="back" /> : null}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
