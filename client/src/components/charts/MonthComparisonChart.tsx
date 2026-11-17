/**
 * Gráfico comparativo agrupado: gastos por categoría del mes actual vs mes anterior.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryComparison } from '../../types';
import { formatMoney, formatMoneyCompact } from '../../utils/format';

interface MonthComparisonChartProps {
  categories: CategoryComparison[];
  currentLabel: string;
  previousLabel: string;
}

export function MonthComparisonChart({
  categories,
  currentLabel,
  previousLabel,
}: MonthComparisonChartProps) {
  const top = categories.slice(0, 8);

  if (top.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        No hay gastos para comparar entre ambos meses.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoneyCompact(v)}
            tick={{ fontSize: 11, fill: '#64748B' }}
            axisLine={false}
            tickLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: '#F8FAFC' }}
            contentStyle={{
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
            }}
            formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="previous" name={previousLabel} fill="#94A3B8" radius={[5, 5, 0, 0]} maxBarSize={24} />
          <Bar dataKey="current" name={currentLabel} fill="#2563EB" radius={[5, 5, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
