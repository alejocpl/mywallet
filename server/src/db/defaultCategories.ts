/**
 * Categorías por defecto que se crean al iniciar la base de datos.
 * - `icon`: clave del ícono (el frontend la traduce en `client/src/config/icons.ts`).
 * - `expenseGroup`: grupo de la regla 50/30/20 (solo para gastos).
 */
import type { ExpenseGroup, TransactionType } from '../types';

export interface DefaultCategory {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  expenseGroup?: ExpenseGroup;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ---------- Gastos: necesidades ----------
  { name: 'Vivienda', type: 'expense', icon: 'home', color: '#2563EB', expenseGroup: 'needs' },
  { name: 'Alimentación', type: 'expense', icon: 'utensils', color: '#16A34A', expenseGroup: 'needs' },
  { name: 'Transporte', type: 'expense', icon: 'car', color: '#F59E0B', expenseGroup: 'needs' },
  { name: 'Servicios', type: 'expense', icon: 'zap', color: '#0EA5E9', expenseGroup: 'needs' },
  { name: 'Salud', type: 'expense', icon: 'heart-pulse', color: '#EF4444', expenseGroup: 'needs' },
  { name: 'Educación', type: 'expense', icon: 'graduation-cap', color: '#8B5CF6', expenseGroup: 'needs' },
  { name: 'Deudas', type: 'expense', icon: 'credit-card', color: '#DC2626', expenseGroup: 'needs' },
  // ---------- Gastos: deseos ----------
  { name: 'Ocio', type: 'expense', icon: 'gamepad', color: '#EC4899', expenseGroup: 'wants' },
  { name: 'Restaurantes', type: 'expense', icon: 'coffee', color: '#F97316', expenseGroup: 'wants' },
  { name: 'Compras', type: 'expense', icon: 'shopping-bag', color: '#14B8A6', expenseGroup: 'wants' },
  { name: 'Suscripciones', type: 'expense', icon: 'tv', color: '#6366F1', expenseGroup: 'wants' },
  { name: 'Otros gastos', type: 'expense', icon: 'more', color: '#64748B', expenseGroup: 'wants' },
  // ---------- Gastos: ahorro e inversión (20%) ----------
  { name: 'Inversiones', type: 'expense', icon: 'trending-up', color: '#0D9488', expenseGroup: 'savings' },
  // ---------- Ingresos ----------
  { name: 'Salario', type: 'income', icon: 'briefcase', color: '#059669' },
  { name: 'Freelance', type: 'income', icon: 'laptop', color: '#0D9488' },
  { name: 'Inversiones', type: 'income', icon: 'trending-up', color: '#2563EB' },
  { name: 'Regalos', type: 'income', icon: 'gift', color: '#DB2777' },
  { name: 'Otros ingresos', type: 'income', icon: 'more', color: '#64748B' },
];
