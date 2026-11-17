/**
 * Repositorio de categorías y subcategorías: único lugar con SQL para estas entidades.
 */
import { db } from '../../db/connection';
import type { Category, Subcategory, TransactionType } from '../../types';
import { round2 } from '../../utils/money';
import type { CategoryInput } from './categories.schema';

interface CategoryRow extends Omit<Category, 'isDefault' | 'subcategories' | 'subcategoriesTotal'> {
  isDefault: number;
}

interface SubcategoryRow {
  id: number;
  categoryId: number;
  name: string;
  unitAmount: number;
  frequencyMonth: number;
}

const BASE_SELECT = `
  SELECT id, name, type, icon, color,
         expense_group AS expenseGroup,
         is_default    AS isDefault
  FROM categories`;

const SUB_SELECT = `
  SELECT id, category_id AS categoryId, name,
         unit_amount AS unitAmount,
         frequency_month AS frequencyMonth
  FROM subcategories`;

const toSubcategory = (row: SubcategoryRow): Subcategory => ({
  ...row,
  monthlyTotal: round2(row.unitAmount * row.frequencyMonth),
});

function attachSubcategories(rows: CategoryRow[]): Category[] {
  if (rows.length === 0) return [];
  const subRows = db.prepare(`${SUB_SELECT} ORDER BY id`).all() as SubcategoryRow[];
  const byCategory = new Map<number, Subcategory[]>();

  for (const s of subRows) {
    const sub = toSubcategory(s);
    const list = byCategory.get(sub.categoryId);
    if (list) list.push(sub);
    else byCategory.set(sub.categoryId, [sub]);
  }

  return rows.map((row) => {
    const subs = byCategory.get(row.id) ?? [];
    const total = round2(subs.reduce((sum, s) => sum + s.monthlyTotal, 0));
    return {
      ...row,
      isDefault: row.isDefault === 1,
      subcategories: subs,
      subcategoriesTotal: total,
    };
  });
}

export const categoriesRepository = {
  findAll(type?: TransactionType): Category[] {
    const rows = (
      type
        ? db.prepare(`${BASE_SELECT} WHERE type = ? ORDER BY id`).all(type)
        : db.prepare(`${BASE_SELECT} ORDER BY type, id`).all()
    ) as CategoryRow[];
    return attachSubcategories(rows);
  },

  findById(id: number): Category | undefined {
    const row = db.prepare(`${BASE_SELECT} WHERE id = ?`).get(id) as CategoryRow | undefined;
    return row ? attachSubcategories([row])[0] : undefined;
  },

  findByName(name: string, type: TransactionType): Category | undefined {
    const row = db
      .prepare(`${BASE_SELECT} WHERE lower(name) = lower(?) AND type = ?`)
      .get(name, type) as CategoryRow | undefined;
    return row ? attachSubcategories([row])[0] : undefined;
  },

  create(data: CategoryInput): Category {
    const result = db
      .prepare(
        `INSERT INTO categories (name, type, icon, color, expense_group) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(data.name, data.type, data.icon, data.color, data.type === 'expense' ? data.expenseGroup : null);
    return categoriesRepository.findById(Number(result.lastInsertRowid))!;
  },

  update(id: number, data: CategoryInput): Category {
    db.prepare(
      `UPDATE categories SET name = ?, type = ?, icon = ?, color = ?, expense_group = ? WHERE id = ?`,
    ).run(data.name, data.type, data.icon, data.color, data.type === 'expense' ? data.expenseGroup : null, id);
    return categoriesRepository.findById(id)!;
  },

  delete(id: number): boolean {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes > 0;
  },

  countTransactions(id: number): number {
    const row = db
      .prepare('SELECT COUNT(*) AS total FROM transactions WHERE category_id = ?')
      .get(id) as { total: number };
    return row.total;
  },

  findSubcategoriesByCategory(categoryId: number): Subcategory[] {
    const rows = db
      .prepare(`${SUB_SELECT} WHERE category_id = ? ORDER BY id`)
      .all(categoryId) as SubcategoryRow[];
    return rows.map(toSubcategory);
  },

  findSubcategoryById(id: number): Subcategory | undefined {
    const row = db.prepare(`${SUB_SELECT} WHERE id = ?`).get(id) as SubcategoryRow | undefined;
    return row ? toSubcategory(row) : undefined;
  },

  upsertSubcategory(
    categoryId: number,
    name: string,
    unitAmount: number,
    frequencyMonth: number,
  ): Subcategory {
    db.prepare(
      `INSERT INTO subcategories (category_id, name, unit_amount, frequency_month)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (category_id, name) DO UPDATE
       SET unit_amount = excluded.unit_amount, frequency_month = excluded.frequency_month`,
    ).run(categoryId, name, unitAmount, frequencyMonth);
    const row = db
      .prepare(`${SUB_SELECT} WHERE category_id = ? AND name = ?`)
      .get(categoryId, name) as SubcategoryRow;
    return toSubcategory(row);
  },

  updateSubcategory(
    id: number,
    name: string,
    unitAmount: number,
    frequencyMonth: number,
  ): Subcategory {
    db.prepare(
      `UPDATE subcategories SET name = ?, unit_amount = ?, frequency_month = ? WHERE id = ?`,
    ).run(name, unitAmount, frequencyMonth, id);
    return categoriesRepository.findSubcategoryById(id)!;
  },

  deleteSubcategory(id: number): boolean {
    return db.prepare('DELETE FROM subcategories WHERE id = ?').run(id).changes > 0;
  },
};
