import * as SecureStore from 'expo-secure-store';

// TEMPORARY (until backend F2.1 Profile lands): the backend has no Profile
// module yet, so it cannot say whether a user finished onboarding, and profile
// creation is still mocked on the device. Until then this device remembers which
// user id completed onboarding, so that user is not sent through S4 on every
// launch. Not a secret; it sits next to the tokens only to avoid a second
// storage. It deliberately survives logout.
//
// TODO(real-api): drop this file once GET /api/v1/auth/me (or the profile
// endpoint) reports `hasProfile` from the backend.
const ONBOARDED_USER_ID_KEY = 'quadra.onboardedUserId';

/** Whether `userId` completed onboarding on this device. */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(ONBOARDED_USER_ID_KEY);
  return stored === userId;
}

/** Records that `userId` completed onboarding on this device. */
export async function markOnboardingCompleted(userId: string): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDED_USER_ID_KEY, userId);
}
