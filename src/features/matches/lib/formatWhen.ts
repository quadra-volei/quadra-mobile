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

/**
 * "Hoje · 19h30" / "Amanhã · 20h00" / "20/06 · 19h30", relative to the current
 * day (Home cards).
 */
export function formatStartsAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(date) - startOfDay(now)) / (1000 * 60 * 60 * 24),
  );

  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const time = `${hh}h${mm}`;

  if (dayDiff === 0) return `Hoje · ${time}`;
  if (dayDiff === 1) return `Amanhã · ${time}`;

  const dd = String(date.getDate()).padStart(2, '0');
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mo} · ${time}`;
}
