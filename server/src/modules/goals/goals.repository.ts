/**
 * Repositorio de metas de ahorro y sus aportes.
 */
import { db } from '../../db/connection';
import { monthRange } from '../../utils/date';
import type { ContributionInput, GoalInput } from './goals.schema';

export interface GoalRow {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string;
  color: string;
  createdAt: string;
}

export interface ContributionRow {
  id: number;
  goalId: number;
  amount: number;
  date: string;
  note: string;
}

const BASE_SELECT = `
  SELECT id, name, target_amount AS targetAmount, current_amount AS currentAmount,
         deadline, icon, color, created_at AS createdAt
  FROM goals`;

export const goalsRepository = {
  findAll(): GoalRow[] {
    return db.prepare(`${BASE_SELECT} ORDER BY (current_amount >= target_amount), deadline IS NULL, deadline, id`).all() as GoalRow[];
  },

  findById(id: number): GoalRow | undefined {
    return db.prepare(`${BASE_SELECT} WHERE id = ?`).get(id) as GoalRow | undefined;
  },

  create(data: GoalInput): GoalRow {
    const result = db
      .prepare(`INSERT INTO goals (name, target_amount, deadline, icon, color) VALUES (?, ?, ?, ?, ?)`)
      .run(data.name, data.targetAmount, data.deadline, data.icon, data.color);
    return goalsRepository.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: GoalInput): GoalRow {
    db.prepare(
      `UPDATE goals SET name = ?, target_amount = ?, deadline = ?, icon = ?, color = ? WHERE id = ?`,
    ).run(data.name, data.targetAmount, data.deadline, data.icon, data.color, id);
    return goalsRepository.findById(id)!;
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM goals WHERE id = ?').run(id).changes > 0;
  },

  /** Registra un aporte y actualiza el saldo de la meta (transacción atómica). */
  addContribution(goalId: number, data: ContributionInput): void {
    const run = db.transaction(() => {
      db.prepare('INSERT INTO goal_contributions (goal_id, amount, date, note) VALUES (?, ?, ?, ?)').run(
        goalId,
        data.amount,
        data.date,
        data.note,
      );
      db.prepare('UPDATE goals SET current_amount = ROUND(current_amount + ?, 2) WHERE id = ?').run(
        data.amount,
        goalId,
      );
    });
    run();
  },

  listContributions(goalId: number): ContributionRow[] {
    return db
      .prepare(
        `SELECT id, goal_id AS goalId, amount, date, note FROM goal_contributions
         WHERE goal_id = ? ORDER BY date DESC, id DESC`,
      )
      .all(goalId) as ContributionRow[];
  },

  /** Total ahorrado (aportes netos) en un mes. */
  sumContributionsByMonth(month: string): number {
    const row = db
      .prepare(`SELECT COALESCE(SUM(amount), 0) AS total FROM goal_contributions WHERE date BETWEEN ? AND ?`)
      .get(...monthRange(month)) as { total: number };
    return row.total;
  },
};
