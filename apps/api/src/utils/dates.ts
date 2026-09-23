/**
 * Datas de entrega/retirada são tratadas como "data de calendário" (YYYY-MM-DD)
 * no fuso de São Paulo. No banco, gravamos ao meio-dia UTC para que nenhum fuso
 * horário "mude o dia" ao exibir.
 */
const TIMEZONE = 'America/Sao_Paulo';

export function todayISO(): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
}

export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function dateToISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToISO(date);
}

export function weekdayOf(iso: string): number {
  return isoToDate(iso).getUTCDay();
}

/** Primeira data possível respeitando o prazo mínimo e os dias de funcionamento. */
export function earliestDate(leadDays: number, openWeekdays: number[]): string {
  let date = addDaysISO(todayISO(), Math.max(0, leadDays));
  if (openWeekdays.length === 0) return date;
  for (let i = 0; i < 14 && !openWeekdays.includes(weekdayOf(date)); i++) {
    date = addDaysISO(date, 1);
  }
  return date;
}

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? isoToDate(date) : date;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
