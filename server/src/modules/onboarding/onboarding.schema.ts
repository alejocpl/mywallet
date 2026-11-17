/**
 * Esquema de validación (Zod) para el cuestionario inicial (Onboarding).
 * Recoge ingresos, gastos/presupuestos, deudas y metas de ahorro del usuario.
 */
import { z } from 'zod';
import { dateSchema, monthSchema } from '../../utils/validation';

const nonNegativeMoney = z.coerce.number().min(0, 'El monto no puede ser negativo').max(1_000_000_000_000);
const positiveMoney = z.coerce.number().positive('El monto debe ser mayor a 0').max(1_000_000_000_000);

const optionalDeadline = z
  .union([dateSchema, z.literal('')])
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const onboardingDebtSchema = z
  .object({
    name: z.string().trim().min(1, 'Ingresa el nombre de la deuda').max(60),
    creditor: z.string().trim().max(60).default(''),
    totalAmount: positiveMoney,
    remainingAmount: nonNegativeMoney.optional(),
    interestRate: z.coerce.number().min(0).max(1000).default(0),
    monthlyPayment: nonNegativeMoney.default(0),
    dueDay: z.coerce
      .number()
      .int()
      .min(1)
      .max(31)
      .nullable()
      .optional()
      .transform((d) => d ?? null),
  })
  .refine((d) => (d.remainingAmount ?? d.totalAmount) <= d.totalAmount, {
    message: 'El saldo pendiente de una deuda no puede superar su monto total',
    path: ['remainingAmount'],
  });

const onboardingGoalSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la meta').max(60),
  targetAmount: positiveMoney,
  currentSaved: nonNegativeMoney.default(0),
  monthlyContribution: nonNegativeMoney.default(0),
  deadline: optionalDeadline,
  icon: z.string().trim().max(40).default('piggy-bank'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#2563EB'),
});

export const onboardingSubcategorySchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la subcategoría').max(60),
  unitAmount: positiveMoney,
  frequencyMonth: z.coerce.number().int().min(1, 'Mínimo 1 vez al mes').max(365).default(1),
});

export const onboardingEssentialItemSchema = z.object({
  unitAmount: nonNegativeMoney.default(0),
  frequencyMonth: z.coerce.number().int().min(1).max(31).default(1),
  paidCount: z.coerce.number().int().min(0).max(31).default(0),
  paidAmountOverride: nonNegativeMoney.optional(),
});

export const onboardingSchema = z.object({
  month: monthSchema.optional(),
  resetExisting: z.boolean().default(true),
  expenseRecordingMode: z.enum(['all', 'fixed_only', 'budgets_only']).default('all'),
  incomes: z.object({
    salary: nonNegativeMoney.default(0),
    hasFreelance: z.boolean().default(false),
    freelance: nonNegativeMoney.default(0),
    hasOtherIncome: z.boolean().default(false),
    otherIncome: nonNegativeMoney.default(0),
    otherIncomeDescription: z.string().trim().max(100).default('Otros ingresos'),
  }),
  expenses: z.object({
    housing: nonNegativeMoney.default(0),
    food: nonNegativeMoney.default(0),
    transport: nonNegativeMoney.default(0),
    utilities: nonNegativeMoney.default(0),
    health: nonNegativeMoney.default(0),
    education: nonNegativeMoney.default(0),
    leisure: nonNegativeMoney.default(0),
    dining: nonNegativeMoney.default(0),
    subscriptions: nonNegativeMoney.default(0),
    shopping: nonNegativeMoney.default(0),
    investments: nonNegativeMoney.default(0),
  }),
  subcategories: z.record(z.string(), z.array(onboardingSubcategorySchema)).default({}),
  essentialPlans: z.record(z.string(), onboardingEssentialItemSchema).default({}),
  hasDebts: z.boolean().default(false),
  debts: z.array(onboardingDebtSchema).default([]),
  hasGoals: z.boolean().default(false),
  goals: z.array(onboardingGoalSchema).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
