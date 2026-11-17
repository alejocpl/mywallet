/**
 * Barra de progreso reutilizable con estados visuales (normal, advertencia, excedido).
 */
import type { BudgetStatusLevel } from '../../types';

interface ProgressBarProps {
  value: number;
  status?: BudgetStatusLevel;
  color?: string;
  heightClass?: string;
}

const STATUS_CLASSES: Record<BudgetStatusLevel, string> = {
  ok: 'bg-brand-600',
  warning: 'bg-amber-500',
  exceeded: 'bg-rose-600',
};

export function ProgressBar({
  value,
  status = 'ok',
  color,
  heightClass = 'h-2.5',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${heightClass}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color ? '' : STATUS_CLASSES[status]}`}
        style={{ width: `${clamped}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
