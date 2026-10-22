import { router } from "expo-router";
import { ChevronLeft, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { PressableScale } from "@/components/ui/PressableScale";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors } from "@/theme/colors";
import { ICON_HIT_SLOP } from "@/theme/layout";

type BackHeaderProps = {
  /** Screen title, rendered in the display face (uppercased by the token). */
  title: string;
  /** `"dark"` for navy screens (e.g. the player card). */
  tint?: "light" | "dark";
  /** Optional right-aligned cluster (e.g. a Bell or Share action). */
  right?: ReactNode;
  /** Forwarded to `ScreenHeader` — reports total header height for content offset. */
  onHeight?: (height: number) => void;
  /**
   * Lay the title out like the tab headers (Início, Explorar): same left edge
   * and the same row height, with a close button in the right cluster instead
   * of the back chevron before the title. For screens opened from a tab
   * header's icons (Configurações).
   */
  asTab?: boolean;
};

/**
 * Standard header for pushed stack screens (back chevron + title, optional
 * right cluster) over the shared `ScreenHeader`. Mirrors the tab headers'
 * bare-chevron affordance so every screen's header reads as one system.
 */
export function BackHeader({
  title,
  tint = "light",
  right,
  onHeight,
  asTab = false,
}: BackHeaderProps) {
  const iconColor = tint === "dark" ? colors.textOnDark : colors.surfaceDark;
  const titleColor = tint === "dark" ? "text-text-on-dark" : "text-text-primary";

  if (asTab) {
    return (
      <ScreenHeader tint={tint} onHeight={onHeight}>
        <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
          <Text numberOfLines={1} className={`shrink font-display text-h1 uppercase ${titleColor}`}>
            {title}
          </Text>
          <View className="flex-row items-center gap-3">
            {right}
            <IconButton label="Fechar" onPress={() => router.back()}>
              <X size={20} color={colors.surfaceDark} />
            </IconButton>
          </View>
        </View>
      </ScreenHeader>
    );
  }

  return (
    <ScreenHeader tint={tint} onHeight={onHeight}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View className="flex-1 flex-row items-center gap-3">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={ICON_HIT_SLOP}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={iconColor} />
          </PressableScale>
          <Text
            numberOfLines={1}
            className={`shrink font-display text-h1 uppercase ${titleColor}`}
          >
            {title}
          </Text>
        </View>
        {right ? (
          <View className="flex-row items-center gap-3">{right}</View>
        ) : null}
      </View>
    </ScreenHeader>
  );
}
