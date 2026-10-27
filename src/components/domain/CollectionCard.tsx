import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CHAMFER_INNER, CHAMFER_OUTER } from '@/components/domain/PlayerCard';
import type { CollectionCard as CollectionCardData } from '@/features/pass/api/seasonPass';
import { CARD_H, CARD_W, missingPieces, piecePoints } from '@/features/pass/lib/cardPieces';
import { dayMonth } from '@/features/pass/lib/seasonText';
import { PIECE_COVER, cardFinishTokens } from '@/theme/cardFinish';
import { colors } from '@/theme/colors';

/** "8 de 12 · em andamento", "Completa", "Começa 1 nov". */
export function collectionStatus(card: CollectionCardData): string {
  if (card.complete) return 'Completa';
  if (card.status === 'Upcoming') return `Começa ${dayMonth(Date.parse(card.startsAt))}`;
  return `${card.pieces} de ${card.levels} · ${card.status === 'Active' ? 'em andamento' : 'incompleta'}`;
}

/**
 * A season card in the collection (API DECISIONS #99): the finish's frame and
 * colors, the season's code, the pieces still missing covered like on the real
 * card, and below it the season and how far the player got. Static (no photo,
 * no motion), so a row of them stays cheap.
 */
export function CollectionCard({ card, width, testID }: { card: CollectionCardData; width: number; testID?: string }) {
  const t = cardFinishTokens(card.finish);
  const k = width / CARD_W;
  const id = `col-${card.season}`;
  const missing = missingPieces(card.status === 'Upcoming' ? 0 : card.pieces);
  const code = card.season.toUpperCase();

  return (
    <View style={{ width }} testID={testID} accessible accessibilityLabel={`${card.name}, carta ${t.name}: ${collectionStatus(card)}`}>
      <View style={{ width, height: CARD_H * k }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={`${id}-frame`} x1="0" y1="0" x2="1" y2="1">
              {t.frame.map((c, i) => (
                <Stop key={i} offset={i / (t.frame.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
            <LinearGradient id={`${id}-foil`} x1="0" y1="0" x2="1" y2="0.35">
              {t.foil.map((c, i) => (
                <Stop key={i} offset={i / (t.foil.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
            <RadialGradient id={`${id}-glow`} cx="0.75" cy="0.2" r="0.8">
              <Stop offset="0" stopColor={t.accent} stopOpacity={0.32} />
              <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
            </RadialGradient>
            <ClipPath id={`${id}-clip`}>
              <Polygon points={CHAMFER_INNER} />
            </ClipPath>
          </Defs>
          <Polygon points={CHAMFER_OUTER} fill={`url(#${id}-frame)`} />
          <Polygon points={CHAMFER_INNER} fill={t.surface} />
          <G clipPath={`url(#${id}-clip)`}>
            <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill={`url(#${id}-glow)`} />
            {card.complete ? (
              <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill={`url(#${id}-foil)`} opacity={0.18} />
            ) : null}
            {missing.map((p) => (
              <Polygon key={p} points={piecePoints(p)} fill={PIECE_COVER.fill} fillOpacity={PIECE_COVER.fillOpacity} stroke={PIECE_COVER.edge} strokeWidth={2} />
            ))}
          </G>
        </Svg>
        {/* The season's code and the finish name stay readable over the missing pieces. */}
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-display uppercase" style={{ color: t.ink, fontSize: Math.max(18, 96 * k) }}>{code}</Text>
          <Text className="font-mono uppercase" style={{ color: t.accent, fontSize: Math.max(8, 22 * k), letterSpacing: 1.5 }}>
            {t.name}
          </Text>
        </View>
        {card.complete ? (
          <View className="absolute items-center justify-center rounded-full bg-accent-light" style={{ right: 6, bottom: 6, width: 22, height: 22 }}>
            <Check size={14} color={colors.surfaceDark} />
          </View>
        ) : null}
      </View>
      <Text className="font-body-bold text-caption text-text-on-dark mt-2" numberOfLines={1}>{card.name}</Text>
      <Text className={`font-body text-caption ${card.complete ? 'text-accent-light' : 'text-white/60'}`} numberOfLines={1}>
        {collectionStatus(card)}
      </Text>
    </View>
  );
}

/** The empty slot after the cards: more come with the next seasons and the events. */
export function CollectionCardSoon({ width }: { width: number }) {
  const k = width / CARD_W;
  return (
    <View style={{ width }} accessible accessibilityLabel="Próximas cartas: novas temporadas e eventos">
      <View style={{ width, height: CARD_H * k }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute' }}>
          <Polygon points={CHAMFER_INNER} fill="none" stroke={PIECE_COVER.miniLine.dark} strokeWidth={4} strokeDasharray="14 10" />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-display uppercase text-white/30" style={{ fontSize: Math.max(18, 96 * k) }}>?</Text>
        </View>
      </View>
      <Text className="font-body-bold text-caption text-white/60 mt-2" numberOfLines={1}>Próximas cartas</Text>
      <Text className="font-body text-caption text-white/40" numberOfLines={1}>Temporadas e eventos</Text>
    </View>
  );
}
