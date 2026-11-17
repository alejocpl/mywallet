/**
 * Servicio de Pagos Esenciales (Checklist mensual):
 * - Genera automáticamente las cuotas pendientes de cada mes según la frecuencia
 *   configurada (Vivienda, Salud, Alimentación, Servicios, Transporte, Educación).
 * - Permite hacer check una sola vez por pago; una vez marcado, queda bloqueado.
 * - Al marcar como pagado, crea el movimiento de gasto real en `transactions`
 *   y evalúa si el presupuesto de la categoría generó alerta.
 */
import { db } from '../../db/connection';
import type { Budget, EssentialCategoryChecklist, EssentialPaymentItem } from '../../types';
import { today } from '../../utils/date';
import { HttpError, notFound } from '../../utils/httpError';
import { round2 } from '../../utils/money';
import { budgetsService } from '../budgets/budgets.service';

interface PlanRow {
  planId: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  unitAmount: number;
  frequencyMonth: number;
  isVariable: number;
}

interface PaymentRow {
  id: number;
  planId: number;
  categoryId: number;
  month: string;
  installmentNum: number;
  expectedAmount: number;
  paidAmount: number | null;
  checked: number;
  checkedAt: string | null;
}

interface PaymentJoinRow extends PaymentRow {
  categoryName: string;
  frequencyMonth: number;
  isVariable: number;
}

export const essentialsService = {
  listByMonth(month: string): EssentialCategoryChecklist[] {
    const plans = db
      .prepare(
        `SELECT ep.id AS planId, ep.category_id AS categoryId,
                c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor,
                ep.unit_amount AS unitAmount, ep.frequency_month AS frequencyMonth,
                ep.is_variable AS isVariable
         FROM essential_plans ep
         JOIN categories c ON c.id = ep.category_id
         ORDER BY ep.id`,
      )
      .all() as PlanRow[];

    if (plans.length === 0) return [];

    // Garantiza que el mes consultado tenga todas sus cuotas generadas y su presupuesto base.
    const ensurePayments = db.transaction(() => {
      const insertPayment = db.prepare(
        `INSERT OR IGNORE INTO essential_payments
           (plan_id, category_id, month, installment_num, expected_amount)
         VALUES (?, ?, ?, ?, ?)`,
      );
      const ensureBudget = db.prepare(
        `INSERT OR IGNORE INTO budgets (category_id, month, amount) VALUES (?, ?, ?)`,
      );

      for (const plan of plans) {
        for (let i = 1; i <= plan.frequencyMonth; i++) {
          insertPayment.run(plan.planId, plan.categoryId, month, i, plan.unitAmount);
        }
        ensureBudget.run(
          plan.categoryId,
          month,
          round2(plan.unitAmount * plan.frequencyMonth),
        );
      }
    });
    ensurePayments();

    const paymentRows = db
      .prepare(
        `SELECT id, plan_id AS planId, category_id AS categoryId, month,
                installment_num AS installmentNum, expected_amount AS expectedAmount,
                paid_amount AS paidAmount, checked, checked_at AS checkedAt
         FROM essential_payments
         WHERE month = ?
         ORDER BY plan_id, installment_num`,
      )
      .all(month) as PaymentRow[];

    const byPlan = new Map<number, EssentialPaymentItem[]>();
    for (const r of paymentRows) {
      const item: EssentialPaymentItem = {
        ...r,
        checked: r.checked === 1,
      };
      const list = byPlan.get(r.planId);
      if (list) list.push(item);
      else byPlan.set(r.planId, [item]);
    }

    return plans.map((plan) => {
      const payments = byPlan.get(plan.planId) ?? [];
      const paidCount = payments.filter((p) => p.checked).length;
      const totalPaidAmount = round2(
        payments.reduce((sum, p) => sum + (p.checked ? (p.paidAmount ?? p.expectedAmount) : 0), 0),
      );
      return {
        planId: plan.planId,
        categoryId: plan.categoryId,
        categoryName: plan.categoryName,
        categoryIcon: plan.categoryIcon,
        categoryColor: plan.categoryColor,
        unitAmount: round2(plan.unitAmount),
        frequencyMonth: plan.frequencyMonth,
        monthlyTotal: round2(plan.unitAmount * plan.frequencyMonth),
        isVariable: plan.isVariable === 1,
        paidCount,
        totalPaidAmount,
        allChecked: payments.length > 0 && paidCount === payments.length,
        payments,
      };
    });
  },

  checkPayment(
    paymentId: number,
    customAmount?: number,
  ): { checklist: EssentialCategoryChecklist[]; alert: Budget | null } {
    const row = db
      .prepare(
        `SELECT p.id, p.plan_id AS planId, p.category_id AS categoryId, p.month,
                p.installment_num AS installmentNum, p.expected_amount AS expectedAmount,
                p.paid_amount AS paidAmount, p.checked, p.checked_at AS checkedAt,
                c.name AS categoryName, ep.frequency_month AS frequencyMonth,
                ep.is_variable AS isVariable
         FROM essential_payments p
         JOIN essential_plans ep ON ep.id = p.plan_id
         JOIN categories c ON c.id = p.category_id
         WHERE p.id = ?`,
      )
      .get(paymentId) as PaymentJoinRow | undefined;

    if (!row) throw notFound('Pago esencial');
    if (row.checked === 1) {
      throw new HttpError(409, 'Este pago ya fue marcado como pagado y no se puede desmarcar.');
    }

    const finalAmount = round2(customAmount !== undefined ? customAmount : row.expectedAmount);
    const nowDate = today();
    const txDate = nowDate.startsWith(row.month) ? nowDate : `${row.month}-01`;
    const description =
      row.frequencyMonth > 1
        ? `${row.categoryName} (Pago ${row.installmentNum}/${row.frequencyMonth})`
        : `${row.categoryName} (Pago mensual)`;

    const run = db.transaction(() => {
      const tx = db
        .prepare(
          `INSERT INTO transactions (type, amount, category_id, description, date)
           VALUES ('expense', ?, ?, ?, ?)`,
        )
        .run(finalAmount, row.categoryId, description, txDate);

      db.prepare(
        `UPDATE essential_payments
         SET checked = 1, paid_amount = ?, checked_at = datetime('now'), transaction_id = ?
         WHERE id = ?`,
      ).run(finalAmount, tx.lastInsertRowid, row.id);
    });

    run();

    const budget = budgetsService.getStatusForCategory(row.categoryId, row.month);
    return {
      checklist: essentialsService.listByMonth(row.month),
      alert: budget && budget.status !== 'ok' ? budget : null,
    };
  },
};
