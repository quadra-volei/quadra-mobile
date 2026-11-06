import type { SeasonPass } from '@/features/pass/api/seasonPass';

const DAY_MS = 86_400_000;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "1 nov" of an instant, in Brasília. */
export function dayMonth(ms: number): string {
  const [day, month] = new Date(ms).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/');
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

/** The season's days, "1 nov – 31 jan" (the end instant is the day after the last). */
export function seasonDays(pass: SeasonPass): string {
  return `${dayMonth(Date.parse(pass.startsAt))} – ${dayMonth(Date.parse(pass.endsAt) - DAY_MS)}`;
}

/** "Faltam 35 dias", "Começa em 5 dias", "Encerrada". */
export function seasonStatus(pass: SeasonPass, now = Date.now()): string {
  if (pass.status === 'Ended') return 'Encerrada';
  const days = Math.ceil((Date.parse(pass.status === 'Upcoming' ? pass.startsAt : pass.endsAt) - now) / DAY_MS);
  if (pass.status === 'Upcoming') return days <= 1 ? 'Começa amanhã' : `Começa em ${days} dias`;
  return days <= 1 ? 'Último dia' : `Faltam ${days} dias`;
}
