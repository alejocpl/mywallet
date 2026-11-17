/**
 * Lógica de negocio de presupuestos: estados, totales y alertas.
 */
import { FINANCE_RULES } from '../../config/finance';
import type { Budget, BudgetStatusLevel, BudgetsOverview } from '../../types';
import { shiftMonth } from '../../utils/date';
import { badRequest, notFound } from '../../utils/httpError';
import { percentOf, round2 } from '../../utils/money';
import { categoriesRepository } from '../categories/categories.repository';
import { categoriesService } from '../categories/categories.service';
import { budgetsRepository, type BudgetRow } from './budgets.repository';
import type { BudgetInput } from './budgets.schema';

/** Determina el estado de un presupuesto según su % de uso. */
export function computeBudgetStatus(spent: number, amount: number): BudgetStatusLevel {
  if (spent > amount) return 'exceeded';
  if (percentOf(spent, amount) >= FINANCE_RULES.budgetWarningThreshold) return 'warning';
  return 'ok';
}

function enrich(row: BudgetRow): Budget {
  const subcategories = categoriesRepository.findSubcategoriesByCategory(row.categoryId);
  const subcategoriesTotal = round2(subcategories.reduce((sum, s) => sum + s.monthlyTotal, 0));
  return {
    ...row,
    spent: round2(row.spent),
    remaining: round2(row.amount - row.spent),
    percentage: percentOf(row.spent, row.amount),
    status: computeBudgetStatus(row.spent, row.amount),
    subcategories,
    subcategoriesTotal,
  };
}

export const budgetsService = {
  listByMonth(month: string): BudgetsOverview {
    const items = budgetsRepository.findByMonth(month).map(enrich);
    const budgeted = round2(items.reduce((sum, b) => sum + b.amount, 0));
    const spent = round2(items.reduce((sum, b) => sum + b.spent, 0));
    return {
      month,
      items,
      totals: { budgeted, spent, remaining: round2(budgeted - spent), percentage: percentOf(spent, budgeted) },
      alerts: items.filter((b) => b.status !== 'ok'),
    };
  },

  getStatusForCategory(categoryId: number, month: string): Budget | null {
    const row = budgetsRepository.findByCategoryAndMonth(categoryId, month);
    return row ? enrich(row) : null;
  },

  upsert(input: BudgetInput): Budget {
    const category = categoriesService.getById(input.categoryId);
    if (category.type !== 'expense') throw badRequest('Solo se pueden presupuestar categorías de gasto');
    return enrich(budgetsRepository.upsert(input.categoryId, input.month, input.amount));
  },

  updateAmount(id: number, amount: number): Budget {
    if (!budgetsRepository.findById(id)) throw notFound('Presupuesto');
    return enrich(budgetsRepository.updateAmount(id, amount));
  },

  remove(id: number): void {
    if (!budgetsRepository.delete(id)) throw notFound('Presupuesto');
  },

  copy(toMonth: string, fromMonth?: string): { copied: number; fromMonth: string } {
    const source = fromMonth ?? shiftMonth(toMonth, -1);
    return { copied: budgetsRepository.copy(source, toMonth), fromMonth: source };
  },
};
