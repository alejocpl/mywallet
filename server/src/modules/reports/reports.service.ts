/**
 * Reúne toda la información necesaria para generar un reporte mensual.
 * Los generadores (PDF / Excel) solo se encargan de la presentación.
 */
import type { BudgetsOverview, DebtsOverview, Goal, MonthSummary, Transaction, TrendPoint } from '../../types';
import { budgetsService } from '../budgets/budgets.service';
import { debtsService } from '../debts/debts.service';
import { goalsService } from '../goals/goals.service';
import { summaryService } from '../summary/summary.service';
import { transactionsService } from '../transactions/transactions.service';

export interface ReportData {
  month: string;
  label: string;
  generatedAt: Date;
  summary: MonthSummary;
  transactions: Transaction[];
  budgets: BudgetsOverview;
  goals: Goal[];
  debts: DebtsOverview;
  trend: TrendPoint[];
}

export const reportsService = {
  buildData(month: string): ReportData {
    const summary = summaryService.getMonth(month);
    return {
      month,
      label: summary.label,
      generatedAt: new Date(),
      summary,
      transactions: transactionsService.list({ month, limit: 2000 }),
      budgets: budgetsService.listByMonth(month),
      goals: goalsService.list(),
      debts: debtsService.list(),
      trend: summaryService.getTrend(month),
    };
  },
};
