/**
 * Repositorio de deudas y pagos.
 */
import { db } from '../../db/connection';
import type { DebtInput, PaymentInput } from './debts.schema';

export interface DebtRow {
  id: number;
  name: string;
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  dueDay: number | null;
  createdAt: string;
}

const BASE_SELECT = `
  SELECT id, name, creditor,
         total_amount     AS totalAmount,
         remaining_amount AS remainingAmount,
         interest_rate    AS interestRate,
         monthly_payment  AS monthlyPayment,
         due_day          AS dueDay,
         created_at       AS createdAt
  FROM debts`;

export const debtsRepository = {
  findAll(): DebtRow[] {
    return db.prepare(`${BASE_SELECT} ORDER BY (remaining_amount = 0), interest_rate DESC, id`).all() as DebtRow[];
  },

  findById(id: number): DebtRow | undefined {
    return db.prepare(`${BASE_SELECT} WHERE id = ?`).get(id) as DebtRow | undefined;
  },

  create(d: DebtInput): DebtRow {
    const result = db
      .prepare(
        `INSERT INTO debts (name, creditor, total_amount, remaining_amount, interest_rate, monthly_payment, due_day)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(d.name, d.creditor, d.totalAmount, d.remainingAmount, d.interestRate, d.monthlyPayment, d.dueDay);
    return debtsRepository.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, d: DebtInput): DebtRow {
    db.prepare(
      `UPDATE debts SET name = ?, creditor = ?, total_amount = ?, remaining_amount = ?,
         interest_rate = ?, monthly_payment = ?, due_day = ?
       WHERE id = ?`,
    ).run(d.name, d.creditor, d.totalAmount, d.remainingAmount, d.interestRate, d.monthlyPayment, d.dueDay, id);
    return debtsRepository.findById(id)!;
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM debts WHERE id = ?').run(id).changes > 0;
  },

  /**
   * Registra un pago de deuda de forma atómica:
   *  1. Crea un gasto en la categoría "Deudas" (para que impacte el balance).
   *  2. Guarda el pago vinculado a la deuda.
   *  3. Reduce el saldo pendiente.
   * Devuelve el id del movimiento creado.
   */
  registerPayment(debtId: number, payment: PaymentInput, categoryId: number, description: string): number {
    const run = db.transaction(() => {
      const tx = db
        .prepare(
          `INSERT INTO transactions (type, amount, category_id, description, date) VALUES ('expense', ?, ?, ?, ?)`,
        )
        .run(payment.amount, categoryId, description, payment.date);
      db.prepare('INSERT INTO debt_payments (debt_id, transaction_id, amount, date) VALUES (?, ?, ?, ?)').run(
        debtId,
        tx.lastInsertRowid,
        payment.amount,
        payment.date,
      );
      db.prepare('UPDATE debts SET remaining_amount = MAX(0, ROUND(remaining_amount - ?, 2)) WHERE id = ?').run(
        payment.amount,
        debtId,
      );
      return Number(tx.lastInsertRowid);
    });
    return run();
  },
};
