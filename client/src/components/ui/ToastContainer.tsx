/**
 * Notificaciones flotantes en la esquina superior derecha.
 * Muestra confirmaciones y alertas inmediatas cuando se supera un presupuesto.
 */
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useWallet, type ToastLevel } from '../../context/WalletContext';

const STYLES: Record<ToastLevel, { box: string; icon: typeof Info; iconClass: string }> = {
  success: {
    box: 'border-emerald-200 bg-white text-slate-900',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  warning: {
    box: 'border-amber-300 bg-amber-50 text-amber-950',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
  },
  error: {
    box: 'border-rose-300 bg-rose-50 text-rose-950',
    icon: XCircle,
    iconClass: 'text-rose-600',
  },
  info: {
    box: 'border-slate-200 bg-white text-slate-900',
    icon: Info,
    iconClass: 'text-brand-600',
  },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useWallet();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2.5 px-2 sm:px-0">
      {toasts.map((t) => {
        const cfg = STYLES[t.level];
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-2xl border p-3.5 shadow-lg transition-all ${cfg.box}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.iconClass}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="mt-0.5 text-xs opacity-85">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Cerrar notificación"
              className="rounded-lg p-1 opacity-60 hover:bg-black/5 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
