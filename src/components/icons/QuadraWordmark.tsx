import { Image } from 'expo-image';

// The designer's official lockups (mark + "quadra"), one PNG per background.
// Never recolored or redrawn: pick the one made for the background.
const LOCKUPS = {
  /** Blue + lime blocks, light wordmark: dark/blue backgrounds (login). */
  blue: require('../../../assets/logo/quadra-azul-claro.png'),
  /** Light blocks + lime, light wordmark: dark surfaces where blue would vanish. */
  light: require('../../../assets/logo/quadra-branco.png'),
  /** Navy blocks + lime, navy wordmark: light surfaces. */
  navy: require('../../../assets/logo/quadra-navy.png'),
} as const;

export type QuadraWordmarkVariant = keyof typeof LOCKUPS;

const ASPECT = 1208 / 336;

/** The full "quadra" lockup (mark + wordmark) at a given height. */
export function QuadraWordmark({
  variant,
  height,
  testID,
}: {
  variant: QuadraWordmarkVariant;
  height: number;
  testID?: string;
}) {
  return (
    <Image
      source={LOCKUPS[variant]}
      style={{ height, width: height * ASPECT }}
      contentFit="contain"
      accessibilityLabel="quadra"
      testID={testID}
    />
  );
}
