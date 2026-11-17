/**
 * Vista de Presupuestos Mensuales:
 * Permite definir topes de gasto por categoría, desglosarlos en subcategorías
 * con frecuencia mensual (ej. Spotify 1x/mes, Motilada 4x/mes) que suman
 * automáticamente a la categoría principal, copiar del mes anterior y ver alertas.
 */
import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Layers,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { EssentialChecklistCard } from '../../components/essentials/EssentialChecklistCard';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';
import { Modal } from '../../components/ui/Modal';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CategoryIcon } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { budgetsApi, categoriesApi } from '../../services/api';
import type { Budget, BudgetStatusLevel, Subcategory } from '../../types';
import { formatMoney, monthLabel } from '../../utils/format';

const STATUS_BADGE: Record<
  BudgetStatusLevel,
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  ok: { label: 'En control', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  warning: { label: 'Cerca del límite', cls: 'bg-amber-50 text-amber-800', Icon: AlertTriangle },
  exceeded: { label: '¡Presupuesto superado!', cls: 'bg-rose-50 text-rose-700', Icon: XCircle },
};

export function BudgetsView() {
  const { month, budgets, categories, refreshAll, notify } = useWallet();

  // Estado modal de presupuesto
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estado modal de subcategoría
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<number>(0);
  const [subName, setSubName] = useState('');
  const [subUnitAmount, setSubUnitAmount] = useState('');
  const [subFrequency, setSubFrequency] = useState('1');
  const [subRecordExpense, setSubRecordExpense] = useState(false);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  function openCreate() {
    const usedIds = new Set(budgets?.items.map((b) => b.categoryId) ?? []);
    const firstAvailable = expenseCategories.find((c) => !usedIds.has(c.id)) ?? expenseCategories[0];
    setEditingBudget(null);
    setCategoryId(firstAvailable?.id ?? 0);
    setAmount('');
    setModalOpen(true);
  }

  function openEdit(b: Budget) {
    setEditingBudget(b);
    setCategoryId(b.categoryId);
    setAmount(String(b.amount));
    setModalOpen(true);
  }

  function openAddSubcategory(targetCatId?: number) {
    const defaultCat =
      expenseCategories.find((c) => c.id === targetCatId) ??
      expenseCategories.find((c) => c.name === 'Suscripciones') ??
      expenseCategories[0];
    setEditingSub(null);
    setSubCategoryId(defaultCat?.id ?? 0);
    setSubName('');
    setSubUnitAmount('');
    setSubFrequency('1');
    setSubRecordExpense(false);
    setSubModalOpen(true);
  }

  function openEditSubcategory(sub: Subcategory) {
    setEditingSub(sub);
    setSubCategoryId(sub.categoryId);
    setSubName(sub.name);
    setSubUnitAmount(String(sub.unitAmount));
    setSubFrequency(String(sub.frequencyMonth));
    setSubRecordExpense(false);
    setSubModalOpen(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0 || !categoryId) return;

    setSubmitting(true);
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget.id, numeric);
        notify('Presupuesto actualizado', `${editingBudget.categoryName}: ${formatMoney(numeric)}`, 'success');
      } else {
        await budgetsApi.upsert({ categoryId, month, amount: numeric });
        notify('Presupuesto guardado', `Límite asignado para ${monthLabel(month)}.`, 'success');
      }
      await refreshAll();
      setModalOpen(false);
    } catch (err) {
      notify('Error al guardar', err instanceof Error ? err.message : 'Intenta nuevamente', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveSubcategory(e: FormEvent) {
    e.preventDefault();
    const unit = Number(subUnitAmount);
    const freq = Math.max(1, Math.floor(Number(subFrequency) || 1));
    if (!subName.trim() || !Number.isFinite(unit) || unit <= 0 || !subCategoryId) return;

    setSubmitting(true);
    try {
      if (editingSub) {
        const updatedCat = await categoriesApi.updateSubcategory(editingSub.id, {
          name: subName.trim(),
          unitAmount: unit,
          frequencyMonth: freq,
          month,
        });
        notify(
          'Subcategoría actualizada',
          `${updatedCat.name} ahora suma ${formatMoney(updatedCat.subcategoriesTotal)}/mes.`,
          'success',
        );
      } else {
        const updatedCat = await categoriesApi.addSubcategory(subCategoryId, {
          name: subName.trim(),
          unitAmount: unit,
          frequencyMonth: freq,
          month,
          recordExpense: subRecordExpense,
        });
        notify(
          'Subcategoría agregada',
          `${updatedCat.name} se actualizó a ${formatMoney(updatedCat.subcategoriesTotal)}/mes.`,
          'success',
        );
      }
      await refreshAll();
      setSubModalOpen(false);
    } catch (err) {
      notify('Error en subcategoría', err instanceof Error ? err.message : 'Intenta nuevamente', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSubcategory(sub: Subcategory) {
    try {
      const updatedCat = await categoriesApi.removeSubcategory(sub.id, month);
      await refreshAll();
      notify(
        'Subcategoría eliminada',
        updatedCat.subcategoriesTotal > 0
          ? `${updatedCat.name} ahora suma ${formatMoney(updatedCat.subcategoriesTotal)}/mes.`
          : `Se eliminó "${sub.name}".`,
        'info',
      );
    } catch (err) {
      notify('Error al eliminar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  async function handleCopyPrevious() {
    try {
      const res = await budgetsApi.copy(month);
      await refreshAll();
      if (res.copied > 0) {
        notify(
          'Presupuestos copiados',
          `Se importaron ${res.copied} presupuesto(s) desde ${monthLabel(res.fromMonth)}.`,
          'success',
        );
      } else {
        notify(
          'Sin cambios',
          'No había presupuestos nuevos por copiar del mes anterior.',
          'info',
        );
      }
    } catch (err) {
      notify('Error al copiar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  async function handleDelete(b: Budget) {
    try {
      await budgetsApi.remove(b.id);
      await refreshAll();
      notify('Presupuesto eliminado', b.categoryName, 'info');
    } catch (err) {
      notify('Error al eliminar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  const totals = budgets?.totals ?? { budgeted: 0, spent: 0, remaining: 0, percentage: 0 };
  const overallStatus: BudgetStatusLevel =
    totals.spent > totals.budgeted && totals.budgeted > 0
      ? 'exceeded'
      : totals.percentage >= 80
        ? 'warning'
        : 'ok';

  const subPreviewUnit = Number(subUnitAmount) > 0 ? Number(subUnitAmount) : 0;
  const subPreviewFreq = Math.max(1, Math.floor(Number(subFrequency) || 1));
  const subPreviewTotal = subPreviewUnit * subPreviewFreq;
  const selectedSubCategoryName =
    expenseCategories.find((c) => c.id === subCategoryId)?.name ?? 'Categoría';

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Presupuestos Mensuales
          </h1>
          <p className="text-sm text-slate-500">
            Control de topes y subcategorías por categoría en {monthLabel(month)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCopyPrevious()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Copy size={14} />
            Copiar mes anterior
          </button>
          <button
            type="button"
            onClick={() => openAddSubcategory()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            <Layers size={14} />
            Agregar subcategoría
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus size={15} />
            Crear presupuesto
          </button>
        </div>
      </div>

      {/* Resumen general de presupuestos */}
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Total presupuestado</span>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(totals.budgeted)}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Total gastado</span>
            <p className="mt-1 text-xl font-bold text-rose-600">{formatMoney(totals.spent)}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Disponible en límites</span>
            <p
              className={`mt-1 text-xl font-bold ${
                totals.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatMoney(totals.remaining)}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500">Consumo global</span>
            <p className="mt-1 text-xl font-bold text-slate-900">{totals.percentage}%</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={totals.percentage} status={overallStatus} heightClass="h-3" />
        </div>
      </Card>

      {/* Alertas activas */}
      {budgets && budgets.alerts.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
            <AlertTriangle size={18} className="text-rose-600" />
            <span>
              {budgets.alerts.length} categoría{budgets.alerts.length > 1 ? 's' : ''} requiere
              {budgets.alerts.length > 1 ? 'n' : ''} atención
            </span>
          </div>
          <p className="mt-1 text-xs text-rose-800">
            Cuando alcanzas el 80% del límite recibirás una advertencia, y al superarlo se marcará en rojo.
          </p>
        </div>
      )}

      {/* Checklist de pagos esenciales */}
      <EssentialChecklistCard />

      {/* Tarjetas por categoría */}
      {!budgets || budgets.items.length === 0 ? (
        <EmptyState
          title="Sin presupuestos definidos este mes"
          description="Asigna un límite mensual para Alimentación, Suscripciones u Ocio, agrega subcategorías o copia los del mes anterior."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopyPrevious()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Copiar mes anterior
              </button>
              <button
                type="button"
                onClick={() => openAddSubcategory()}
                className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                Agregar subcategoría
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Crear primer presupuesto
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.items.map((b) => {
            const badge = STATUS_BADGE[b.status];
            const BadgeIcon = badge.Icon;

            return (
              <div
                key={b.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-card transition ${
                  b.status === 'exceeded'
                    ? 'border-rose-200 ring-1 ring-rose-100'
                    : b.status === 'warning'
                      ? 'border-amber-200'
                      : 'border-slate-200/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${b.categoryColor}18` }}
                      >
                        <CategoryIcon name={b.categoryIcon} size={19} color={b.categoryColor} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{b.categoryName}</h3>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                        >
                          <BadgeIcon size={12} />
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        aria-label="Editar presupuesto"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(b)}
                        aria-label="Eliminar presupuesto"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">
                        Gastado: <strong className="text-slate-900">{formatMoney(b.spent)}</strong>
                      </span>
                      <span className="font-bold text-slate-900">{b.percentage}%</span>
                    </div>

                    <ProgressBar value={b.percentage} status={b.status} />

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Límite: {formatMoney(b.amount)}</span>
                      <span
                        className={
                          b.remaining < 0
                            ? 'font-semibold text-rose-600'
                            : 'font-medium text-emerald-700'
                        }
                      >
                        {b.remaining >= 0
                          ? `Quedan ${formatMoney(b.remaining)}`
                          : `Excedido por ${formatMoney(Math.abs(b.remaining))}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sección de subcategorías */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <Layers size={12} />
                      Subcategorías ({b.subcategories.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddSubcategory(b.categoryId)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                    >
                      <Plus size={12} />
                      Subcategoría
                    </button>
                  </div>

                  {b.subcategories.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Sin desglose. Agrega ítems (ej. Spotify, Motilada) para calcular el total automáticamente.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {b.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-slate-800">
                              {sub.name}
                            </span>
                            {sub.frequencyMonth > 1 && (
                              <span className="text-[10px] text-slate-400">
                                {sub.frequencyMonth}x al mes × {formatMoney(sub.unitAmount)}
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className="font-semibold text-slate-900">
                              {formatMoney(sub.monthlyTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditSubcategory(sub)}
                              aria-label={`Editar ${sub.name}`}
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-brand-600"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSubcategory(sub)}
                              aria-label={`Eliminar ${sub.name}`}
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between px-1 pt-1 text-[11px] font-semibold text-brand-700">
                        <span>Suma subcategorías</span>
                        <span>{formatMoney(b.subcategoriesTotal)} / mes</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear / editar presupuesto */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudget ? `Editar: ${editingBudget.categoryName}` : 'Nuevo presupuesto mensual'}
        subtitle={`Periodo: ${monthLabel(month)}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editingBudget && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Categoría de gasto
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Monto límite mensual (COP)
            </label>
            <FormattedNumberInput
              prefix="COP $"
              required
              autoFocus
              value={amount}
              onChange={setAmount}
              placeholder="Ej. 800,000"
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-14 pr-3 text-base font-bold text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar límite'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal crear / editar subcategoría */}
      <Modal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        title={editingSub ? `Editar subcategoría: ${editingSub.name}` : 'Agregar subcategoría'}
        subtitle={`Categoría principal: ${selectedSubCategoryName} · Se suma automáticamente al presupuesto`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveSubcategory} className="space-y-4">
          {!editingSub && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Categoría principal
              </label>
              <select
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                {expenseCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Nombre de la subcategoría
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={60}
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              placeholder={
                selectedSubCategoryName === 'Inversiones'
                  ? 'Ej. Finca raíz, Bolsa, Acciones, CDT...'
                  : 'Ej. Spotify, Motilada, Netflix...'
              }
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
            {!editingSub &&
              (selectedSubCategoryName === 'Inversiones' ||
                selectedSubCategoryName === 'Suscripciones') && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(selectedSubCategoryName === 'Inversiones'
                    ? ['Finca raíz', 'Bolsa', 'Acciones', 'CDT / Fondos']
                    : ['Spotify', 'Netflix', 'Gimnasio']
                  ).map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => setSubName(tpl)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Valor por cada vez (COP)
              </label>
              <FormattedNumberInput
                required
                value={subUnitAmount}
                onChange={setSubUnitAmount}
                placeholder="22,000"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Veces al mes
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={subFrequency}
                onChange={(e) => setSubFrequency(e.target.value)}
                placeholder="4"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-brand-900">
              Total mensual para {selectedSubCategoryName}:
            </span>
            <span className="text-sm font-bold text-brand-700">
              {formatMoney(subPreviewTotal)}
            </span>
          </div>

          {!editingSub && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={subRecordExpense}
                onChange={(e) => setSubRecordExpense(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Registrar también este gasto en los movimientos de {monthLabel(month)}</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSubModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar subcategoría'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
