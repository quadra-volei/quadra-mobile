import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export type TagProps = {
  children: ReactNode;
  /** Pill background (hex or rgba). Defaults to lime accent. */
  bg?: string;
  /** Label color (hex or rgba). Defaults to navy. */
  color?: string;
  /** Render a small leading dot in the label color. */
  dot?: boolean;
};

/**
 * Small uppercase pill label (DESIGN_SYSTEM tags & pills; ports the prototype's
 * `Tag`): DM Sans 700, 10px, letter-spacing 1, uppercase. Colors are passed in
 * because they vary per use (category, format, level) — the caller owns the
 * palette choice per DESIGN_SYSTEM's priority rule.
 */
export function Tag({ children, bg = '#AADD00', color = '#0A0A3C', dot }: TagProps) {
  return (
    <View
      className="flex-row items-center rounded-pill px-[9px] py-1"
      style={{ backgroundColor: bg, columnGap: 5 }}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      ) : null}
      <Text
        className="font-body-bold uppercase"
        style={{ color, fontSize: 10, letterSpacing: 1, lineHeight: 12 }}
      >
        {children}
      </Text>
    </View>
  );
}
