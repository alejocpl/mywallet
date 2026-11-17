import { z } from 'zod';
import { amountSchema, dateSchema, optionalDateSchema } from '../../utils/validation';

export const goalSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60),
  targetAmount: amountSchema,
  deadline: dateSchema.nullable().optional().transform((d) => d ?? null),
  icon: z.string().trim().max(40).default('piggy-bank'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2563EB'),
});

export const contributionSchema = z.object({
  /** Positivo = aporte, negativo = retiro. */
  amount: z.coerce
    .number()
    .refine((n) => n !== 0, 'El monto no puede ser 0')
    .refine((n) => Math.abs(n) <= 1_000_000_000_000, 'Monto demasiado grande'),
  date: optionalDateSchema,
  note: z.string().trim().max(120).default(''),
});

export type GoalInput = z.infer<typeof goalSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
