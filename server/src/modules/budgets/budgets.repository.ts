/**
 * Repositorio de presupuestos mensuales por categoría.
 * El gasto real (`spent`) se calcula en la consulta a partir de los movimientos.
 */
import { db } from '../../db/connection';

export interface BudgetRow {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  month: string;
  amount: number;
  spent: number;
}

const BASE_SELECT = `
  SELECT b.id, b.category_id AS categoryId, b.month, b.amount,
         c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor,
         COALESCE((
           SELECT SUM(t.amount) FROM transactions t
           WHERE t.category_id = b.category_id
             AND t.type = 'expense'
             AND t.date BETWEEN b.month || '-01' AND b.month || '-31'
         ), 0) AS spent
  FROM budgets b
  JOIN categories c ON c.id = b.category_id`;

export const budgetsRepository = {
  findByMonth(month: string): BudgetRow[] {
    return db.prepare(`${BASE_SELECT} WHERE b.month = ? ORDER BY c.id`).all(month) as BudgetRow[];
  },

  findById(id: number): BudgetRow | undefined {
    return db.prepare(`${BASE_SELECT} WHERE b.id = ?`).get(id) as BudgetRow | undefined;
  },

  findByCategoryAndMonth(categoryId: number, month: string): BudgetRow | undefined {
    return db
      .prepare(`${BASE_SELECT} WHERE b.category_id = ? AND b.month = ?`)
      .get(categoryId, month) as BudgetRow | undefined;
  },

  /** Crea o actualiza el presupuesto de una categoría para un mes. */
  upsert(categoryId: number, month: string, amount: number): BudgetRow {
    db.prepare(
      `INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)
       ON CONFLICT (category_id, month) DO UPDATE SET amount = excluded.amount`,
    ).run(categoryId, month, amount);
    return budgetsRepository.findByCategoryAndMonth(categoryId, month)!;
  },

  updateAmount(id: number, amount: number): BudgetRow {
    db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(amount, id);
    return budgetsRepository.findById(id)!;
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM budgets WHERE id = ?').run(id).changes > 0;
  },

  /** Copia los presupuestos de un mes a otro (sin sobrescribir existentes). */
  copy(fromMonth: string, toMonth: string): number {
    return db
      .prepare(
        `INSERT INTO budgets (category_id, month, amount)
         SELECT category_id, ?, amount FROM budgets WHERE month = ?
         ON CONFLICT (category_id, month) DO NOTHING`,
      )
      .run(toMonth, fromMonth).changes;
  },
};
