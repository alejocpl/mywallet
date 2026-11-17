/**
 * Servicio de Onboarding:
 * Consulta si el usuario ya completó el cuestionario inicial y transforma sus
 * respuestas en ingresos, gastos, presupuestos mensuales, deudas y metas.
 */
import { db } from '../../db/connection';
import { currentMonth, shiftMonth, today } from '../../utils/date';
import { HttpError } from '../../utils/httpError';
import { formatMoney, round2 } from '../../utils/money';
import type { OnboardingInput } from './onboarding.schema';

export interface OnboardingStatus {
  completed: boolean;
  hasData: boolean;
}

interface ExpenseFieldMapping {
  key: keyof OnboardingInput['expenses'];
  categoryName: string;
  description: string;
  fixed: boolean;
  isEssential: boolean;
  isVariable: boolean;
}

const EXPENSE_MAPPINGS: ExpenseFieldMapping[] = [
  { key: 'housing', categoryName: 'Vivienda', description: 'Vivienda / alquiler mensual', fixed: true, isEssential: true, isVariable: false },
  { key: 'food', categoryName: 'Alimentación', description: 'Alimentación mensual', fixed: false, isEssential: true, isVariable: true },
  { key: 'transport', categoryName: 'Transporte', description: 'Transporte y movilidad', fixed: false, isEssential: true, isVariable: true },
  { key: 'utilities', categoryName: 'Servicios', description: 'Servicios del hogar e internet', fixed: true, isEssential: true, isVariable: true },
  { key: 'health', categoryName: 'Salud', description: 'Salud y seguro médico', fixed: false, isEssential: true, isVariable: false },
  { key: 'education', categoryName: 'Educación', description: 'Educación y formación', fixed: false, isEssential: true, isVariable: false },
  { key: 'leisure', categoryName: 'Ocio', description: 'Ocio y entretenimiento', fixed: false, isEssential: false, isVariable: false },
  { key: 'dining', categoryName: 'Restaurantes', description: 'Restaurantes y salidas', fixed: false, isEssential: false, isVariable: false },
  { key: 'subscriptions', categoryName: 'Suscripciones', description: 'Suscripciones mensuales', fixed: true, isEssential: false, isVariable: false },
  { key: 'shopping', categoryName: 'Compras', description: 'Compras personales', fixed: false, isEssential: false, isVariable: false },
  { key: 'investments', categoryName: 'Inversiones', description: 'Inversiones mensuales', fixed: false, isEssential: false, isVariable: false },
];

function setSetting(key: string, value: string): void {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(key, value);
}

function clearFinancialTables(): void {
  db.exec(`
    DELETE FROM essential_payments;
    DELETE FROM essential_plans;
    DELETE FROM debt_payments;
    DELETE FROM debts;
    DELETE FROM goal_contributions;
    DELETE FROM goals;
    DELETE FROM budgets;
    DELETE FROM subcategories;
    DELETE FROM transactions;
  `);
}

export const onboardingService = {
  getStatus(): OnboardingStatus {
    const setting = db
      .prepare("SELECT value FROM app_settings WHERE key = 'onboarding_completed'")
      .get() as { value: string } | undefined;

    const counts = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM transactions) +
           (SELECT COUNT(*) FROM budgets) +
           (SELECT COUNT(*) FROM goals) +
           (SELECT COUNT(*) FROM debts) AS total`,
      )
      .get() as { total: number };

    const hasData = counts.total > 0;
    const completed = setting?.value === '1';
    return { completed, hasData };
  },

  completeOnboarding(input: OnboardingInput): { status: 'ok'; month: string } {
    if (onboardingService.getStatus().completed) {
      throw new HttpError(
        409,
        'La encuesta inicial ya fue completada y está bloqueada para proteger tus datos.',
      );
    }

    const month = input.month ?? currentMonth();
    const nowDate = today();
    const txDate = nowDate.startsWith(month) ? nowDate : `${month}-01`;
    const prevMonthEnd = `${shiftMonth(month, -1)}-28`;

    const categoryRows = db.prepare('SELECT id, name, type FROM categories').all() as {
      id: number;
      name: string;
      type: 'income' | 'expense';
    }[];

    const findCategoryId = (name: string, type: 'income' | 'expense'): number => {
      const match = categoryRows.find((c) => c.name === name && c.type === type);
      if (match) return match.id;
      const fallback = categoryRows.find((c) => c.type === type);
      if (!fallback) throw new Error(`No existe categoría para ${name}`);
      return fallback.id;
    };

    const run = db.transaction(() => {
      if (input.resetExisting) {
        clearFinancialTables();
      }

      const insertTx = db.prepare(
        `INSERT INTO transactions (type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)`,
      );
      const upsertBudget = db.prepare(
        `INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)
         ON CONFLICT (category_id, month) DO UPDATE SET amount = excluded.amount`,
      );
      const upsertSubcategory = db.prepare(
        `INSERT INTO subcategories (category_id, name, unit_amount, frequency_month)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (category_id, name) DO UPDATE
         SET unit_amount = excluded.unit_amount, frequency_month = excluded.frequency_month`,
      );
      const insertEssentialPlan = db.prepare(
        `INSERT INTO essential_plans (category_id, unit_amount, frequency_month, is_variable)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (category_id) DO UPDATE SET
           unit_amount = excluded.unit_amount,
           frequency_month = excluded.frequency_month,
           is_variable = excluded.is_variable`,
      );
      const findEssentialPlanId = db.prepare(`SELECT id FROM essential_plans WHERE category_id = ?`);
      const insertEssentialPayment = db.prepare(
        `INSERT INTO essential_payments
           (plan_id, category_id, month, installment_num, expected_amount, paid_amount, checked, checked_at, transaction_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      // 1. Ingresos
      if (input.incomes.salary > 0) {
        insertTx.run(
          'income',
          round2(input.incomes.salary),
          findCategoryId('Salario', 'income'),
          'Sueldo mensual',
          txDate,
        );
      }
      if (input.incomes.hasFreelance && input.incomes.freelance > 0) {
        insertTx.run(
          'income',
          round2(input.incomes.freelance),
          findCategoryId('Freelance', 'income'),
          'Ingresos como freelancer',
          txDate,
        );
      }
      if (input.incomes.hasOtherIncome && input.incomes.otherIncome > 0) {
        insertTx.run(
          'income',
          round2(input.incomes.otherIncome),
          findCategoryId('Otros ingresos', 'income'),
          input.incomes.otherIncomeDescription || 'Otros ingresos',
          txDate,
        );
      }

      // 2. Gastos, pagos esenciales (checklist), subcategorías y presupuestos
      for (const mapping of EXPENSE_MAPPINGS) {
        const categoryId = findCategoryId(mapping.categoryName, 'expense');
        const subs = input.subcategories?.[mapping.key] ?? [];

        // Guardar subcategorías si existen y calcular su suma
        let subSum = 0;
        if (subs.length > 0) {
          for (const sub of subs) {
            const unit = round2(sub.unitAmount);
            subSum += round2(unit * sub.frequencyMonth);
            upsertSubcategory.run(categoryId, sub.name, unit, sub.frequencyMonth);
          }
          subSum = round2(subSum);
        }

        if (mapping.isEssential) {
          const plan = input.essentialPlans?.[mapping.key];
          const unitAmount =
            subs.length > 0
              ? subSum
              : plan && plan.unitAmount > 0
                ? round2(plan.unitAmount)
                : round2(input.expenses[mapping.key]);
          const frequencyMonth = subs.length > 0 ? 1 : Math.max(1, plan?.frequencyMonth ?? 1);

          if (unitAmount <= 0) continue;

          const monthlyTotal = round2(unitAmount * frequencyMonth);
          upsertBudget.run(categoryId, month, monthlyTotal);

          insertEssentialPlan.run(
            categoryId,
            unitAmount,
            frequencyMonth,
            mapping.isVariable ? 1 : 0,
          );
          const planRow = findEssentialPlanId.get(categoryId) as { id: number };
          const paidCount = Math.min(frequencyMonth, Math.max(0, plan?.paidCount ?? 0));

          for (let i = 1; i <= frequencyMonth; i++) {
            if (i <= paidCount) {
              const paidAmt =
                plan?.paidAmountOverride && plan.paidAmountOverride > 0
                  ? round2(plan.paidAmountOverride)
                  : unitAmount;
              const desc =
                frequencyMonth > 1
                  ? `${mapping.categoryName} (Pago ${i}/${frequencyMonth})`
                  : `${mapping.categoryName} (Pago mensual)`;
              const txRes = insertTx.run('expense', paidAmt, categoryId, desc, txDate);
              insertEssentialPayment.run(
                planRow.id,
                categoryId,
                month,
                i,
                unitAmount,
                paidAmt,
                1,
                new Date().toISOString(),
                txRes.lastInsertRowid,
              );
            } else {
              insertEssentialPayment.run(
                planRow.id,
                categoryId,
                month,
                i,
                unitAmount,
                null,
                0,
                null,
                null,
              );
            }
          }
          continue;
        }

        // Categorías de estilo de vida
        const shouldRecordTx =
          input.expenseRecordingMode === 'all' ||
          (input.expenseRecordingMode === 'fixed_only' && mapping.fixed);

        if (subs.length > 0) {
          for (const sub of subs) {
            const unit = round2(sub.unitAmount);
            const subTotal = round2(unit * sub.frequencyMonth);
            if (shouldRecordTx && subTotal > 0) {
              const desc =
                sub.frequencyMonth > 1
                  ? `${sub.name} (${sub.frequencyMonth} veces/mes × ${formatMoney(unit)})`
                  : sub.name;
              insertTx.run('expense', subTotal, categoryId, desc, txDate);
            }
          }
          if (subSum > 0) {
            upsertBudget.run(categoryId, month, subSum);
          }
        } else {
          const amount = round2(input.expenses[mapping.key]);
          if (amount <= 0) continue;

          upsertBudget.run(categoryId, month, amount);
          if (shouldRecordTx) {
            insertTx.run('expense', amount, categoryId, mapping.description, txDate);
          }
        }
      }

      // 3. Deudas
      if (input.hasDebts && input.debts.length > 0) {
        const insertDebt = db.prepare(
          `INSERT INTO debts (name, creditor, total_amount, remaining_amount, interest_rate, monthly_payment, due_day)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );

        let totalMonthlyDebtPayment = 0;
        for (const d of input.debts) {
          const remaining = round2(d.remainingAmount ?? d.totalAmount);
          insertDebt.run(
            d.name,
            d.creditor,
            round2(d.totalAmount),
            remaining,
            round2(d.interestRate),
            round2(d.monthlyPayment),
            d.dueDay,
          );
          if (remaining > 0) {
            totalMonthlyDebtPayment += d.monthlyPayment;
          }
        }

        if (totalMonthlyDebtPayment > 0) {
          upsertBudget.run(
            findCategoryId('Deudas', 'expense'),
            month,
            round2(totalMonthlyDebtPayment),
          );
        }
      }

      // 4. Metas de ahorro
      if (input.hasGoals && input.goals.length > 0) {
        const insertGoal = db.prepare(
          `INSERT INTO goals (name, target_amount, current_amount, deadline, icon, color)
           VALUES (?, ?, ?, ?, ?, ?)`,
        );
        const insertContribution = db.prepare(
          `INSERT INTO goal_contributions (goal_id, amount, date, note) VALUES (?, ?, ?, ?)`,
        );

        for (const g of input.goals) {
          const initialSaved = round2(g.currentSaved);
          const monthlyPlan = round2(g.monthlyContribution);
          const currentTotal = round2(initialSaved + monthlyPlan);

          const res = insertGoal.run(
            g.name,
            round2(g.targetAmount),
            currentTotal,
            g.deadline ?? null,
            g.icon,
            g.color,
          );
          const goalId = Number(res.lastInsertRowid);

          if (initialSaved > 0) {
            insertContribution.run(goalId, initialSaved, prevMonthEnd, 'Ahorro previo acumulado');
          }
          if (monthlyPlan > 0) {
            insertContribution.run(goalId, monthlyPlan, txDate, 'Aporte mensual planificado');
          }
        }
      }

      setSetting('onboarding_completed', '1');
    });

    run();
    return { status: 'ok', month };
  },

  skipOnboarding(): { status: 'ok' } {
    setSetting('onboarding_completed', '1');
    return { status: 'ok' };
  },

  resetAllData(): { status: 'ok' } {
    const run = db.transaction(() => {
      clearFinancialTables();
      setSetting('onboarding_completed', '0');
    });
    run();
    return { status: 'ok' };
  },
};
