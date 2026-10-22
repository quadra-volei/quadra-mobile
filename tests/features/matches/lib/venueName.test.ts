import { splitVenue } from '@/features/matches/lib/venueName';

describe('splitVenue', () => {
  it('puts the place name first and the address under it', () => {
    expect(splitVenue('Arena Beach · Rua das Flores, 10, São Paulo')).toEqual({
      name: 'Arena Beach',
      address: 'Rua das Flores, 10, São Paulo',
    });
  });

  it('keeps a typed address whole', () => {
    expect(splitVenue('Quadra do clube')).toEqual({ name: 'Quadra do clube', address: null });
  });
});
