import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { COVER_FILTER_ALPHA, colors, withAlpha } from '@/theme/colors';

export type CourtImageProps = {
  /** Hex tint ('#RRGGBB') the cover gradient runs from (tint → navy); also the filter over a photo. */
  tint: string;
  /** Cover height in px. */
  height: number;
  /** Corner radius in px (0 when the cover sits flush at a card's top). */
  radius?: number;
  /** Optional mono label printed top-right (e.g. "FOTO DA QUADRA"). */
  label?: string;
  /** A real photo (the match cover); replaces the court motif and the label. */
  imageUri?: string;
  /** Overlaid content (tags, bottom info) positioned absolutely by the caller. */
  children?: ReactNode;
};

const LINE = 'rgba(255,255,255,0.16)';

/**
 * On-brand court-image placeholder (DESIGN_SYSTEM cover motif; ports the
 * prototype's `CourtImage`). A `tint → navy` gradient behind a faint volleyball
 * court line motif, an optional mono label, and freely overlaid children.
 * Used as every match cover. A photo gets the level filter (tint → navy at
 * `COVER_FILTER_ALPHA`) so covers keep the level color with or without one. The motif is drawn with plain
 * Views (no SVG) so it stays cheap and render-safe everywhere.
 */
export function CourtImage({
  tint,
  height,
  radius = 16,
  label,
  imageUri,
  children,
}: CourtImageProps) {
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      {/* tint → navy base fill (inline, never a className on LinearGradient) */}
      <LinearGradient
        colors={[tint, colors.surfaceDark]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          contentFit="cover"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          testID="court-image-photo"
        />
      ) : null}
      {/* Level filter over the photo, so every cover of a level shares its color. */}
      {imageUri ? (
        <LinearGradient
          testID="court-image-filter"
          colors={[
            withAlpha(tint, COVER_FILTER_ALPHA.tint),
            withAlpha(colors.surfaceDark, COVER_FILTER_ALPHA.navy),
          ]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      ) : null}
      {/* faint court line motif: outer box, center line, two dashed attack lines */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
        style={imageUri ? { display: 'none' } : undefined}
      >
        <View
          style={{
            width: '74%',
            height: '75%',
            borderWidth: 1.4,
            borderColor: LINE,
            borderRadius: 2,
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 1.4,
              backgroundColor: LINE,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: '25%',
              left: 0,
              right: 0,
              borderTopWidth: 1.4,
              borderColor: LINE,
              borderStyle: 'dashed',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: '75%',
              left: 0,
              right: 0,
              borderTopWidth: 1.4,
              borderColor: LINE,
              borderStyle: 'dashed',
            }}
          />
        </View>
      </View>
      {label && !imageUri ? (
        <Text
          className="font-mono absolute top-2 right-3"
          style={{ fontSize: 8.5, letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)' }}
        >
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
