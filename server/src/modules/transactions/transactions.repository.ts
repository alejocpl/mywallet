/**
 * Repositorio de movimientos (ingresos y gastos).
 */
import { db } from '../../db/connection';
import type { Transaction, TransactionType } from '../../types';
import { monthRange } from '../../utils/date';
import type { TransactionFilters, TransactionInput } from './transactions.schema';

const BASE_SELECT = `
  SELECT t.id, t.type, t.amount, t.category_id AS categoryId, t.description, t.date,
         t.created_at AS createdAt,
         c.name  AS categoryName,
         c.icon  AS categoryIcon,
         c.color AS categoryColor
  FROM transactions t
  JOIN categories c ON c.id = t.category_id`;

export const transactionsRepository = {
  findAll(filters: TransactionFilters = {}): Transaction[] {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (filters.month) {
      where.push('t.date BETWEEN ? AND ?');
      params.push(...monthRange(filters.month));
    }
    if (filters.type) {
      where.push('t.type = ?');
      params.push(filters.type);
    }
    if (filters.categoryId) {
      where.push('t.category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters.search) {
      where.push('(t.description LIKE ? OR c.name LIKE ?)');
      const like = `%${filters.search}%`;
      params.push(like, like);
    }

    const sql = `${BASE_SELECT}
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ?`;
    params.push(filters.limit ?? 500);

    return db.prepare(sql).all(...params) as Transaction[];
  },

  findById(id: number): Transaction | undefined {
    return db.prepare(`${BASE_SELECT} WHERE t.id = ?`).get(id) as Transaction | undefined;
  },

  create(data: TransactionInput): Transaction {
    const result = db
      .prepare(
        `INSERT INTO transactions (type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(data.type, data.amount, data.categoryId, data.description, data.date);
    return transactionsRepository.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: TransactionInput): Transaction {
    db.prepare(
      `UPDATE transactions SET type = ?, amount = ?, category_id = ?, description = ?, date = ? WHERE id = ?`,
    ).run(data.type, data.amount, data.categoryId, data.description, data.date, id);
    return transactionsRepository.findById(id)!;
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM transactions WHERE id = ?').run(id).changes > 0;
  },

  /** Suma de un tipo de movimiento en un mes. */
  sumByType(month: string, type: TransactionType): number {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = ? AND date BETWEEN ? AND ?`,
      )
      .get(type, ...monthRange(month)) as { total: number };
    return row.total;
  },
};
