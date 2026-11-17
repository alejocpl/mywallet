/**
 * Vista de Metas de Ahorro y Control de Deudas:
 *  - Metas: creación de objetivos con fecha límite, cálculo de ahorro mensual
 *    necesario, registro de aportes/retiros e historial.
 *  - Deudas: registro de obligaciones, cálculo de meses para liquidar,
 *    priorización automática (Método Avalancha) y registro de abonos.
 */
import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Flame,
  History,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { COLOR_PALETTE, CategoryIcon, ICON_OPTIONS } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { debtsApi, goalsApi } from '../../services/api';
import type { Debt, Goal, GoalContribution } from '../../types';
import { formatDate, formatMoney, today } from '../../utils/format';

export function GoalsAndDebtsView() {
  const { goals, debts, refreshAll, notify, notifyBudgetAlert } = useWallet();
  const [tab, setTab] = useState<'goals' | 'debts'>('goals');

  // ---------- Estado Metas ----------
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [gName, setGName] = useState('');
  const [gTarget, setGTarget] = useState('');
  const [gDeadline, setGDeadline] = useState('');
  const [gIcon, setGIcon] = useState('piggy-bank');
  const [gColor, setGColor] = useState<string>(COLOR_PALETTE[0]);

  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [cMode, setCMode] = useState<'add' | 'withdraw'>('add');
  const [cAmount, setCAmount] = useState('');
  const [cDate, setCDate] = useState(today());
  const [cNote, setCNote] = useState('');
  const [history, setHistory] = useState<GoalContribution[]>([]);

  // ---------- Estado Deudas ----------
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [dName, setDName] = useState('');
  const [dCreditor, setDCreditor] = useState('');
  const [dTotal, setDTotal] = useState('');
  const [dRemaining, setDRemaining] = useState('');
  const [dRate, setDRate] = useState('');
  const [dMonthly, setDMonthly] = useState('');
  const [dDueDay, setDDueDay] = useState('');

  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [pAmount, setPAmount] = useState('');
  const [pDate, setPDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  // ---------- Handlers Metas ----------
  function openCreateGoal() {
    setEditingGoal(null);
    setGName('');
    setGTarget('');
    setGDeadline('');
    setGIcon('piggy-bank');
    setGColor(COLOR_PALETTE[0]);
    setGoalModalOpen(true);
  }

  function openEditGoal(g: Goal) {
    setEditingGoal(g);
    setGName(g.name);
    setGTarget(String(g.targetAmount));
    setGDeadline(g.deadline ?? '');
    setGIcon(g.icon);
    setGColor(g.color);
    setGoalModalOpen(true);
  }

  async function handleSaveGoal(e: FormEvent) {
    e.preventDefault();
    const targetAmount = Number(gTarget);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: gName.trim(),
        targetAmount,
        deadline: gDeadline || null,
        icon: gIcon,
        color: gColor,
      };
      if (editingGoal) {
        await goalsApi.update(editingGoal.id, payload);
        notify('Meta actualizada', payload.name, 'success');
      } else {
        await goalsApi.create(payload);
        notify('Meta creada', `${payload.name} · Objetivo ${formatMoney(targetAmount)}`, 'success');
      }
      await refreshAll();
      setGoalModalOpen(false);
    } catch (err) {
      notify('Error en meta', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteGoal(g: Goal) {
    try {
      await goalsApi.remove(g.id);
      await refreshAll();
      notify('Meta eliminada', g.name, 'info');
    } catch (err) {
      notify('Error al eliminar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  async function openContribute(g: Goal) {
    setContribGoal(g);
    setCMode('add');
    setCAmount('');
    setCDate(today());
    setCNote('');
    setHistory([]);
    try {
      const list = await goalsApi.contributions(g.id);
      setHistory(list);
    } catch {
      // Silencioso si falla historial
    }
  }

  async function handleSubmitContribution(e: FormEvent) {
    e.preventDefault();
    if (!contribGoal) return;
    const raw = Number(cAmount);
    if (!Number.isFinite(raw) || raw <= 0) return;
    const signed = cMode === 'add' ? raw : -raw;

    setSubmitting(true);
    try {
      await goalsApi.contribute(contribGoal.id, {
        amount: signed,
        date: cDate,
        note: cNote.trim(),
      });
      await refreshAll();
      notify(
        cMode === 'add' ? 'Aporte registrado' : 'Retiro registrado',
        `${contribGoal.name} · ${formatMoney(raw)}`,
        'success',
      );
      setContribGoal(null);
    } catch (err) {
      notify('No se pudo registrar', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Handlers Deudas ----------
  function openCreateDebt() {
    setEditingDebt(null);
    setDName('');
    setDCreditor('');
    setDTotal('');
    setDRemaining('');
    setDRate('0');
    setDMonthly('0');
    setDDueDay('');
    setDebtModalOpen(true);
  }

  function openEditDebt(d: Debt) {
    setEditingDebt(d);
    setDName(d.name);
    setDCreditor(d.creditor);
    setDTotal(String(d.totalAmount));
    setDRemaining(String(d.remainingAmount));
    setDRate(String(d.interestRate));
    setDMonthly(String(d.monthlyPayment));
    setDDueDay(d.dueDay ? String(d.dueDay) : '');
    setDebtModalOpen(true);
  }

  async function handleSaveDebt(e: FormEvent) {
    e.preventDefault();
    const totalAmount = Number(dTotal);
    const remainingAmount = dRemaining !== '' ? Number(dRemaining) : totalAmount;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return;

    setSubmitting(true);
    try {
      const payload = {
        name: dName.trim(),
        creditor: dCreditor.trim(),
        totalAmount,
        remainingAmount,
        interestRate: Number(dRate) || 0,
        monthlyPayment: Number(dMonthly) || 0,
        dueDay: dDueDay ? Number(dDueDay) : null,
      };
      if (editingDebt) {
        await debtsApi.update(editingDebt.id, payload);
        notify('Deuda actualizada', payload.name, 'success');
      } else {
        await debtsApi.create(payload);
        notify('Deuda registrada', payload.name, 'success');
      }
      await refreshAll();
      setDebtModalOpen(false);
    } catch (err) {
      notify('Error en deuda', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteDebt(d: Debt) {
    try {
      await debtsApi.remove(d.id);
      await refreshAll();
      notify('Deuda eliminada', d.name, 'info');
    } catch (err) {
      notify('Error al eliminar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  function openPayDebt(d: Debt) {
    setPayDebt(d);
    setPAmount(
      d.monthlyPayment > 0
        ? String(Math.min(d.monthlyPayment, d.remainingAmount))
        : String(d.remainingAmount),
    );
    setPDate(today());
  }

  async function handleSubmitPayment(e: FormEvent) {
    e.preventDefault();
    if (!payDebt) return;
    const numeric = Number(pAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;

    setSubmitting(true);
    try {
      const res = await debtsApi.pay(payDebt.id, { amount: numeric, date: pDate });
      await refreshAll();
      notify(
        'Abono registrado',
        `Pagaste ${formatMoney(numeric)} a ${payDebt.name}. Se descontó de tu balance del mes.`,
        'success',
      );
      if (res.alert) notifyBudgetAlert(res.alert);
      setPayDebt(null);
    } catch (err) {
      notify('No se pudo registrar el pago', err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="space-y-6">
      {/* Cabecera y selector de pestaña */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Metas de Ahorro y Deudas
          </h1>
          <p className="text-sm text-slate-500">
            Planifica tus objetivos y optimiza el pago de tus obligaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setTab('goals')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                tab === 'goals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <PiggyBank size={14} />
              Metas ({goals.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('debts')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                tab === 'debts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <CreditCard size={14} />
              Deudas ({debts?.items.length ?? 0})
            </button>
          </div>

          <button
            type="button"
            onClick={tab === 'goals' ? openCreateGoal : openCreateDebt}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={15} />
            {tab === 'goals' ? 'Nueva meta' : 'Nueva deuda'}
          </button>
        </div>
      </div>

      {/* ================= METAS DE AHORRO ================= */}
      {tab === 'goals' && (
        <>
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs font-medium text-slate-500">Total ahorrado</span>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {formatMoney(totalGoalSaved)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Objetivo combinado</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatMoney(totalGoalTarget)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Metas completadas</span>
                <p className="mt-1 text-2xl font-bold text-brand-600">
                  {goals.filter((g) => g.completed).length} de {goals.length}
                </p>
              </div>
            </div>
          </Card>

          {goals.length === 0 ? (
            <EmptyState
              title="Aún no tienes metas de ahorro"
              description="Define un fondo de emergencia, un viaje o una compra importante y calcula cuánto ahorrar cada mes."
              action={
                <button
                  type="button"
                  onClick={openCreateGoal}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Establecer primera meta
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${g.color}18` }}
                        >
                          <CategoryIcon name={g.icon} size={20} color={g.color} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{g.name}</h3>
                          {g.completed ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={12} />
                              ¡Meta cumplida!
                            </span>
                          ) : g.deadline ? (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                              <Calendar size={12} />
                              Límite: {formatDate(g.deadline)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Sin fecha límite</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditGoal(g)}
                          aria-label="Editar meta"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteGoal(g)}
                          aria-label="Eliminar meta"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-bold text-slate-900">
                          {formatMoney(g.currentAmount)}
                        </span>
                        <span className="text-slate-500">
                          de {formatMoney(g.targetAmount)} ({g.progress}%)
                        </span>
                      </div>
                      <ProgressBar value={g.progress} color={g.color} />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Falta: {formatMoney(g.remaining)}</span>
                        {g.monthlyNeeded !== null && !g.completed && (
                          <span className="font-semibold text-brand-700">
                            {formatMoney(g.monthlyNeeded)}/mes sugerido
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void openContribute(g)}
                    className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-800 transition hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Aportar / Ver historial
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ================= DEUDAS ================= */}
      {tab === 'debts' && (
        <>
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs font-medium text-slate-500">Deuda pendiente total</span>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  {formatMoney(debts?.totals.totalRemaining ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Cuotas mensuales</span>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatMoney(debts?.totals.monthlyPayments ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">Estrategia sugerida</span>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  <Flame size={16} className="text-amber-500" />
                  Método Avalancha (mayor tasa primero)
                </p>
              </div>
            </div>
          </Card>

          {!debts || debts.items.length === 0 ? (
            <EmptyState
              title="No tienes deudas registradas"
              description="Registra tus tarjetas, préstamos o créditos para saber cuánto interés pagas y cuál liquidar primero."
              action={
                <button
                  type="button"
                  onClick={openCreateDebt}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Registrar deuda
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {debts.items.map((d) => {
                const isPriority = d.id === debts.priorityDebtId;
                const isPaidOff = d.remainingAmount === 0;

                return (
                  <div
                    key={d.id}
                    className={`rounded-2xl border bg-white p-5 shadow-card ${
                      isPriority ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{d.name}</h3>
                          {isPriority && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                              <Flame size={12} className="text-amber-600" />
                              Prioridad #1
                            </span>
                          )}
                          {isPaidOff && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={12} />
                              Saldada
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {d.creditor || 'Acreedor no especificado'} · Tasa: {d.interestRate}% anual
                          {d.dueDay ? ` · Vence día ${d.dueDay}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDebt(d)}
                          aria-label="Editar deuda"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDebt(d)}
                          aria-label="Eliminar deuda"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">
                          Pendiente:{' '}
                          <strong className="text-sm text-rose-600">
                            {formatMoney(d.remainingAmount)}
                          </strong>
                        </span>
                        <span className="text-slate-500">
                          Pagado {d.progress}% de {formatMoney(d.totalAmount)}
                        </span>
                      </div>
                      <ProgressBar value={d.progress} color="#059669" />

                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <span className="block text-[10px] text-slate-400">Cuota mensual</span>
                          <span className="font-bold text-slate-800">
                            {formatMoney(d.monthlyPayment)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <span className="block text-[10px] text-slate-400">Interés/mes</span>
                          <span className="font-bold text-slate-800">
                            {formatMoney(d.monthlyInterest)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <span className="block text-[10px] text-slate-400">Tiempo est.</span>
                          <span className="font-bold text-slate-800">
                            {d.monthsToPayoff !== null ? `${d.monthsToPayoff} meses` : '—'}
                          </span>
                        </div>
                      </div>

                      {!d.paymentCoversInterest && !isPaidOff && (
                        <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>La cuota actual no cubre los intereses mensuales generados.</span>
                        </div>
                      )}
                    </div>

                    {!isPaidOff && (
                      <button
                        type="button"
                        onClick={() => openPayDebt(d)}
                        className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        Registrar abono
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Meta */}
      <Modal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        title={editingGoal ? 'Editar meta de ahorro' : 'Establecer meta de ahorro'}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Nombre de la meta
            </label>
            <input
              type="text"
              required
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              placeholder="Ej. Fondo de emergencia, Viaje..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Monto objetivo (COP)
              </label>
              <FormattedNumberInput
                required
                value={gTarget}
                onChange={setGTarget}
                placeholder="10,000,000"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Fecha límite (opcional)
              </label>
              <input
                type="date"
                value={gDeadline}
                onChange={(e) => setGDeadline(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Ícono</label>
            <div className="grid grid-cols-6 gap-1.5">
              {ICON_OPTIONS.slice(0, 18).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setGIcon(opt.key)}
                  className={`flex h-9 items-center justify-center rounded-xl border transition ${
                    gIcon === opt.key
                      ? 'border-brand-600 bg-brand-50 text-brand-600'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <CategoryIcon name={opt.key} size={16} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setGColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    gColor === c ? 'scale-110 border-slate-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGoalModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar meta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Aporte / Historial de Meta */}
      <Modal
        open={Boolean(contribGoal)}
        onClose={() => setContribGoal(null)}
        title={contribGoal ? `Aportes: ${contribGoal.name}` : ''}
        subtitle={
          contribGoal
            ? `Ahorrado ${formatMoney(contribGoal.currentAmount)} de ${formatMoney(contribGoal.targetAmount)}`
            : undefined
        }
      >
        {contribGoal && (
          <div className="space-y-5">
            <form onSubmit={handleSubmitContribution} className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCMode('add')}
                  className={`rounded-lg py-1.5 text-xs font-semibold ${
                    cMode === 'add' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  + Aportar dinero
                </button>
                <button
                  type="button"
                  onClick={() => setCMode('withdraw')}
                  className={`rounded-lg py-1.5 text-xs font-semibold ${
                    cMode === 'withdraw' ? 'bg-rose-600 text-white' : 'text-slate-600'
                  }`}
                >
                  − Retirar dinero
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormattedNumberInput
                  required
                  value={cAmount}
                  onChange={setCAmount}
                  placeholder="Monto (COP)"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand-600"
                />
                <input
                  type="date"
                  required
                  value={cDate}
                  onChange={(e) => setCDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600"
                />
              </div>

              <input
                type="text"
                value={cNote}
                onChange={(e) => setCNote(e.target.value)}
                placeholder="Nota (ej. Ahorro quincenal)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand-600"
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? 'Registrando...' : 'Confirmar movimiento'}
              </button>
            </form>

            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <History size={13} />
                Historial reciente
              </h4>
              {history.length === 0 ? (
                <p className="text-xs text-slate-400">Sin aportes registrados aún.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-medium text-slate-800">
                          {h.note || (h.amount >= 0 ? 'Aporte' : 'Retiro')}
                        </span>
                        <span className="ml-2 text-slate-400">{formatDate(h.date)}</span>
                      </div>
                      <span
                        className={`font-bold ${
                          h.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {h.amount >= 0 ? '+' : ''}
                        {formatMoney(h.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Deuda */}
      <Modal
        open={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        title={editingDebt ? 'Editar deuda' : 'Registrar deuda'}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveDebt} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                required
                value={dName}
                onChange={(e) => setDName(e.target.value)}
                placeholder="Ej. Tarjeta Visa"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Acreedor</label>
              <input
                type="text"
                value={dCreditor}
                onChange={(e) => setDCreditor(e.target.value)}
                placeholder="Ej. Bancolombia"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Monto original (COP)</label>
              <FormattedNumberInput
                required
                value={dTotal}
                onChange={setDTotal}
                placeholder="5,000,000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Saldo pendiente (COP)
              </label>
              <FormattedNumberInput
                value={dRemaining}
                onChange={setDRemaining}
                placeholder="Igual al original"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Tasa anual %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={dRate}
                onChange={(e) => setDRate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Cuota mes (COP)</label>
              <FormattedNumberInput
                value={dMonthly}
                onChange={setDMonthly}
                placeholder="350,000"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold outline-none focus:border-brand-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Día corte</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dDueDay}
                onChange={(e) => setDDueDay(e.target.value)}
                placeholder="15"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDebtModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar deuda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Abono de deuda */}
      <Modal
        open={Boolean(payDebt)}
        onClose={() => setPayDebt(null)}
        title={payDebt ? `Abonar a ${payDebt.name}` : ''}
        subtitle={
          payDebt
            ? `Saldo pendiente actual: ${formatMoney(payDebt.remainingAmount)}`
            : undefined
        }
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-900">
            El abono se registrará automáticamente como un gasto en la categoría <strong>Deudas</strong> y reducirá tu saldo pendiente.
          </p>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Monto a abonar (COP)</label>
            <FormattedNumberInput
              required
              autoFocus
              value={pAmount}
              onChange={setPAmount}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-base font-bold outline-none focus:border-brand-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Fecha del pago</label>
            <input
              type="date"
              required
              value={pDate}
              onChange={(e) => setPDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPayDebt(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Procesando...' : 'Confirmar abono'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
