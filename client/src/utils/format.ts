/**
 * Utilidades de formateo de dinero, porcentajes y fechas.
 */
import { BRAND } from '../config/brand';

const moneyFormatter = new Intl.NumberFormat(BRAND.locale, {
  style: 'currency',
  currency: BRAND.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactMoneyFormatter = new Intl.NumberFormat(BRAND.locale, {
  style: 'currency',
  currency: BRAND.currency,
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMoney(amount: number): string {
  return moneyFormatter.format(amount).replace(/\u202F/g, ' ');
}

export function formatMoneyCompact(amount: number): string {
  return compactMoneyFormatter.format(amount).replace(/\u202F/g, ' ');
}

/**
 * Formatea un valor numérico con comas de miles mientras el usuario escribe:
 *  '1000' -> '1,000', '10000' -> '10,000', '3500000' -> '3,500,000'.
 */
export function formatThousandsInput(value: string | number): string {
  const raw = String(value ?? '').replace(/\D/g, '');
  if (!raw) return '';
  const cleaned = raw.replace(/^0+(?=\d)/, '');
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Extrae solo dígitos limpios de un input formateado ('10,000' -> '10000'). */
export function parseThousandsInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+(?=\d)/, '');
}

export function formatPercent(value: number | null, showSign = false): string {
  if (value === null) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace(/\.0$/, '')}%`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const pad = (n: number) => String(n).padStart(2, '0');

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const raw = new Date(y, m - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
