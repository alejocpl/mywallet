import { z } from 'zod';
import { amountSchema, optionalDateSchema } from '../../utils/validation';

export const debtSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(60),
    creditor: z.string().trim().max(60).default(''),
    totalAmount: amountSchema,
    /** Si no se envía, se asume que no se ha pagado nada. */
    remainingAmount: z.coerce.number().min(0).optional(),
    interestRate: z.coerce.number().min(0).max(1000).default(0),
    monthlyPayment: z.coerce.number().min(0).default(0),
    dueDay: z.coerce.number().int().min(1).max(31).nullable().optional().transform((d) => d ?? null),
  })
  .transform((d) => ({ ...d, remainingAmount: d.remainingAmount ?? d.totalAmount }))
  .refine((d) => d.remainingAmount <= d.totalAmount, {
    message: 'El saldo pendiente no puede ser mayor al total',
    path: ['remainingAmount'],
  });

export const paymentSchema = z.object({
  amount: amountSchema,
  date: optionalDateSchema,
});

export type DebtInput = z.infer<typeof debtSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
