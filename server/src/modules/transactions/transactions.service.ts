/**
 * Lógica de negocio de movimientos.
 * Al registrar un gasto se verifica el presupuesto de la categoría y, si se
 * acerca o supera el límite, se devuelve una alerta para mostrar al usuario.
 */
import type { Budget, Transaction } from '../../types';
import { badRequest, notFound } from '../../utils/httpError';
import { budgetsService } from '../budgets/budgets.service';
import { categoriesService } from '../categories/categories.service';
import { transactionsRepository } from './transactions.repository';
import type { TransactionFilters, TransactionInput } from './transactions.schema';

export interface TransactionResult {
  transaction: Transaction;
  /** Alerta de presupuesto (warning/exceeded) o null si todo está bien. */
  alert: Budget | null;
}

function assertCategoryMatches(input: TransactionInput): void {
  const category = categoriesService.getById(input.categoryId);
  if (category.type !== input.type) {
    throw badRequest('La categoría no corresponde al tipo de movimiento');
  }
}

function budgetAlertFor(transaction: Transaction): Budget | null {
  if (transaction.type !== 'expense') return null;
  const status = budgetsService.getStatusForCategory(transaction.categoryId, transaction.date.slice(0, 7));
  return status && status.status !== 'ok' ? status : null;
}

export const transactionsService = {
  list(filters: TransactionFilters): Transaction[] {
    return transactionsRepository.findAll(filters);
  },

  getById(id: number): Transaction {
    const transaction = transactionsRepository.findById(id);
    if (!transaction) throw notFound('Movimiento');
    return transaction;
  },

  create(input: TransactionInput): TransactionResult {
    assertCategoryMatches(input);
    const transaction = transactionsRepository.create(input);
    return { transaction, alert: budgetAlertFor(transaction) };
  },

  update(id: number, input: TransactionInput): TransactionResult {
    transactionsService.getById(id);
    assertCategoryMatches(input);
    const transaction = transactionsRepository.update(id, input);
    return { transaction, alert: budgetAlertFor(transaction) };
  },

  remove(id: number): void {
    transactionsService.getById(id);
    transactionsRepository.delete(id);
  },
};
