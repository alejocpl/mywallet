import { z } from 'zod';
import { monthSchema } from '../../utils/validation';

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(40),
  type: z.enum(['income', 'expense']),
  icon: z.string().trim().min(1).max(40).default('more'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido')
    .default('#64748B'),
  expenseGroup: z.enum(['needs', 'wants', 'savings']).nullable().default(null),
});

export const categoryQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
});

export const subcategorySchema = z.object({
  name: z.string().trim().min(1, 'El nombre de la subcategoría es obligatorio').max(60),
  unitAmount: z.coerce.number().positive('El monto debe ser mayor a 0').max(1_000_000_000_000),
  frequencyMonth: z.coerce.number().int().min(1, 'Mínimo 1 vez al mes').max(365).default(1),
  month: monthSchema.optional(),
  recordExpense: z.boolean().default(false),
});

export const subcategoryDeleteQuerySchema = z.object({
  month: monthSchema.optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
export type SubcategoryInput = z.infer<typeof subcategorySchema>;
