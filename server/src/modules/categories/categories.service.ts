/**
 * Lógica de negocio de categorías y subcategorías.
 * Al agregar, editar o eliminar una subcategoría de gasto, recalcula la suma
 * total mensual y actualiza automáticamente el presupuesto de la categoría padre.
 */
import type { Category, TransactionType } from '../../types';
import { currentMonth, today } from '../../utils/date';
import { HttpError, notFound } from '../../utils/httpError';
import { formatMoney, round2 } from '../../utils/money';
import { budgetsRepository } from '../budgets/budgets.repository';
import { transactionsRepository } from '../transactions/transactions.repository';
import { categoriesRepository } from './categories.repository';
import type { CategoryInput, SubcategoryInput } from './categories.schema';

function syncParentBudget(category: Category, month: string): void {
  if (category.type !== 'expense' || category.subcategoriesTotal <= 0) return;
  budgetsRepository.upsert(category.id, month, category.subcategoriesTotal);
}

export const categoriesService = {
  list(type?: TransactionType): Category[] {
    return categoriesRepository.findAll(type);
  },

  getById(id: number): Category {
    const category = categoriesRepository.findById(id);
    if (!category) throw notFound('Categoría');
    return category;
  },

  create(data: CategoryInput): Category {
    if (categoriesRepository.findByName(data.name, data.type)) {
      throw new HttpError(409, 'Ya existe una categoría con ese nombre');
    }
    return categoriesRepository.create(data);
  },

  update(id: number, data: CategoryInput): Category {
    categoriesService.getById(id);
    return categoriesRepository.update(id, data);
  },

  remove(id: number): void {
    const category = categoriesService.getById(id);
    if (category.isDefault) {
      throw new HttpError(400, 'Las categorías por defecto no se pueden eliminar');
    }
    if (categoriesRepository.countTransactions(id) > 0) {
      throw new HttpError(409, 'La categoría tiene movimientos asociados');
    }
    categoriesRepository.delete(id);
  },

  addSubcategory(categoryId: number, input: SubcategoryInput): Category {
    const parent = categoriesService.getById(categoryId);
    const targetMonth = input.month ?? currentMonth();
    const unitAmount = round2(input.unitAmount);

    categoriesRepository.upsertSubcategory(
      categoryId,
      input.name,
      unitAmount,
      input.frequencyMonth,
    );

    const updated = categoriesService.getById(categoryId);
    syncParentBudget(updated, targetMonth);

    if (input.recordExpense && parent.type === 'expense') {
      const total = round2(unitAmount * input.frequencyMonth);
      const nowDate = today();
      const txDate = nowDate.startsWith(targetMonth) ? nowDate : `${targetMonth}-01`;
      const description =
        input.frequencyMonth > 1
          ? `${input.name} (${input.frequencyMonth}x al mes × ${formatMoney(unitAmount)})`
          : input.name;

      transactionsRepository.create({
        type: 'expense',
        amount: total,
        categoryId,
        description,
        date: txDate,
      });
    }

    return updated;
  },

  updateSubcategory(subId: number, input: SubcategoryInput): Category {
    const existing = categoriesRepository.findSubcategoryById(subId);
    if (!existing) throw notFound('Subcategoría');

    const targetMonth = input.month ?? currentMonth();
    categoriesRepository.updateSubcategory(
      subId,
      input.name,
      round2(input.unitAmount),
      input.frequencyMonth,
    );

    const updated = categoriesService.getById(existing.categoryId);
    syncParentBudget(updated, targetMonth);
    return updated;
  },

  removeSubcategory(subId: number, month?: string): Category {
    const existing = categoriesRepository.findSubcategoryById(subId);
    if (!existing) throw notFound('Subcategoría');

    categoriesRepository.deleteSubcategory(subId);
    const updated = categoriesService.getById(existing.categoryId);
    syncParentBudget(updated, month ?? currentMonth());
    return updated;
  },
};
