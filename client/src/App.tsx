/**
 * Componente raíz de MyWallet.
 * - Si la encuesta inicial aún no se ha completado (`onboardingCompleted === false`),
 *   muestra únicamente el asistente inicial de configuración.
 * - Una vez completado (`onboardingCompleted === true`), oculta esa opción para
 *   siempre y carga la aplicación completa con su menú flotante inferior.
 */
import { RefreshCw, WifiOff } from 'lucide-react';
import { FloatingDock } from './components/layout/FloatingDock';
import { Header } from './components/layout/Header';
import { BrandLogo } from './components/ui/BrandLogo';
import { ToastContainer } from './components/ui/ToastContainer';
import { WalletProvider, useWallet } from './context/WalletContext';
import { BudgetsView } from './features/budgets/BudgetsView';
import { DashboardView } from './features/dashboard/DashboardView';
import { GoalsAndDebtsView } from './features/goals/GoalsAndDebtsView';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import { ReportsView } from './features/reports/ReportsView';
import { TransactionModal } from './features/transactions/TransactionModal';
import { TransactionsView } from './features/transactions/TransactionsView';

function ConnectionErrorBanner({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
      <div className="flex items-center gap-3">
        <WifiOff size={18} className="shrink-0 text-rose-600" />
        <div className="text-xs">
          <p className="font-semibold">No se pudo conectar con el servidor de MyWallet</p>
          <p className="text-rose-700">
            {error} · Verifica que el backend esté corriendo en el puerto 4000.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
      >
        <RefreshCw size={13} />
        Reintentar
      </button>
    </div>
  );
}

function AppShell() {
  const { view, error, loading, onboardingCompleted, refreshAll } = useWallet();

  if (onboardingCompleted === null) {
    if (error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4">
          <div className="mb-6">
            <BrandLogo showTagline />
          </div>
          <ConnectionErrorBanner error={error} onRetry={() => void refreshAll()} />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <BrandLogo showTagline />
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
        </div>
        {loading && <p className="text-xs text-slate-500">Cargando tu espacio financiero...</p>}
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <>
        <OnboardingWizard />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6">
        {error && <ConnectionErrorBanner error={error} onRetry={() => void refreshAll()} />}

        {view === 'dashboard' && <DashboardView />}
        {view === 'transactions' && <TransactionsView />}
        {view === 'budgets' && <BudgetsView />}
        {view === 'goals' && <GoalsAndDebtsView />}
        {view === 'reports' && <ReportsView />}
      </main>

      <FloatingDock />
      <TransactionModal />
      <ToastContainer />
    </div>
  );
}

export function App() {
  return (
    <WalletProvider>
      <AppShell />
    </WalletProvider>
  );
}

export default App;
