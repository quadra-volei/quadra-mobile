import type { Href } from 'expo-router';

// A link opened before the user was signed in (an invite link, for instance): kept in memory
// and opened once the tabs mount after login or onboarding. Lost if the app is closed meanwhile.
let pending: Href | null = null;

export function setPendingLink(href: Href): void {
  pending = href;
}

/** The pending link, once: reading it clears it. */
export function takePendingLink(): Href | null {
  const href = pending;
  pending = null;
  return href;
}
