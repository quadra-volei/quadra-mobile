/** The https invite link of a match (served by quadra-landing; opens the app via App Links). */
export function inviteLink(matchId: string, inviteCode?: string | null): string {
  const base = `https://quadra-volei.app/p/${matchId}`;
  return inviteCode ? `${base}?c=${encodeURIComponent(inviteCode)}` : base;
}
