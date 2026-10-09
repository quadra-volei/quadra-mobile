import type { ReactNode } from "react";
import { Pressable } from "react-native";

import { HARD_SHADOW } from "@/theme/colors";

type IconButtonProps = {
  /** Read by assistive tech: the icon carries no text. */
  label: string;
  onPress: () => void;
  /** A 20px icon in `colors.surfaceDark`. */
  children: ReactNode;
  testID?: string;
};

/**
 * Boxed icon button of the screen headers (bell, settings, "+"): a 40px white
 * square under the button rule (2px navy border + hard shadow, DESIGN_SYSTEM
 * "Buttons"). `hitSlop` grows it to Android's 48dp touch target.
 */
export function IconButton({ label, onPress, children, testID }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={4}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-chip border-2 border-surface-dark bg-white"
      style={HARD_SHADOW}
    >
      {children}
    </Pressable>
  );
}
