/**
 * Esquemas de validación reutilizables (Zod).
 */
import { z } from 'zod';
import { currentMonth, DATE_REGEX, MONTH_REGEX, today } from './date';
import { badRequest } from './httpError';

export const monthSchema = z.string().regex(MONTH_REGEX, 'Formato de mes inválido (YYYY-MM)');
export const dateSchema = z.string().regex(DATE_REGEX, 'Formato de fecha inválido (YYYY-MM-DD)');
export const amountSchema = z.coerce
  .number({ invalid_type_error: 'El monto debe ser numérico' })
  .positive('El monto debe ser mayor a 0')
  .max(1_000_000_000_000);

/** Lee `?month=YYYY-MM` (por defecto el mes actual). */
export function parseMonthQuery(query: unknown): string {
  const { month } = z.object({ month: monthSchema.optional() }).parse(query);
  return month ?? currentMonth();
}

/** Fecha opcional con valor por defecto = hoy. */
export const optionalDateSchema = dateSchema.optional().transform((d) => d ?? today());

/** Convierte `req.params.id` en entero positivo. */
export function parseId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Identificador inválido');
  return id;
}
