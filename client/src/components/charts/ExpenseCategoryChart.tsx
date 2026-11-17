/**
 * Gráfico circular (donut) con la distribución de gastos por categoría.
 */
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryTotal } from '../../types';
import { formatMoney } from '../../utils/format';

interface ExpenseCategoryChartProps {
  data: CategoryTotal[];
  totalExpenses: number;
}

export function ExpenseCategoryChart({ data, totalExpenses }: ExpenseCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        Aún no hay gastos registrados este mes.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={3}
            >
              {data.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
              }}
              formatter={(value) => formatMoney(Number(value ?? 0))}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Total gasto
          </span>
          <span className="text-sm font-bold text-slate-900">{formatMoney(totalExpenses)}</span>
        </div>
      </div>

      <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {data.map((item) => (
          <li key={item.categoryId} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate font-medium text-slate-700">{item.name}</span>
            </div>
            <div className="shrink-0 text-right">
              <span className="font-semibold text-slate-900">{formatMoney(item.total)}</span>
              <span className="ml-1.5 text-slate-400">{item.percentage}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
