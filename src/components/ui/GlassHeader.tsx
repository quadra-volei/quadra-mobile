import { BlurView } from "expo-blur";
import type { ReactNode, RefObject } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Transparent breathing room between the glass header's bottom edge and the
 * first row of content. Baked into the height reported via `onHeight`, so the
 * glass keeps its true size and only the content start shifts down.
 */
const HEADER_CONTENT_GAP = 12;

type GlassHeaderProps = {
  /** Header row content (title + right cluster), rendered over the blur. */
  children: ReactNode;
  /**
   * Ref to the `BlurTargetView` wrapping the screen's scroll content. Android's
   * `dimezisBlurView` blurs this target as its backdrop; without it the blur
   * silently falls back to "none". Ignored on iOS (it blurs natively).
   */
  blurTarget?: RefObject<View | null>;
  /**
   * Reports the header's total height (safe-area top inset included) so the
   * screen can pad its scroll content by that amount. The header floats above
   * the content — glassmorphism only reads when content passes beneath it.
   */
  onHeight?: (height: number) => void;
  /**
   * Glass tint. `"light"` (default) matches light screens; `"dark"` tints the
   * blur + wash for navy screens (e.g. the player card).
   */
  tint?: "light" | "dark";
};

/**
 * Translucent app header matching the Quadra prototype's glass chrome
 * (`rgba(255,255,255,.55)` + `saturate(160%) blur(22px)`). The `BlurView`
 * supplies the real backdrop blur; the inner white wash + hairline border
 * approximate the prototype's tint. It is absolutely positioned so the screen's
 * scroll content extends underneath and blurs as it scrolls past.
 */
export function GlassHeader({
  children,
  blurTarget,
  onHeight,
  tint = "light",
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const wash =
    tint === "dark"
      ? "bg-surface-dark/40 border-b border-white/10"
      : "bg-white/40 border-b border-white/50";

  return (
    <BlurView
      intensity={40}
      tint={tint}
      // Real backdrop blur on Android (iOS blurs natively regardless). The
      // target is the screen's BlurTargetView, passed via `blurTarget`.
      blurMethod="dimezisBlurView"
      blurTarget={blurTarget}
      onLayout={(e: LayoutChangeEvent) =>
        onHeight?.(e.nativeEvent.layout.height + HEADER_CONTENT_GAP)
      }
      style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
    >
      <View style={{ paddingTop: insets.top }} className={wash}>
        {children}
      </View>
    </BlurView>
  );
}
