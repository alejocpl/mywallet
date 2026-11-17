/**
 * Vista de Reportes y Comparativa Mensual:
 *  - Descarga directa del estado financiero en PDF (corporativo) y Excel (.xlsx de 7 hojas)
 *  - Comparativa gráfica y tabular del mes seleccionado frente al mes anterior
 */
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { MonthComparisonChart } from '../../components/charts/MonthComparisonChart';
import { Card } from '../../components/ui/Card';
import { CategoryIcon } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { reportsApi } from '../../services/api';
import { formatMoney, formatPercent, monthLabel } from '../../utils/format';

export function ReportsView() {
  const { month, comparison } = useWallet();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reportes y Comparativa
          </h1>
          <p className="text-sm text-slate-500">
            Exporta tu cierre de {monthLabel(month)} y compara contra el mes anterior
          </p>
        </div>
      </div>

      {/* Tarjetas de exportación PDF y Excel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Reporte ejecutivo PDF</h2>
              <p className="mt-1 text-xs text-slate-500">
                Incluye resumen de disponible, distribución 50/30/20, presupuestos, gráficos de barras y detalle de movimientos.
              </p>
            </div>
          </div>

          <a
            href={reportsApi.pdfUrl(month)}
            download
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
          >
            <Download size={15} />
            PDF
          </a>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Libro de Excel (.xlsx)</h2>
              <p className="mt-1 text-xs text-slate-500">
                7 hojas listas para análisis: Resumen, Movimientos con autofiltro, Categorías, Presupuestos, Tendencia, Metas y Deudas.
              </p>
            </div>
          </div>

          <a
            href={reportsApi.excelUrl(month)}
            download
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Download size={15} />
            Excel
          </a>
        </div>
      </div>

      {/* Comparativa con el mes anterior */}
      {comparison && (
        <>
          <Card
            title="Comparativa mensual"
            subtitle={`${comparison.current.label} vs ${comparison.previous.label}`}
          >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  label: 'Ingresos',
                  curr: comparison.current.income,
                  prev: comparison.previous.income,
                  invert: false,
                },
                {
                  label: 'Gastos',
                  curr: comparison.current.expenses,
                  prev: comparison.previous.expenses,
                  invert: true,
                },
                {
                  label: 'Ahorro en metas',
                  curr: comparison.current.savings,
                  prev: comparison.previous.savings,
                  invert: false,
                },
                {
                  label: 'Disponible',
                  curr: comparison.current.available,
                  prev: comparison.previous.available,
                  invert: false,
                },
              ].map((row) => {
                const diff = row.curr - row.prev;
                const positive = row.invert ? diff <= 0 : diff >= 0;

                return (
                  <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="text-xs font-medium text-slate-500">{row.label}</span>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatMoney(row.curr)}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Ant: {formatMoney(row.prev)}</span>
                      <span
                        className={`font-semibold ${
                          diff === 0
                            ? 'text-slate-500'
                            : positive
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {formatMoney(diff)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card
            title="Comparación de gastos por categoría"
            subtitle="Principales rubros de gasto frente al mes anterior"
          >
            <MonthComparisonChart
              categories={comparison.categories}
              currentLabel={comparison.current.label}
              previousLabel={comparison.previous.label}
            />
          </Card>

          <Card
            title="Detalle de variación por categoría"
            subtitle="Diferencia absoluta y porcentual en tus gastos"
            noPadding
          >
            {comparison.categories.length === 0 ? (
              <p className="p-5 text-xs text-slate-400">
                No hay gastos registrados en ninguno de los dos meses.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Categoría</th>
                      <th className="px-5 py-3 text-right font-semibold">Mes anterior</th>
                      <th className="px-5 py-3 text-right font-semibold">Mes actual</th>
                      <th className="px-5 py-3 text-right font-semibold">Diferencia</th>
                      <th className="px-5 py-3 text-right font-semibold">Variación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparison.categories.map((cat) => {
                      const increased = cat.diff > 0;
                      const decreased = cat.diff < 0;

                      return (
                        <tr key={cat.categoryId} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ backgroundColor: `${cat.color}18` }}
                              >
                                <CategoryIcon name={cat.icon} size={14} color={cat.color} />
                              </span>
                              <span className="font-semibold text-slate-800">{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                            {formatMoney(cat.previous)}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                            {formatMoney(cat.current)}
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-semibold tabular-nums ${
                              increased
                                ? 'text-rose-600'
                                : decreased
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            {cat.diff > 0 ? '+' : ''}
                            {formatMoney(cat.diff)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {cat.change === null ? (
                              <span className="text-slate-400">Nuevo</span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                                  increased
                                    ? 'bg-rose-50 text-rose-700'
                                    : decreased
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {increased && <TrendingUp size={11} />}
                                {decreased && <TrendingDown size={11} />}
                                {formatPercent(cat.change, true)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
