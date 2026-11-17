/**
 * Barra superior corporativa fija:
 *  - Identidad de marca (MyWallet)
 *  - Selector de mes (navegación histórica y regreso al mes actual)
 *  - Indicador de alertas de presupuesto
 *  - Accesos rápidos para ingresar ingresos, gastos y reportes
 *  - Controles de escritorio (carpeta persistente SQLite y actualizaciones en Electron)
 */
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileDown,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { DesktopUpdateStatus } from '../../types/electron';
import { currentMonth, monthLabel, shiftMonth } from '../../utils/format';
import { BrandLogo } from '../ui/BrandLogo';

export function Header() {
  const { month, setMonth, summary, setView, openQuickTransaction, notify } = useWallet();
  const isCurrentMonth = month === currentMonth();
  const alertCount = summary?.alerts.length ?? 0;

  const desktop = typeof window !== 'undefined' ? window.mywalletDesktop : undefined;
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus>({ state: 'idle' });
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (!desktop?.isDesktop) return;
    const unsubscribe = desktop.onUpdateStatus((status) => {
      setUpdateStatus(status);
      if (status.state === 'downloaded') {
        notify(
          'Actualización lista',
          `La versión ${status.version ?? ''} se descargó. Haz clic en Instalar para reiniciar MyWallet.`,
          'success',
        );
      }
    });
    return unsubscribe;
  }, [desktop, notify]);

  async function handleCheckUpdates() {
    if (!desktop?.isDesktop || checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const result = await desktop.checkForUpdates();
      setUpdateStatus(result);
      if (result.state === 'not-available') {
        notify(
          'MyWallet actualizado',
          result.message ?? `Ya tienes la versión más reciente (v${desktop.appVersion}).`,
          'info',
        );
      } else if (result.state === 'available') {
        notify(
          'Nueva versión disponible',
          `Descargando MyWallet v${result.version ?? ''} en segundo plano.`,
          'info',
        );
      } else if (result.state === 'error' && result.message) {
        notify('Actualizaciones', result.message, 'warning');
      }
    } catch (err) {
      notify(
        'Error al verificar actualizaciones',
        err instanceof Error ? err.message : 'Intenta nuevamente más tarde.',
        'warning',
      );
    } finally {
      setCheckingUpdate(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Marca */}
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className="text-left focus:outline-none"
        >
          <BrandLogo showTagline />
        </button>

        {/* Navegador de mes */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Mes anterior"
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[138px] px-2 text-center text-sm font-semibold text-slate-800">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Mes siguiente"
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
          >
            <ChevronRight size={16} />
          </button>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setMonth(currentMonth())}
              className="ml-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-700"
            >
              Actual
            </button>
          )}
        </div>

        {/* Acciones rápidas y alertas */}
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <button
              type="button"
              onClick={() => setView('budgets')}
              title="Ver alertas de presupuesto"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="hidden sm:inline">{alertCount} alerta{alertCount > 1 ? 's' : ''}</span>
              <span className="sm:hidden">{alertCount}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openQuickTransaction('income')}
            className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 md:inline-flex"
          >
            <ArrowUpCircle size={15} />
            Ingreso
          </button>

          <button
            type="button"
            onClick={() => openQuickTransaction('expense')}
            className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 md:inline-flex"
          >
            <ArrowDownCircle size={15} />
            Registrar gasto
          </button>

          <button
            type="button"
            onClick={() => setView('reports')}
            title="Reportes PDF / Excel"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileDown size={15} className="text-slate-500" />
            <span className="hidden lg:inline">Exportar</span>
          </button>

          {desktop?.isDesktop && (
            <div className="hidden items-center gap-1.5 border-l border-slate-200 pl-2 sm:flex">
              <button
                type="button"
                onClick={() => {
                  desktop.openDataFolder().catch(() => undefined);
                }}
                title={`Base de datos SQLite local: ${desktop.dbPath}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                <FolderOpen size={14} className="text-slate-500" />
                <span className="hidden xl:inline">Datos</span>
              </button>

              {updateStatus.state === 'downloaded' ? (
                <button
                  type="button"
                  onClick={() => {
                    desktop.installUpdate().catch(() => undefined);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Download size={14} />
                  Instalar v{updateStatus.version ?? ''}
                </button>
              ) : updateStatus.state === 'downloading' ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-2 text-xs font-semibold text-brand-700">
                  <Download size={14} className="animate-bounce" />
                  {Math.round(updateStatus.progressPercent ?? 0)}%
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckUpdates}
                  disabled={checkingUpdate || updateStatus.state === 'checking'}
                  title="Buscar nuevas versiones de MyWallet"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 disabled:opacity-60"
                >
                  <RefreshCw
                    size={13}
                    className={
                      checkingUpdate || updateStatus.state === 'checking'
                        ? 'animate-spin text-brand-600'
                        : 'text-slate-500'
                    }
                  />
                  <span>v{desktop.appVersion}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
