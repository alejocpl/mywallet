/**
 * Cliente HTTP centralizado y tipado para la API REST de MyWallet.
 * Todas las llamadas pasan por `request<T>` para manejar errores de forma uniforme.
 */
import type {
  Budget,
  BudgetsOverview,
  Category,
  Debt,
  DebtsOverview,
  EssentialCategoryChecklist,
  ExpenseGroup,
  Goal,
  GoalContribution,
  MonthComparison,
  MonthSummary,
  Transaction,
  TransactionResult,
  TransactionType,
  TrendPoint,
} from '../types';

export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.mywalletDesktop?.apiBaseUrl) {
    return window.mywalletDesktop.apiBaseUrl.replace(/\/+$/, '');
  }
  const envBase = import.meta.env?.VITE_API_BASE_URL;
  return envBase ? String(envBase).replace(/\/+$/, '') : '/api';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data && typeof data.error === 'string' ? data.error : `Error HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export interface CategoryPayload {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  expenseGroup: ExpenseGroup | null;
}

export interface SubcategoryPayload {
  name: string;
  unitAmount: number;
  frequencyMonth: number;
  month?: string;
  recordExpense?: boolean;
}

export const categoriesApi = {
  list: (type?: TransactionType) => request<Category[]>(`/categories${buildQuery({ type })}`),
  create: (body: CategoryPayload) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: CategoryPayload) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
  addSubcategory: (categoryId: number, body: SubcategoryPayload) =>
    request<Category>(`/categories/${categoryId}/subcategories`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSubcategory: (subId: number, body: SubcategoryPayload) =>
    request<Category>(`/categories/subcategories/${subId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  removeSubcategory: (subId: number, month?: string) =>
    request<Category>(`/categories/subcategories/${subId}${buildQuery({ month })}`, {
      method: 'DELETE',
    }),
};

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  categoryId: number;
  description: string;
  date: string;
}

export interface TransactionFilters {
  month?: string;
  type?: TransactionType;
  categoryId?: number;
  search?: string;
  limit?: number;
}

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    request<Transaction[]>(`/transactions${buildQuery({ ...filters })}`),
  create: (body: TransactionPayload) =>
    request<TransactionResult>('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: TransactionPayload) =>
    request<TransactionResult>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/transactions/${id}`, { method: 'DELETE' }),
};

export const budgetsApi = {
  list: (month: string) => request<BudgetsOverview>(`/budgets${buildQuery({ month })}`),
  upsert: (body: { categoryId: number; month: string; amount: number }) =>
    request<Budget>('/budgets', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, amount: number) =>
    request<Budget>(`/budgets/${id}`, { method: 'PUT', body: JSON.stringify({ amount }) }),
  remove: (id: number) => request<void>(`/budgets/${id}`, { method: 'DELETE' }),
  copy: (toMonth: string, fromMonth?: string) =>
    request<{ copied: number; fromMonth: string }>('/budgets/copy', {
      method: 'POST',
      body: JSON.stringify({ toMonth, fromMonth }),
    }),
};

export interface GoalPayload {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  icon: string;
  color: string;
}

export const goalsApi = {
  list: () => request<Goal[]>('/goals'),
  create: (body: GoalPayload) =>
    request<Goal>('/goals', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: GoalPayload) =>
    request<Goal>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/goals/${id}`, { method: 'DELETE' }),
  contributions: (id: number) => request<GoalContribution[]>(`/goals/${id}/contributions`),
  contribute: (id: number, body: { amount: number; date?: string; note?: string }) =>
    request<Goal>(`/goals/${id}/contributions`, { method: 'POST', body: JSON.stringify(body) }),
};

export interface DebtPayload {
  name: string;
  creditor: string;
  totalAmount: number;
  remainingAmount?: number;
  interestRate: number;
  monthlyPayment: number;
  dueDay?: number | null;
}

export const debtsApi = {
  list: () => request<DebtsOverview>('/debts'),
  create: (body: DebtPayload) =>
    request<Debt>('/debts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: DebtPayload) =>
    request<Debt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/debts/${id}`, { method: 'DELETE' }),
  pay: (id: number, body: { amount: number; date?: string }) =>
    request<{ debt: Debt; alert: Budget | null }>(`/debts/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

export const summaryApi = {
  getMonth: (month: string) => request<MonthSummary>(`/summary${buildQuery({ month })}`),
  getTrend: (month: string, months = 6) =>
    request<TrendPoint[]>(`/summary/trend${buildQuery({ month, months })}`),
  getComparison: (month: string) =>
    request<MonthComparison>(`/summary/comparison${buildQuery({ month })}`),
};

export const reportsApi = {
  pdfUrl: (month: string) => `${getApiBase()}/reports/pdf${buildQuery({ month })}`,
  excelUrl: (month: string) => `${getApiBase()}/reports/excel${buildQuery({ month })}`,
};

export const demoApi = {
  seed: () => request<{ status: string; message: string }>('/seed', { method: 'POST' }),
};

export const essentialsApi = {
  list: (month: string) =>
    request<EssentialCategoryChecklist[]>(`/essentials${buildQuery({ month })}`),
  checkPayment: (paymentId: number, amount?: number) =>
    request<{ checklist: EssentialCategoryChecklist[]; alert: Budget | null }>(
      `/essentials/payments/${paymentId}/check`,
      {
        method: 'POST',
        body: JSON.stringify(amount !== undefined ? { amount } : {}),
      },
    ),
};

export type ExpenseRecordingMode = 'all' | 'fixed_only' | 'budgets_only';

export interface OnboardingDebtItem {
  name: string;
  creditor: string;
  totalAmount: number;
  remainingAmount?: number;
  interestRate: number;
  monthlyPayment: number;
  dueDay?: number | null;
}

export interface OnboardingGoalItem {
  name: string;
  targetAmount: number;
  currentSaved: number;
  monthlyContribution: number;
  deadline?: string | null;
  icon: string;
  color: string;
}

export interface OnboardingSubcategoryItem {
  name: string;
  unitAmount: number;
  frequencyMonth: number;
}

export interface OnboardingEssentialItem {
  unitAmount: number;
  frequencyMonth: number;
  paidCount: number;
  paidAmountOverride?: number;
}

export interface OnboardingPayload {
  month?: string;
  resetExisting: boolean;
  expenseRecordingMode: ExpenseRecordingMode;
  incomes: {
    salary: number;
    hasFreelance: boolean;
    freelance: number;
    hasOtherIncome: boolean;
    otherIncome: number;
    otherIncomeDescription: string;
  };
  expenses: {
    housing: number;
    food: number;
    transport: number;
    utilities: number;
    health: number;
    education: number;
    leisure: number;
    dining: number;
    subscriptions: number;
    shopping: number;
    investments: number;
  };
  subcategories?: Record<string, OnboardingSubcategoryItem[]>;
  essentialPlans?: Record<string, OnboardingEssentialItem>;
  hasDebts: boolean;
  debts: OnboardingDebtItem[];
  hasGoals: boolean;
  goals: OnboardingGoalItem[];
}

export const onboardingApi = {
  status: () => request<{ completed: boolean; hasData: boolean }>('/onboarding/status'),
  submit: (body: OnboardingPayload) =>
    request<{ status: string; month: string }>('/onboarding', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  skip: () => request<{ status: string }>('/onboarding/skip', { method: 'POST' }),
  reset: () => request<{ status: string }>('/onboarding/reset', { method: 'POST' }),
};
