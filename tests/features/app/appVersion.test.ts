import { compareVersions, updateStatus } from '@/features/app/api/appVersion';

const policy = (minimumVersion: string | null, recommendedVersion: string | null) => ({
  minimumVersion,
  recommendedVersion,
  storeUrl: 'https://play.google.com/store/apps/details?id=com.quadra.app',
});

describe('update gate', () => {
  it('compares versions number by number', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBeGreaterThan(0);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
  });

  it('blocks below the minimum, suggests below the recommended, else lets the app run', () => {
    expect(updateStatus('1.0.0', policy('1.1.0', '1.2.0'))).toBe('block');
    expect(updateStatus('1.1.0', policy('1.1.0', '1.2.0'))).toBe('suggest');
    expect(updateStatus('1.2.0', policy('1.1.0', '1.2.0'))).toBe('ok');
    expect(updateStatus('1.0.0', policy(null, null))).toBe('ok');
  });
});
