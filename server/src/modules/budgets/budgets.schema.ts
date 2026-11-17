import { z } from 'zod';
import { amountSchema, monthSchema } from '../../utils/validation';

export const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive('Selecciona una categoría'),
  month: monthSchema,
  amount: amountSchema,
});

export const budgetUpdateSchema = z.object({
  amount: amountSchema,
});

export const budgetCopySchema = z.object({
  /** Mes destino. El origen por defecto es el mes anterior. */
  toMonth: monthSchema,
  fromMonth: monthSchema.optional(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
