/**
 * Lógica de negocio de metas de ahorro.
 * Calcula progreso, faltante y cuánto ahorrar por mes para llegar a tiempo.
 */
import type { Goal } from '../../types';
import { monthsUntil } from '../../utils/date';
import { badRequest, notFound } from '../../utils/httpError';
import { percentOf, round2 } from '../../utils/money';
import { goalsRepository, type GoalRow } from './goals.repository';
import type { ContributionInput, GoalInput } from './goals.schema';

function enrich(row: GoalRow): Goal {
  const remaining = Math.max(0, round2(row.targetAmount - row.currentAmount));
  const monthsLeft = row.deadline ? Math.max(0, monthsUntil(row.deadline)) : null;
  const monthlyNeeded =
    remaining === 0 ? 0 : monthsLeft === null ? null : round2(remaining / Math.max(1, monthsLeft));

  return {
    ...row,
    remaining,
    progress: Math.min(100, percentOf(row.currentAmount, row.targetAmount)),
    monthsLeft,
    monthlyNeeded,
    completed: remaining === 0,
  };
}

export const goalsService = {
  list(): Goal[] {
    return goalsRepository.findAll().map(enrich);
  },

  getById(id: number): Goal {
    const row = goalsRepository.findById(id);
    if (!row) throw notFound('Meta');
    return enrich(row);
  },

  create(data: GoalInput): Goal {
    return enrich(goalsRepository.create(data));
  },

  update(id: number, data: GoalInput): Goal {
    goalsService.getById(id);
    return enrich(goalsRepository.update(id, data));
  },

  remove(id: number): void {
    if (!goalsRepository.delete(id)) throw notFound('Meta');
  },

  contribute(id: number, data: ContributionInput): Goal {
    const goal = goalsService.getById(id);
    if (goal.currentAmount + data.amount < 0) {
      throw badRequest('No puedes retirar más de lo ahorrado en la meta');
    }
    goalsRepository.addContribution(id, data);
    return goalsService.getById(id);
  },

  contributions(id: number) {
    goalsService.getById(id);
    return goalsRepository.listContributions(id);
  },
};
