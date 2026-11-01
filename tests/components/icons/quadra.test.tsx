import { render } from '@testing-library/react-native';
import type { QuadraIcon } from '@/components/icons/quadra';

const icons: Record<string, QuadraIcon> = jest.requireActual(
  '@/components/icons/quadra',
);

describe('Quadra icon family', () => {
  it("has the designer's 95 icons plus filled Curtir, and each one renders", () => {
    const entries = Object.entries(icons).filter(([name]) => name.startsWith('Icon'));
    expect(entries).toHaveLength(96);
    for (const [, Icon] of entries) {
      expect(() => render(<Icon size={24} color="#000" />)).not.toThrow();
    }
  });
});
