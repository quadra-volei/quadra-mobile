import type { ReactNode } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Breathing room between the header's bottom edge and the first row of
 * content. Baked into the height reported via `onHeight`, so the header keeps
 * its true size and only the content start shifts down.
 */
const HEADER_CONTENT_GAP = 12;

type ScreenHeaderProps = {
  /** Header row content (title + right cluster). */
  children: ReactNode;
  /**
   * Reports the header's total height (safe-area top inset included) so the
   * screen can pad its scroll content by that amount — the header is pinned
   * over the content.
   */
  onHeight?: (height: number) => void;
  /** `"light"` (default) for light screens; `"dark"` for navy screens. */
  tint?: "light" | "dark";
};

/**
 * Pinned app header: solid, the same color as the screen behind it, with a
 * hairline at its bottom edge so scrolling content has a clear cut-off. Solid
 * on purpose — the earlier backdrop blur rendered grey or white on Android
 * depending on what scrolled beneath it (DECISIONS #46).
 */
export function ScreenHeader({
  children,
  onHeight,
  tint = "light",
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(e: LayoutChangeEvent) =>
        onHeight?.(e.nativeEvent.layout.height + HEADER_CONTENT_GAP)
      }
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: insets.top,
      }}
      className={
        tint === "dark"
          ? "bg-surface-dark border-b border-white/10"
          : "bg-bg-light border-b border-line"
      }
    >
      {children}
    </View>
  );
}
