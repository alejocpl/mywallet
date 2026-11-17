import { z } from 'zod';
import { amountSchema, dateSchema, monthSchema } from '../../utils/validation';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amountSchema,
  categoryId: z.coerce.number().int().positive('Selecciona una categoría'),
  description: z.string().trim().max(140).default(''),
  date: dateSchema,
});

export const transactionFiltersSchema = z.object({
  month: monthSchema.optional(),
  type: z.enum(['income', 'expense']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().positive().max(2000).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
