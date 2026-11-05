/** "1 partida" / "2 partidas": the count with the word in singular or plural. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
