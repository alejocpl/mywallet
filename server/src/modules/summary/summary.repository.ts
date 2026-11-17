/**
 * Consultas agregadas para el dashboard, tendencias y comparaciones.
 */
import { db } from '../../db/connection';
import type { ExpenseGroup } from '../../types';
import { monthRange } from '../../utils/date';

export interface CategoryTotalRow {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  expenseGroup: ExpenseGroup | null;
  total: number;
}

export interface MonthlyTotalsRow {
  month: string;
  income: number;
  expenses: number;
}

export const summaryRepository = {
  totals(month: string): { income: number; expenses: number } {
    return db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expenses
         FROM transactions WHERE date BETWEEN ? AND ?`,
      )
      .get(...monthRange(month)) as { income: number; expenses: number };
  },

  expensesByCategory(month: string): CategoryTotalRow[] {
    return db
      .prepare(
        `SELECT c.id AS categoryId, c.name, c.color, c.icon, c.expense_group AS expenseGroup,
                SUM(t.amount) AS total
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
         GROUP BY c.id
         ORDER BY total DESC`,
      )
      .all(...monthRange(month)) as CategoryTotalRow[];
  },

  monthlyTotals(fromMonth: string, toMonth: string): MonthlyTotalsRow[] {
    return db
      .prepare(
        `SELECT substr(date, 1, 7) AS month,
                COALESCE(SUM(CASE WHEN type = 'income'  THEN amount END), 0) AS income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expenses
         FROM transactions
         WHERE date BETWEEN ? AND ?
         GROUP BY month`,
      )
      .all(`${fromMonth}-01`, `${toMonth}-31`) as MonthlyTotalsRow[];
  },

  monthlySavings(fromMonth: string, toMonth: string): { month: string; savings: number }[] {
    return db
      .prepare(
        `SELECT substr(date, 1, 7) AS month, COALESCE(SUM(amount), 0) AS savings
         FROM goal_contributions
         WHERE date BETWEEN ? AND ?
         GROUP BY month`,
      )
      .all(`${fromMonth}-01`, `${toMonth}-31`) as { month: string; savings: number }[];
  },

  debtTotals(): { totalRemaining: number; monthlyPayments: number; count: number } {
    return db
      .prepare(
        `SELECT COALESCE(SUM(remaining_amount), 0) AS totalRemaining,
                COALESCE(SUM(CASE WHEN remaining_amount > 0 THEN monthly_payment ELSE 0 END), 0) AS monthlyPayments,
                COUNT(CASE WHEN remaining_amount > 0 THEN 1 END) AS count
         FROM debts`,
      )
      .get() as { totalRemaining: number; monthlyPayments: number; count: number };
  },

  goalTotals(): { totalTarget: number; totalSaved: number; count: number } {
    return db
      .prepare(
        `SELECT COALESCE(SUM(target_amount), 0) AS totalTarget,
                COALESCE(SUM(current_amount), 0) AS totalSaved,
                COUNT(*) AS count
         FROM goals`,
      )
      .get() as { totalTarget: number; totalSaved: number; count: number };
  },
};
