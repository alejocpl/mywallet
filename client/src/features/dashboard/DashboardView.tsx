/**
 * Vista principal: "¿Cuánto me queda?"
 * Muestra el saldo neto disponible del mes, presupuesto diario restante,
 * alertas activas, KPIs comparativos, distribución 50/30/20, recomendaciones
 * financieras y gráficos de tendencia y categorías.
 */
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Info,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { CashflowTrendChart } from '../../components/charts/CashflowTrendChart';
import { ExpenseCategoryChart } from '../../components/charts/ExpenseCategoryChart';
import { EssentialChecklistCard } from '../../components/essentials/EssentialChecklistCard';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { StatCard } from '../../components/ui/StatCard';
import { BRAND } from '../../config/brand';
import { useWallet } from '../../context/WalletContext';
import { formatMoney } from '../../utils/format';

const GROUP_BAR_COLORS = {
  needs: '#2563EB',
  wants: '#EC4899',
  savings: '#059669',
} as const;

export function DashboardView() {
  const { summary, trend, loading, openQuickTransaction, setView } = useWallet();

  if (loading && !summary) {
    return (
      <div className="space-y-6">
        <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const { totals, changes, alerts, distribution, insights } = summary;
  const isPositiveAvailable = totals.available >= 0;

  return (
    <div className="space-y-6">
      {/* Hero: ¿Cuánto me queda disponible? */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-900 to-brand-700 p-6 text-white shadow-xl sm:p-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
              <Wallet size={14} />
              <span>¿Cuánto me queda disponible? · {summary.label}</span>
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <h1
                className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${
                  isPositiveAvailable ? 'text-white' : 'text-rose-300'
                }`}
              >
                {formatMoney(totals.available)}
              </h1>
              <span className="text-xs text-blue-100/80">
                Ingresos − Gastos − Ahorro en metas
              </span>
            </div>

            {/* Presupuesto diario disponible */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {summary.dailyAllowance !== null ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium text-blue-50 backdrop-blur-sm">
                  <CalendarClock size={15} className="text-emerald-300" />
                  <span>
                    Quedan <strong>{summary.daysLeft} días</strong> del mes ·{' '}
                    <strong>{formatMoney(summary.dailyAllowance)}/día</strong> sugerido
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs text-blue-100">
                  <CalendarClock size={15} />
                  <span>Mes cerrado ({summary.label})</span>
                </div>
              )}

              {summary.debts.count > 0 && (
                <button
                  type="button"
                  onClick={() => setView('goals')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs text-blue-50 transition hover:bg-white/20"
                >
                  <CreditCard size={14} className="text-amber-300" />
                  <span>
                    Cuotas de deuda: <strong>{formatMoney(summary.debts.monthlyPayments)}/mes</strong>
                  </span>
                </button>
              )}
            </div>

            {/* Acciones principales */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openQuickTransaction('income')}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-400"
              >
                <ArrowUpCircle size={17} />
                Ingresar ingreso
              </button>
              <button
                type="button"
                onClick={() => openQuickTransaction('expense')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-blue-50"
              >
                <ArrowDownCircle size={17} className="text-rose-600" />
                Ingresar gasto
              </button>
              <button
                type="button"
                onClick={() => setView('budgets')}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Ver presupuestos
              </button>
            </div>
          </div>

          {/* Ilustración reemplazable */}
          <div className="hidden justify-end lg:col-span-4 lg:flex">
            <img
              src={BRAND.assets.heroIllustration}
              alt="Resumen financiero MyWallet"
              className="max-h-48 w-auto select-none drop-shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Banner de alertas de presupuesto */}
      {alerts.length > 0 && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Atención con tus presupuestos ({alerts.length})
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {alerts
                  .map(
                    (a) =>
                      `${a.categoryName} (${a.percentage}% · ${
                        a.status === 'exceeded' ? 'superado' : 'cerca del límite'
                      })`,
                  )
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView('budgets')}
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Revisar límites
          </button>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos del mes"
          value={formatMoney(totals.income)}
          change={changes.income}
          icon={<TrendingUp size={20} />}
          accentClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Gastos del mes"
          value={formatMoney(totals.expenses)}
          change={changes.expenses}
          invertChangeColor
          icon={<TrendingDown size={20} />}
          accentClass="bg-rose-50 text-rose-600"
        />
        <StatCard
          label="Ahorro del mes"
          value={formatMoney(totals.savings)}
          change={changes.savings}
          hint={`Acumulado: ${formatMoney(summary.goals.totalSaved)}`}
          icon={<PiggyBank size={20} />}
          accentClass="bg-brand-50 text-brand-600"
        />
        <StatCard
          label="Presupuesto restante"
          value={formatMoney(totals.budgetRemaining)}
          hint={
            totals.budgeted > 0
              ? `De ${formatMoney(totals.budgeted)} asignados`
              : 'Sin presupuestos aún'
          }
          icon={<Target size={20} />}
          accentClass={
            totals.budgetRemaining < 0
              ? 'bg-rose-50 text-rose-600'
              : 'bg-indigo-50 text-indigo-600'
          }
        />
      </div>

      {/* Control de pagos esenciales del mes */}
      <EssentialChecklistCard />

      {/* Distribución 50/30/20 + Asesor financiero */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          title="Cómo distribuir tu dinero (Regla 50/30/20)"
          subtitle="Compara tus gastos reales contra la distribución recomendada de tus ingresos"
          className="lg:col-span-7"
        >
          <div className="space-y-5">
            {distribution.map((item) => {
              const overRecommended =
                item.key !== 'savings' && item.actualPercent > item.recommendedPercent;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: GROUP_BAR_COLORS[item.key] }}
                      />
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        Meta: {item.recommendedPercent}%
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-900">
                        {formatMoney(item.actual)} ({item.actualPercent}%)
                      </span>
                      <span className="ml-1.5 text-slate-400">
                        / {formatMoney(item.recommended)}
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    value={
                      item.recommended > 0
                        ? Math.min(100, (item.actual / item.recommended) * 100)
                        : 0
                    }
                    color={overRecommended ? '#E11D48' : GROUP_BAR_COLORS[item.key]}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Diagnóstico financiero"
          subtitle="Recomendaciones automáticas basadas en tus movimientos"
          action={
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              <Sparkles size={12} />
              MyWallet Advisor
            </span>
          }
          className="lg:col-span-5"
        >
          <ul className="space-y-3">
            {insights.map((ins, idx) => {
              const styles =
                ins.type === 'warning'
                  ? { box: 'border-amber-200 bg-amber-50/70 text-amber-900', Icon: AlertTriangle, iconCls: 'text-amber-600' }
                  : ins.type === 'success'
                    ? { box: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', Icon: CheckCircle2, iconCls: 'text-emerald-600' }
                    : { box: 'border-slate-200 bg-slate-50 text-slate-700', Icon: Info, iconCls: 'text-brand-600' };

              return (
                <li
                  key={idx}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${styles.box}`}
                >
                  <styles.Icon size={16} className={`mt-0.5 shrink-0 ${styles.iconCls}`} />
                  <span>{ins.message}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card
          title="Ingresos, gastos y ahorro (últimos 6 meses)"
          subtitle="Evolución mensual de tu flujo de dinero"
          className="lg:col-span-7"
        >
          <CashflowTrendChart data={trend} />
        </Card>

        <Card
          title="Gastos por categoría"
          subtitle={`Desglose de ${summary.label}`}
          className="lg:col-span-5"
        >
          <ExpenseCategoryChart
            data={summary.expensesByCategory}
            totalExpenses={totals.expenses}
          />
        </Card>
      </div>
    </div>
  );
}
