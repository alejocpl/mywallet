/**
 * Motor de recomendaciones financieras.
 * Genera mensajes accionables a partir del resumen del mes.
 * Cada regla es independiente: agregar una nueva es tan simple como sumar un `if`.
 */
import { FINANCE_RULES } from '../../config/finance';
import type { Budget, DistributionItem, Insight, MonthTotals } from '../../types';
import { formatMoney, percentOf } from '../../utils/money';

interface InsightContext {
  totals: MonthTotals;
  expensesChange: number | null;
  distribution: DistributionItem[];
  alerts: Budget[];
  hasBudgets: boolean;
  debtMonthlyPayments: number;
}

const MAX_INSIGHTS = 5;

export function buildInsights(ctx: InsightContext): Insight[] {
  const { totals, distribution, alerts } = ctx;
  const insights: Insight[] = [];
  const byKey = Object.fromEntries(distribution.map((d) => [d.key, d]));

  if (totals.income === 0 && totals.expenses === 0) {
    return [{ type: 'info', message: 'Aún no hay movimientos este mes. Empieza registrando tus ingresos.' }];
  }

  if (totals.available < 0) {
    insights.push({
      type: 'warning',
      message: `Este mes gastaste ${formatMoney(Math.abs(totals.available))} más de lo que ingresaste. Revisa tus gastos de "deseos".`,
    });
  }

  const exceeded = alerts.filter((a) => a.status === 'exceeded');
  if (exceeded.length > 0) {
    insights.push({
      type: 'warning',
      message: `Superaste ${exceeded.length} presupuesto(s): ${exceeded.map((a) => a.categoryName).join(', ')}.`,
    });
  }

  if (totals.income > 0) {
    const needs = byKey.needs;
    const wants = byKey.wants;
    const savingsRate = byKey.savings?.actualPercent ?? percentOf(totals.savings, totals.income);

    if (needs && needs.actualPercent > FINANCE_RULES.distribution.needs) {
      insights.push({
        type: 'warning',
        message: `Tus gastos esenciales son el ${needs.actualPercent}% de tus ingresos (recomendado: ${FINANCE_RULES.distribution.needs}%).`,
      });
    }
    if (wants && wants.actualPercent > FINANCE_RULES.distribution.wants) {
      insights.push({
        type: 'warning',
        message: `Tus gastos en deseos llegan al ${wants.actualPercent}%. Intenta mantenerlos por debajo del ${FINANCE_RULES.distribution.wants}%.`,
      });
    }
    if (savingsRate >= FINANCE_RULES.distribution.savings) {
      insights.push({
        type: 'success',
        message: `¡Excelente! Estás destinando el ${savingsRate}% de tus ingresos a ahorro e inversión.`,
      });
    } else {
      const target = (totals.income * FINANCE_RULES.distribution.savings) / 100;
      insights.push({
        type: 'info',
        message: `Intenta ahorrar al menos ${formatMoney(target)} al mes (${FINANCE_RULES.distribution.savings}% de tus ingresos).`,
      });
    }

    const debtRatio = percentOf(ctx.debtMonthlyPayments, totals.income);
    if (debtRatio > FINANCE_RULES.maxDebtToIncome) {
      insights.push({
        type: 'warning',
        message: `Tus cuotas de deuda representan el ${debtRatio}% de tus ingresos. Lo saludable es menos del ${FINANCE_RULES.maxDebtToIncome}%.`,
      });
    }
  }

  if (ctx.expensesChange !== null) {
    if (ctx.expensesChange > 15) {
      insights.push({ type: 'warning', message: `Tus gastos aumentaron ${ctx.expensesChange}% respecto al mes anterior.` });
    } else if (ctx.expensesChange < -10) {
      insights.push({
        type: 'success',
        message: `Redujiste tus gastos un ${Math.abs(ctx.expensesChange)}% respecto al mes anterior. ¡Sigue así!`,
      });
    }
  }

  if (!ctx.hasBudgets) {
    insights.push({ type: 'info', message: 'Crea presupuestos por categoría para recibir alertas antes de gastar de más.' });
  }

  // Prioriza advertencias, luego logros y por último información.
  const order = { warning: 0, success: 1, info: 2 } as const;
  return insights.sort((a, b) => order[a.type] - order[b.type]).slice(0, MAX_INSIGHTS);
}
