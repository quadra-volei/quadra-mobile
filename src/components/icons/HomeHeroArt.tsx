import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/colors';

// Thin white strokes at low opacity over the blue card: present, never louder
// than the title. The court spans the whole box; the ball and its rings sit at
// the centre, the art's focal point (DECISIONS #102).
const STROKE = colors.textOnDark;

/**
 * Background art of the empty-Home hero: a volleyball court seen from above
 * filling the card (side lines, net, dashed attack lines), with a ball and
 * fading rings at its centre over a soft stepped glow. Fills its parent (`slice`, so
 * any card ratio keeps the centre).
 */
export function HomeHeroArt() {
  return (
    <Svg
      testID="home-hero-art"
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* soft glow: stacked discs, brighter towards the centre */}
      <Circle cx={200} cy={250} r={190} fill={STROKE} fillOpacity={0.03} />
      <Circle cx={200} cy={250} r={130} fill={STROKE} fillOpacity={0.03} />
      <Circle cx={200} cy={250} r={86} fill={STROKE} fillOpacity={0.04} />

      {/* court */}
      <Rect x={28} y={36} width={344} height={428} rx={4} fill="none" stroke={STROKE} strokeOpacity={0.09} strokeWidth={2} />
      <Line x1={28} y1={250} x2={372} y2={250} stroke={STROKE} strokeOpacity={0.12} strokeWidth={3} />
      <Line x1={28} y1={164} x2={372} y2={164} stroke={STROKE} strokeOpacity={0.08} strokeWidth={2} strokeDasharray="10 8" />
      <Line x1={28} y1={336} x2={372} y2={336} stroke={STROKE} strokeOpacity={0.08} strokeWidth={2} strokeDasharray="10 8" />

      {/* rings fading out from the centre */}
      <Circle cx={200} cy={250} r={168} fill="none" stroke={STROKE} strokeOpacity={0.05} strokeWidth={1.5} />
      <Circle cx={200} cy={250} r={124} fill="none" stroke={STROKE} strokeOpacity={0.08} strokeWidth={1.5} />

      {/* ball: outline and three seams */}
      <Circle cx={200} cy={250} r={70} fill="none" stroke={STROKE} strokeOpacity={0.16} strokeWidth={2.5} />
      <Path d="M135 225 C175 215 222 232 255 290" fill="none" stroke={STROKE} strokeOpacity={0.14} strokeWidth={2.5} />
      <Path d="M185 182 C178 228 196 270 238 309" fill="none" stroke={STROKE} strokeOpacity={0.14} strokeWidth={2.5} />
      <Path d="M262 222 C230 238 190 268 160 306" fill="none" stroke={STROKE} strokeOpacity={0.14} strokeWidth={2.5} />
    </Svg>
  );
}
