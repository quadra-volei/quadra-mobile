/** "Hoje · 19h30" style label for when a match starts. */
export function formatWhen(startsAt: string): string {
  const date = new Date(startsAt);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const dayLabel = sameDay
    ? 'Hoje'
    : `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
  return `${dayLabel} · ${hh}h${mm}`;
}
