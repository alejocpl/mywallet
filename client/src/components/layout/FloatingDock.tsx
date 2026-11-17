/**
 * Menú flotante fijo en la parte inferior de la pantalla.
 * Permite navegar por todos los módulos de MyWallet con un solo toque
 * e incluye un botón de acción rápida (+ Registrar) para gastos o ingresos.
 */
import {
  ArrowLeftRight,
  FileBarChart2,
  PieChart,
  Plus,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '../../config/navigation';
import { useWallet } from '../../context/WalletContext';

const DOCK_ICONS: Record<NavItem['icon'], LucideIcon> = {
  wallet: Wallet,
  'arrow-left-right': ArrowLeftRight,
  'pie-chart': PieChart,
  target: Target,
  'file-bar-chart': FileBarChart2,
};

export function FloatingDock() {
  const { view, setView, summary, openQuickTransaction } = useWallet();
  const alertCount = summary?.alerts.length ?? 0;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-dock backdrop-blur-xl sm:gap-2 sm:px-3 sm:py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = DOCK_ICONS[item.icon];
          const isActive = view === item.id;
          const showAlertBadge = item.id === 'budgets' && alertCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              title={item.description}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-xs ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{item.shortLabel}</span>

              {showAlertBadge && (
                <span
                  className={`absolute right-1.5 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold sm:static sm:ml-0.5 ${
                    isActive
                      ? 'bg-amber-300 text-slate-900'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}

        {/* Botón rápido central/lateral para registrar movimiento desde cualquier pantalla */}
        <button
          type="button"
          onClick={() => openQuickTransaction('expense')}
          title="Ingresar gasto o ingreso rápido"
          className="ml-0.5 flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 sm:px-4"
        >
          <Plus size={18} />
          <span className="hidden md:inline">Registrar</span>
        </button>
      </div>
    </nav>
  );
}
