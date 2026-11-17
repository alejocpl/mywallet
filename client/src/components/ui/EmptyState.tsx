/**
 * Estado vacío que utiliza la ilustración reemplazable definida en `BRAND.assets.emptyState`.
 */
import type { ReactNode } from 'react';
import { BRAND } from '../../config/brand';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <img
        src={BRAND.assets.emptyState}
        alt="Sin datos registrados"
        className="mb-4 h-28 w-auto select-none"
      />
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
