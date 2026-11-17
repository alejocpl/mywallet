/**
 * Gráfico de barras de los últimos 6 meses: Ingresos vs Gastos vs Ahorro.
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
import type { TrendPoint } from '../../types';
import { formatMoney, formatMoneyCompact } from '../../utils/format';

interface CashflowTrendChartProps {
  data: TrendPoint[];
}

export function CashflowTrendChart({ data }: CashflowTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400">
        No hay suficientes datos históricos todavía.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#64748B' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
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
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
              fontSize: '12px',
            }}
            formatter={(value, name) => [formatMoney(Number(value ?? 0)), String(name)]}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Bar dataKey="income" name="Ingresos" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenses" name="Gastos" fill="#E11D48" radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="savings" name="Ahorro" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
