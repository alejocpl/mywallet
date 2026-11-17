/**
 * Lógica de negocio de deudas.
 * - Calcula progreso, intereses mensuales y meses estimados para liquidar.
 * - Sugiere qué deuda priorizar con el método "avalancha" (mayor tasa primero),
 *   que minimiza el total de intereses pagados.
 */
import { DEBT_CATEGORY_NAME } from '../../config/finance';
import type { Budget, Debt, DebtsOverview } from '../../types';
import { badRequest, notFound } from '../../utils/httpError';
import { percentOf, round2 } from '../../utils/money';
import { budgetsService } from '../budgets/budgets.service';
import { categoriesRepository } from '../categories/categories.repository';
import { debtsRepository, type DebtRow } from './debts.repository';
import type { DebtInput, PaymentInput } from './debts.schema';

function enrich(row: DebtRow): Debt {
  const paidAmount = round2(row.totalAmount - row.remainingAmount);
  const monthlyInterest = round2((row.remainingAmount * row.interestRate) / 100 / 12);
  const paymentCoversInterest = row.monthlyPayment > monthlyInterest || row.remainingAmount === 0;

  let monthsToPayoff: number | null = null;
  if (row.remainingAmount === 0) monthsToPayoff = 0;
  else if (row.monthlyPayment > 0 && paymentCoversInterest) {
    // Fórmula de amortización: n = -log(1 - r·P/A) / log(1 + r)
    const r = row.interestRate / 100 / 12;
    monthsToPayoff =
      r === 0
        ? Math.ceil(row.remainingAmount / row.monthlyPayment)
        : Math.ceil(-Math.log(1 - (r * row.remainingAmount) / row.monthlyPayment) / Math.log(1 + r));
  }

  return {
    ...row,
    paidAmount,
    progress: percentOf(paidAmount, row.totalAmount),
    monthsToPayoff,
    monthlyInterest,
    paymentCoversInterest,
  };
}

/** Obtiene (o crea si fue eliminada) la categoría usada para pagos de deudas. */
function getDebtCategoryId(): number {
  const existing = categoriesRepository.findByName(DEBT_CATEGORY_NAME, 'expense');
  if (existing) return existing.id;
  return categoriesRepository.create({
    name: DEBT_CATEGORY_NAME,
    type: 'expense',
    icon: 'credit-card',
    color: '#DC2626',
    expenseGroup: 'needs',
  }).id;
}

export const debtsService = {
  list(): DebtsOverview {
    const items = debtsRepository.findAll().map(enrich);
    const active = items.filter((d) => d.remainingAmount > 0);
    const priority = [...active].sort((a, b) => b.interestRate - a.interestRate || a.remainingAmount - b.remainingAmount)[0];

    return {
      items,
      totals: {
        totalDebt: round2(items.reduce((s, d) => s + d.totalAmount, 0)),
        totalRemaining: round2(items.reduce((s, d) => s + d.remainingAmount, 0)),
        monthlyPayments: round2(active.reduce((s, d) => s + d.monthlyPayment, 0)),
      },
      priorityDebtId: priority?.id ?? null,
    };
  },

  getById(id: number): Debt {
    const row = debtsRepository.findById(id);
    if (!row) throw notFound('Deuda');
    return enrich(row);
  },

  create(data: DebtInput): Debt {
    return enrich(debtsRepository.create(data));
  },

  update(id: number, data: DebtInput): Debt {
    debtsService.getById(id);
    return enrich(debtsRepository.update(id, data));
  },

  remove(id: number): void {
    if (!debtsRepository.delete(id)) throw notFound('Deuda');
  },

  pay(id: number, payment: PaymentInput): { debt: Debt; alert: Budget | null } {
    const debt = debtsService.getById(id);
    if (debt.remainingAmount === 0) throw badRequest('Esta deuda ya está saldada');
    if (payment.amount > debt.remainingAmount + 0.01) {
      throw badRequest('El pago supera el saldo pendiente');
    }

    const categoryId = getDebtCategoryId();
    debtsRepository.registerPayment(id, payment, categoryId, `Pago: ${debt.name}`);

    const budget = budgetsService.getStatusForCategory(categoryId, payment.date.slice(0, 7));
    return {
      debt: debtsService.getById(id),
      alert: budget && budget.status !== 'ok' ? budget : null,
    };
  },
};
