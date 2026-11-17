/**
 * Tarjeta de indicador clave (KPI) con variación porcentual respecto al mes anterior.
 */
import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatPercent } from '../../utils/format';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  /** Cuando true, un incremento (%) se muestra como negativo (ej. en gastos). */
  invertChangeColor?: boolean;
  icon: ReactNode;
  accentClass?: string;
}

export function StatCard({
  label,
  value,
  hint,
  change,
  invertChangeColor = false,
  icon,
  accentClass = 'bg-brand-50 text-brand-600',
}: StatCardProps) {
  const hasChange = change !== undefined && change !== null;
  const isUp = (change ?? 0) > 0;
  const isPositiveOutcome = invertChangeColor ? !isUp : isUp;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        {hasChange ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
              change === 0
                ? 'bg-slate-100 text-slate-600'
                : isPositiveOutcome
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
            }`}
          >
            {change !== 0 && (isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
            {formatPercent(change, true)} vs mes ant.
          </span>
        ) : (
          <span className="text-slate-400">Sin base comparativa</span>
        )}
        {hint && <span className="truncate text-slate-500">{hint}</span>}
      </div>
    </div>
  );
}
