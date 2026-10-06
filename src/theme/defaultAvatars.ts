// Bundled brand default avatars (illustrated) shown when a player has no
// uploaded photo. Matches the prototype, which uses these illustrations as
// everyone's default profile picture (header, ranking rows, suggestions).
// Consumed by `@/components/ui/Avatar`.
import type { ImageSource } from 'expo-image';

// `require()` of a static asset resolves to a numeric module id at runtime;
// expo-image's `source` accepts `number | ImageSource`.
export type AvatarSource = number | ImageSource;

const DEFAULT_AVATARS: readonly [AvatarSource, AvatarSource, AvatarSource] = [
  require('../../assets/avatars/perfil-1.png'),
  require('../../assets/avatars/perfil-5.png'),
  require('../../assets/avatars/perfil-8.png'),
];

/**
 * The primary default illustration — the volleyball-court avatar used beside
 * the profile greeting in the prototype. Pass to `Avatar`'s `defaultSource` to
 * pin a specific player (e.g. the current user) to this exact image.
 */
export const DEFAULT_AVATAR: AvatarSource = DEFAULT_AVATARS[0];

/**
 * Deterministic default avatar for a player, seeded by a stable string (name
 * or id) so a given player always gets the same illustration while a roster
 * shows variety. Falls back to {@link DEFAULT_AVATAR} without a seed.
 */
export function defaultAvatarFor(seed?: string): AvatarSource {
  const key = seed?.trim();
  if (!key) {
    return DEFAULT_AVATAR;
  }
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index] ?? DEFAULT_AVATAR;
}
