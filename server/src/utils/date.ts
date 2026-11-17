/**
 * Utilidades de fechas. Trabajamos con strings:
 *  - Mes:   'YYYY-MM'
 *  - Fecha: 'YYYY-MM-DD'
 * Esto evita problemas de zonas horarias y permite comparar como texto en SQL.
 */

export const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Desplaza un mes `delta` posiciones (negativo = hacia atrás). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Rango de fechas [inicio, fin] del mes para consultas `BETWEEN`. */
export function monthRange(month: string): [string, string] {
  return [`${month}-01`, `${month}-31`];
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Días que quedan en el mes (incluye hoy). 0 si el mes ya pasó. */
export function remainingDaysInMonth(month: string): number {
  const now = currentMonth();
  if (month < now) return 0;
  if (month > now) return daysInMonth(month);
  return daysInMonth(month) - new Date().getDate() + 1;
}

/** Meses completos entre el mes actual y una fecha objetivo. */
export function monthsUntil(date: string): number {
  const [ty, tm] = date.split('-').map(Number);
  const now = new Date();
  return (ty - now.getFullYear()) * 12 + (tm - (now.getMonth() + 1));
}

/** 'YYYY-MM' -> 'noviembre 2026' */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
}

/** 'YYYY-MM' -> 'nov' */
export function shortMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'short' }).replace('.', '');
}
