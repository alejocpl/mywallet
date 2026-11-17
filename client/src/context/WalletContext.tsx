/**
 * Estado global de MyWallet:
 *  - Mes activo (`YYYY-MM`) y vista actual (`ViewId`)
 *  - Datos consolidados del mes (resumen, tendencia, comparativa, categorías,
 *    presupuestos, metas y deudas)
 *  - Control del modal rápido de Ingresar Gasto / Ingreso (con edición)
 *  - Sistema de notificaciones y alertas automáticas de presupuesto
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  budgetsApi,
  categoriesApi,
  debtsApi,
  essentialsApi,
  goalsApi,
  onboardingApi,
  summaryApi,
} from '../services/api';
import type {
  Budget,
  BudgetsOverview,
  Category,
  DebtsOverview,
  EssentialCategoryChecklist,
  Goal,
  MonthComparison,
  MonthSummary,
  Transaction,
  TransactionType,
  TrendPoint,
  ViewId,
} from '../types';
import { currentMonth, formatMoney } from '../utils/format';

export type ToastLevel = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  title: string;
  message: string;
  level: ToastLevel;
}

export interface QuickTxState {
  open: boolean;
  defaultType: TransactionType;
  editing: Transaction | null;
}

interface WalletContextValue {
  month: string;
  setMonth: (m: string) => void;
  view: ViewId;
  setView: (v: ViewId) => void;
  loading: boolean;
  error: string | null;
  summary: MonthSummary | null;
  trend: TrendPoint[];
  comparison: MonthComparison | null;
  categories: Category[];
  budgets: BudgetsOverview | null;
  goals: Goal[];
  debts: DebtsOverview | null;
  essentials: EssentialCategoryChecklist[];
  refreshAll: () => Promise<void>;
  refreshKey: number;
  quickTx: QuickTxState;
  openQuickTransaction: (defaultType?: TransactionType, editing?: Transaction | null) => void;
  closeQuickTransaction: () => void;
  onboardingCompleted: boolean | null;
  toasts: ToastItem[];
  notify: (title: string, message: string, level?: ToastLevel) => void;
  notifyBudgetAlert: (alert: Budget | null) => void;
  dismissToast: (id: number) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

let toastSeq = 1;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState<string>(currentMonth);
  const [view, setView] = useState<ViewId>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetsOverview | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [debts, setDebts] = useState<DebtsOverview | null>(null);
  const [essentials, setEssentials] = useState<EssentialCategoryChecklist[]>([]);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  const [quickTx, setQuickTx] = useState<QuickTxState>({
    open: false,
    defaultType: 'expense',
    editing: null,
  });

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (title: string, message: string, level: ToastLevel = 'info') => {
      const id = toastSeq++;
      setToasts((prev) => [...prev, { id, title, message, level }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    [],
  );

  const notifyBudgetAlert = useCallback(
    (alert: Budget | null) => {
      if (!alert || alert.status === 'ok') return;
      if (alert.status === 'exceeded') {
        notify(
          `¡Presupuesto superado en ${alert.categoryName}!`,
          `Has gastado ${formatMoney(alert.spent)} de ${formatMoney(alert.amount)} (${alert.percentage}%).`,
          'error',
        );
      } else {
        notify(
          `Alerta de presupuesto: ${alert.categoryName}`,
          `Llevas ${alert.percentage}% usado. Te quedan ${formatMoney(alert.remaining)}.`,
          'warning',
        );
      }
    },
    [notify],
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, trendRes, compRes, catRes, budRes, goalRes, debtRes, essRes, onbRes] =
        await Promise.all([
          summaryApi.getMonth(month),
          summaryApi.getTrend(month, 6),
          summaryApi.getComparison(month),
          categoriesApi.list(),
          budgetsApi.list(month),
          goalsApi.list(),
          debtsApi.list(),
          essentialsApi.list(month),
          onboardingApi.status(),
        ]);
      setSummary(sumRes);
      setTrend(trendRes);
      setComparison(compRes);
      setCategories(catRes);
      setBudgets(budRes);
      setGoals(goalRes);
      setDebts(debtRes);
      setEssentials(essRes);
      setOnboardingCompleted(onbRes.completed);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo conectar con la API de MyWallet';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const openQuickTransaction = useCallback(
    (defaultType: TransactionType = 'expense', editing: Transaction | null = null) => {
      setQuickTx({ open: true, defaultType: editing?.type ?? defaultType, editing });
    },
    [],
  );

  const closeQuickTransaction = useCallback(() => {
    setQuickTx((prev) => ({ ...prev, open: false, editing: null }));
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      month,
      setMonth,
      view,
      setView,
      loading,
      error,
      summary,
      trend,
      comparison,
      categories,
      budgets,
      goals,
      debts,
      essentials,
      refreshAll,
      refreshKey,
      quickTx,
      openQuickTransaction,
      closeQuickTransaction,
      onboardingCompleted,
      toasts,
      notify,
      notifyBudgetAlert,
      dismissToast,
    }),
    [
      month,
      view,
      loading,
      error,
      summary,
      trend,
      comparison,
      categories,
      budgets,
      goals,
      debts,
      essentials,
      refreshAll,
      refreshKey,
      quickTx,
      openQuickTransaction,
      closeQuickTransaction,
      onboardingCompleted,
      toasts,
      notify,
      notifyBudgetAlert,
      dismissToast,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet debe usarse dentro de <WalletProvider>');
  return ctx;
}
