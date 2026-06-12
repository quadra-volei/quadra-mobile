import Svg, { Path } from 'react-native-svg';

export type QuadraLogoProps = {
  /** Width in px. Height is derived from the brand mark's aspect ratio. */
  size?: number;
};

const ASPECT = 162.81 / 168.45;

/**
 * Quadra brand mark (official asset, ported from docs/uploads/Icone-quadra-logo.svg):
 * three overlapping blocks in motion (blue + lime), per DESIGN_SYSTEM "Logo & wordmark".
 * Brand colors are fixed and must never be recolored, so they are intentionally not themeable.
 */
export function QuadraLogo({ size = 40 }: QuadraLogoProps) {
  return (
    <Svg width={size} height={size * ASPECT} viewBox="0 0 169 163" fill="none">
      <Path
        d="M47.9316 0.577696L98.0858 15.1204L60.4704 144.847L10.3162 130.304C2.72875 128.104 -1.64255 120.163 0.557503 112.575L30.2026 10.3364C32.4026 2.74895 40.3442 -1.62236 47.9316 0.577696Z"
        fill="#0032D1"
      />
      <Path
        d="M120.52 162.24L71.13 147.92L78.55 122.31L141.68 140.61L138.24 152.47C136.04 160.06 128.1 164.43 120.51 162.23L120.52 162.24Z"
        fill="#ACEA00"
      />
      <Path
        d="M108.737 18.2061L158.123 32.5259C165.711 34.726 170.082 42.6675 167.882 50.255L144.728 130.106L81.5986 111.801L108.737 18.2061Z"
        fill="#0032D1"
      />
    </Svg>
  );
}
