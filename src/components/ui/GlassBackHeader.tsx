import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode, RefObject } from "react";
import { Pressable, Text, View } from "react-native";

import { GlassHeader } from "@/components/ui/GlassHeader";
import { colors } from "@/theme/colors";

type GlassBackHeaderProps = {
  /** Screen title, rendered in the display face (uppercased by the token). */
  title: string;
  /** Glass tint — `"dark"` for navy screens (e.g. the player card). */
  tint?: "light" | "dark";
  /** Optional right-aligned cluster (e.g. a Bell or Share action). */
  right?: ReactNode;
  /** Forwarded to `GlassHeader` — Android backdrop-blur target. */
  blurTarget?: RefObject<View | null>;
  /** Forwarded to `GlassHeader` — reports total header height for content offset. */
  onHeight?: (height: number) => void;
};

/**
 * Standard glass header for pushed stack screens (back chevron + title, optional
 * right cluster) over the shared `GlassHeader` glass chrome. Mirrors the tab
 * headers' bare-chevron affordance so every screen's header reads as one system.
 */
export function GlassBackHeader({
  title,
  tint = "light",
  right,
  blurTarget,
  onHeight,
}: GlassBackHeaderProps) {
  const iconColor = tint === "dark" ? colors.textOnDark : colors.surfaceDark;
  const titleColor = tint === "dark" ? "text-text-on-dark" : "text-text-primary";

  return (
    <GlassHeader tint={tint} blurTarget={blurTarget} onHeight={onHeight}>
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4">
        <View className="flex-1 flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
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
    </GlassHeader>
  );
}
