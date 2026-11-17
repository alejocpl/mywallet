import { z } from 'zod';

export const checkPaymentSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: 'El monto pagado debe ser numérico' })
    .positive('El monto pagado debe ser mayor a 0')
    .max(1_000_000_000_000)
    .optional(),
});

export type CheckPaymentInput = z.infer<typeof checkPaymentSchema>;
