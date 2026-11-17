import { env } from '../config/env';

/** Redondea a 2 decimales evitando errores de coma flotante. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Variación porcentual. `null` si no hay base de comparación. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** Porcentaje seguro (evita división por cero). */
export const percentOf = (part: number, total: number): number =>
  total > 0 ? round2((part / total) * 100) : 0;

const currencyFormatter = new Intl.NumberFormat(env.locale, {
  style: 'currency',
  currency: env.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatea montos para reportes (PDF). */
export const formatMoney = (n: number): string =>
  currencyFormatter.format(n).replace(/\u202F/g, ' ');
