/**
 * Servicio de resumen y analítica:
 *  - getMonth:      dashboard del mes ("¿Cuánto me queda?")
 *  - getTrend:      evolución de los últimos N meses
 *  - getComparison: mes actual vs mes anterior por categoría
 */
import { FINANCE_RULES } from '../../config/finance';
import type {
  CategoryComparison,
  DistributionItem,
  ExpenseGroup,
  MonthComparison,
  MonthSummary,
  MonthTotals,
  TrendPoint,
} from '../../types';
import { monthLabel, remainingDaysInMonth, shiftMonth, shortMonthLabel } from '../../utils/date';
import { percentChange, percentOf, round2 } from '../../utils/money';
import { budgetsService } from '../budgets/budgets.service';
import { goalsRepository } from '../goals/goals.repository';
import { buildInsights } from './summary.insights';
import { summaryRepository } from './summary.repository';

const GROUP_LABELS: Record<ExpenseGroup, string> = {
  needs: 'Necesidades',
  wants: 'Deseos',
  savings: 'Ahorro',
};

/** Ingresos, gastos, ahorro y disponible de un mes. */
function getMonthTotals(month: string): MonthTotals {
  const { income, expenses } = summaryRepository.totals(month);
  const savings = goalsRepository.sumContributionsByMonth(month);
  return {
    income: round2(income),
    expenses: round2(expenses),
    savings: round2(savings),
    available: round2(income - expenses - savings),
  };
}

export const summaryService = {
  getMonthTotals,

  getMonth(month: string): MonthSummary {
    const totals = getMonthTotals(month);
    const previousMonth = shiftMonth(month, -1);
    const previous = getMonthTotals(previousMonth);
    const budgets = budgetsService.listByMonth(month);

    // --- Gastos por categoría ---
    const categoryRows = summaryRepository.expensesByCategory(month);
    const expensesByCategory = categoryRows.map((c) => ({
      ...c,
      total: round2(c.total),
      percentage: percentOf(c.total, totals.expenses),
    }));

    // --- Distribución 50/30/20 ---
    const actualByGroup: Record<ExpenseGroup, number> = { needs: 0, wants: 0, savings: totals.savings };
    for (const c of categoryRows) actualByGroup[c.expenseGroup ?? 'wants'] += c.total;

    const distribution: DistributionItem[] = (Object.keys(GROUP_LABELS) as ExpenseGroup[]).map((key) => ({
      key,
      label: GROUP_LABELS[key],
      recommendedPercent: FINANCE_RULES.distribution[key],
      recommended: round2((totals.income * FINANCE_RULES.distribution[key]) / 100),
      actual: round2(actualByGroup[key]),
      actualPercent: percentOf(actualByGroup[key], totals.income),
    }));

    // --- ¿Cuánto me queda por día? ---
    const daysLeft = remainingDaysInMonth(month);
    const dailyAllowance = daysLeft > 0 ? round2(Math.max(0, totals.available) / daysLeft) : null;

    const debts = summaryRepository.debtTotals();
    const goals = summaryRepository.goalTotals();
    const changes = {
      income: percentChange(totals.income, previous.income),
      expenses: percentChange(totals.expenses, previous.expenses),
      savings: percentChange(totals.savings, previous.savings),
      available: percentChange(totals.available, previous.available),
    };

    return {
      month,
      label: monthLabel(month),
      totals: {
        ...totals,
        budgeted: budgets.totals.budgeted,
        budgetRemaining: budgets.totals.remaining,
      },
      previous: { ...previous, month: previousMonth },
      changes,
      daysLeft,
      dailyAllowance,
      expensesByCategory,
      distribution,
      alerts: budgets.alerts,
      debts: {
        totalRemaining: round2(debts.totalRemaining),
        monthlyPayments: round2(debts.monthlyPayments),
        count: debts.count,
      },
      goals: { totalTarget: round2(goals.totalTarget), totalSaved: round2(goals.totalSaved), count: goals.count },
      insights: buildInsights({
        totals,
        expensesChange: changes.expenses,
        distribution,
        alerts: budgets.alerts,
        hasBudgets: budgets.items.length > 0,
        debtMonthlyPayments: debts.monthlyPayments,
      }),
    };
  },

  getTrend(endMonth: string, months: number = FINANCE_RULES.trendMonths): TrendPoint[] {
    const startMonth = shiftMonth(endMonth, -(months - 1));
    const totals = new Map(summaryRepository.monthlyTotals(startMonth, endMonth).map((r) => [r.month, r]));
    const savings = new Map(summaryRepository.monthlySavings(startMonth, endMonth).map((r) => [r.month, r.savings]));

    return Array.from({ length: months }, (_, i) => {
      const month = shiftMonth(startMonth, i);
      const income = totals.get(month)?.income ?? 0;
      const expenses = totals.get(month)?.expenses ?? 0;
      const saved = savings.get(month) ?? 0;
      return {
        month,
        label: shortMonthLabel(month),
        income: round2(income),
        expenses: round2(expenses),
        savings: round2(saved),
        balance: round2(income - expenses - saved),
      };
    });
  },

  getComparison(month: string): MonthComparison {
    const previousMonth = shiftMonth(month, -1);
    const current = summaryRepository.expensesByCategory(month);
    const previous = summaryRepository.expensesByCategory(previousMonth);

    const map = new Map<number, CategoryComparison>();
    for (const c of current) {
      map.set(c.categoryId, { categoryId: c.categoryId, name: c.name, color: c.color, icon: c.icon, current: c.total, previous: 0, diff: 0, change: null });
    }
    for (const p of previous) {
      const item = map.get(p.categoryId) ?? { categoryId: p.categoryId, name: p.name, color: p.color, icon: p.icon, current: 0, previous: 0, diff: 0, change: null };
      item.previous = p.total;
      map.set(p.categoryId, item);
    }

    const categories = [...map.values()]
      .map((c) => ({
        ...c,
        current: round2(c.current),
        previous: round2(c.previous),
        diff: round2(c.current - c.previous),
        change: percentChange(c.current, c.previous),
      }))
      .sort((a, b) => b.current - a.current);

    return {
      current: { ...getMonthTotals(month), month, label: monthLabel(month) },
      previous: { ...getMonthTotals(previousMonth), month: previousMonth, label: monthLabel(previousMonth) },
      categories,
    };
  },
};
