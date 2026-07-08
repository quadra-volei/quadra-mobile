import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export type CourtImageProps = {
  /** Hex tint the cover gradient runs from (tint → navy). */
  tint: string;
  /** Cover height in px. */
  height: number;
  /** Corner radius in px (0 when the cover sits flush at a card's top). */
  radius?: number;
  /** Optional mono label printed top-right (e.g. "FOTO DA QUADRA"). */
  label?: string;
  /** Overlaid content (tags, bottom info) positioned absolutely by the caller. */
  children?: ReactNode;
};

const LINE = 'rgba(255,255,255,0.16)';

/**
 * On-brand court-image placeholder (DESIGN_SYSTEM cover motif; ports the
 * prototype's `CourtImage`). A `tint → navy` gradient behind a faint volleyball
 * court line motif, an optional mono label, and freely overlaid children.
 * Used as the cover of both Home match cards. The motif is drawn with plain
 * Views (no SVG) so it stays cheap and render-safe everywhere.
 */
export function CourtImage({
  tint,
  height,
  radius = 16,
  label,
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
      {/* faint court line motif: outer box, center line, two dashed attack lines */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
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
      {label ? (
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
