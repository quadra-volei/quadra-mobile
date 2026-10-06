/**
 * S4 — onboarding Zod schema tests.
 *
 * Backs the screen-level acceptance criteria with unit coverage of the validation
 * contract that gates each "Continuar": required names, a real past DD/MM/AAAA
 * birth date, a 3-20 char [a-z0-9_] handle (lowercased), and the three enums that
 * enforce the exact option sets (6 positions / 3 levels / 2 modalities).
 */
import {
  LEVELS,
  MODALITIES,
  POSITIONS,
  onboardingSchema,
} from '@/features/profile/schema/onboarding';

const valid = {
  firstName: 'Renan',
  lastName: 'Dias',
  birthDate: '01/01/1990',
  handle: 'renan',
  position: 'COR' as const,
  level: 'INICIANTE' as const,
  modality: 'INDOOR' as const,
};

describe('onboardingSchema', () => {
  it('accepts a fully valid profile', () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty first/last names', () => {
    expect(onboardingSchema.safeParse({ ...valid, firstName: '' }).success).toBe(
      false,
    );
    expect(onboardingSchema.safeParse({ ...valid, lastName: '  ' }).success).toBe(
      false,
    );
  });

  it('rejects a malformed birth date (wrong mask)', () => {
    expect(
      onboardingSchema.safeParse({ ...valid, birthDate: '1/1/90' }).success,
    ).toBe(false);
  });

  it('rejects an impossible calendar date (31/02/2000)', () => {
    expect(
      onboardingSchema.safeParse({ ...valid, birthDate: '31/02/2000' }).success,
    ).toBe(false);
  });

  it('rejects a future birth date', () => {
    expect(
      onboardingSchema.safeParse({ ...valid, birthDate: '01/01/3000' }).success,
    ).toBe(false);
  });

  it('rejects handles that break the [a-z0-9_]{3,20} rule', () => {
    expect(onboardingSchema.safeParse({ ...valid, handle: 'ab' }).success).toBe(
      false,
    ); // too short
    expect(
      onboardingSchema.safeParse({ ...valid, handle: 'has space' }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...valid, handle: 'a'.repeat(21) }).success,
    ).toBe(false); // too long
  });

  it('lowercases the handle', () => {
    const parsed = onboardingSchema.parse({ ...valid, handle: 'RENAN' });
    expect(parsed.handle).toBe('renan');
  });

  it('enforces exactly 6 positions / 3 levels / 2 modalities', () => {
    expect(POSITIONS).toEqual(['LEV', 'PON', 'OPO', 'CEN', 'LIB', 'COR']);
    expect(LEVELS).toEqual(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']);
    expect(MODALITIES).toEqual(['INDOOR', 'BEACH']);
  });

  it('rejects enum values outside the allowed option sets', () => {
    expect(
      onboardingSchema.safeParse({ ...valid, position: 'XXX' }).success,
    ).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, level: 'PRO' }).success).toBe(
      false,
    );
    expect(
      onboardingSchema.safeParse({ ...valid, modality: 'GRASS' }).success,
    ).toBe(false);
  });
});
