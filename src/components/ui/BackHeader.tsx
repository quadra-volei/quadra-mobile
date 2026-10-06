import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors } from "@/theme/colors";
import { ICON_HIT_SLOP, ICON_RIPPLE } from "@/theme/layout";

type BackHeaderProps = {
  /** Screen title, rendered in the display face (uppercased by the token). */
  title: string;
  /** `"dark"` for navy screens (e.g. the player card). */
  tint?: "light" | "dark";
  /** Optional right-aligned cluster (e.g. a Bell or Share action). */
  right?: ReactNode;
  /** Forwarded to `ScreenHeader` — reports total header height for content offset. */
  onHeight?: (height: number) => void;
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
}: BackHeaderProps) {
  const iconColor = tint === "dark" ? colors.textOnDark : colors.surfaceDark;
  const titleColor = tint === "dark" ? "text-text-on-dark" : "text-text-primary";

  return (
    <ScreenHeader tint={tint} onHeight={onHeight}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View className="flex-1 flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={ICON_HIT_SLOP}
            android_ripple={ICON_RIPPLE}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={iconColor} />
          </Pressable>
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
