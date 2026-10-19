import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';

import appConfig from '../../../../app.json';

/** `GET /api/v1/app/version` (anonymous, API DECISIONS #74). */
export type AppVersionPolicy = {
  minimumVersion: string | null;
  recommendedVersion: string | null;
  storeUrl: string;
};

export type UpdateStatus = 'ok' | 'suggest' | 'block';

/** Compares dotted versions number by number ("1.10.0" > "1.9.2"); missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Below the minimum the app is blocked; below the recommended it only suggests the update. */
export function updateStatus(current: string, policy: AppVersionPolicy): UpdateStatus {
  if (policy.minimumVersion && compareVersions(current, policy.minimumVersion) < 0) return 'block';
  if (policy.recommendedVersion && compareVersions(current, policy.recommendedVersion) < 0) return 'suggest';
  return 'ok';
}

/**
 * The app's update status, checked once per launch. Offline or an API error means "ok":
 * the gate never locks anyone out because the check itself failed.
 */
export function useUpdateStatus() {
  const query = useQuery({
    queryKey: ['app', 'version'] as const,
    queryFn: () => apiClient<AppVersionPolicy>('/api/v1/app/version'),
    staleTime: Infinity,
    retry: 1,
  });
  return {
    status: query.data ? updateStatus(appConfig.expo.version, query.data) : ('ok' as UpdateStatus),
    storeUrl: query.data?.storeUrl,
  };
}
