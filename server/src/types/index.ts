/**
 * Tipos de dominio compartidos por todo el backend.
 * (El frontend tiene una copia equivalente en `client/src/types`.
 *  Si el proyecto crece, se pueden mover a un paquete `shared/`.)
 */

export type TransactionType = 'income' | 'expense';
export type ExpenseGroup = 'needs' | 'wants' | 'savings';
export type BudgetStatusLevel = 'ok' | 'warning' | 'exceeded';
export type InsightType = 'info' | 'warning' | 'success';

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  unitAmount: number;
  frequencyMonth: number;
  monthlyTotal: number;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  expenseGroup: ExpenseGroup | null;
  isDefault: boolean;
  subcategories: Subcategory[];
  subcategoriesTotal: number;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number;
  description: string;
  date: string;
  createdAt: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  month: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: BudgetStatusLevel;
  subcategories: Subcategory[];
  subcategoriesTotal: number;
}

export interface BudgetsOverview {
  month: string;
  items: Budget[];
  totals: { budgeted: number; spent: number; remaining: number; percentage: number };
  alerts: Budget[];
}

export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string;
  color: string;
  createdAt: string;
  remaining: number;
  progress: number;
  monthsLeft: number | null;
  monthlyNeeded: number | null;
  completed: boolean;
}

export interface Debt {
  id: number;
  name: string;
  creditor: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate: number;
  monthlyPayment: number;
  dueDay: number | null;
  createdAt: string;
  paidAmount: number;
  progress: number;
  monthsToPayoff: number | null;
  monthlyInterest: number;
  paymentCoversInterest: boolean;
}

export interface DebtsOverview {
  items: Debt[];
  totals: { totalDebt: number; totalRemaining: number; monthlyPayments: number };
  /** Deuda a priorizar según el método avalancha (mayor interés). */
  priorityDebtId: number | null;
}

export interface Insight {
  type: InsightType;
  message: string;
}

export interface CategoryTotal {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  expenseGroup: ExpenseGroup | null;
  total: number;
  percentage: number;
}

export interface DistributionItem {
  key: ExpenseGroup;
  label: string;
  recommendedPercent: number;
  recommended: number;
  actual: number;
  actualPercent: number;
}

export interface MonthTotals {
  income: number;
  expenses: number;
  savings: number;
  available: number;
}

export interface MonthSummary {
  month: string;
  label: string;
  totals: MonthTotals & { budgeted: number; budgetRemaining: number };
  previous: MonthTotals & { month: string };
  changes: { income: number | null; expenses: number | null; savings: number | null; available: number | null };
  daysLeft: number;
  dailyAllowance: number | null;
  expensesByCategory: CategoryTotal[];
  distribution: DistributionItem[];
  alerts: Budget[];
  debts: { totalRemaining: number; monthlyPayments: number; count: number };
  goals: { totalTarget: number; totalSaved: number; count: number };
  insights: Insight[];
}

export interface TrendPoint {
  month: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
}

export interface CategoryComparison {
  categoryId: number;
  name: string;
  color: string;
  icon: string;
  current: number;
  previous: number;
  diff: number;
  change: number | null;
}

export interface MonthComparison {
  current: MonthTotals & { month: string; label: string };
  previous: MonthTotals & { month: string; label: string };
  categories: CategoryComparison[];
}

export interface EssentialPaymentItem {
  id: number;
  planId: number;
  categoryId: number;
  month: string;
  installmentNum: number;
  expectedAmount: number;
  paidAmount: number | null;
  checked: boolean;
  checkedAt: string | null;
}

export interface EssentialCategoryChecklist {
  planId: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  unitAmount: number;
  frequencyMonth: number;
  monthlyTotal: number;
  isVariable: boolean;
  paidCount: number;
  totalPaidAmount: number;
  allChecked: boolean;
  payments: EssentialPaymentItem[];
}
