/**
 * Modal rápido para registrar o editar un gasto o ingreso de dinero.
 * Se puede invocar desde cualquier pantalla mediante el menú flotante o el header.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Layers, Plus } from 'lucide-react';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';
import { Modal } from '../../components/ui/Modal';
import { CategoryIcon } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { transactionsApi } from '../../services/api';
import type { TransactionType } from '../../types';
import { formatMoney, today } from '../../utils/format';
import { CategoryModal } from './CategoryModal';

export function TransactionModal() {
  const {
    quickTx,
    closeQuickTransaction,
    categories,
    refreshAll,
    notify,
    notifyBudgetAlert,
  } = useWallet();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [subMode, setSubMode] = useState<'unit' | 'monthly'>('unit');

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const selectedCategory = useMemo(
    () => filteredCategories.find((c) => c.id === categoryId) ?? null,
    [filteredCategories, categoryId],
  );

  // Sincroniza valores al abrir el modal o cambiar entre crear/editar.
  useEffect(() => {
    if (!quickTx.open) return;
    setError(null);
    if (quickTx.editing) {
      setType(quickTx.editing.type);
      setAmount(String(quickTx.editing.amount));
      setCategoryId(quickTx.editing.categoryId);
      setDate(quickTx.editing.date);
      setDescription(quickTx.editing.description);
    } else {
      setType(quickTx.defaultType);
      setAmount('');
      setDate(today());
      setDescription('');
      const first = categories.find((c) => c.type === quickTx.defaultType);
      setCategoryId(first?.id ?? 0);
    }
  }, [quickTx, categories]);

  // Asegura que siempre exista una categoría válida seleccionada al cambiar el tipo.
  useEffect(() => {
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id ?? 0);
    }
  }, [filteredCategories, categoryId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Ingresa un monto mayor a cero');
      return;
    }
    if (!categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        amount: numericAmount,
        categoryId,
        description: description.trim(),
        date,
      };
      const result = quickTx.editing
        ? await transactionsApi.update(quickTx.editing.id, payload)
        : await transactionsApi.create(payload);

      await refreshAll();
      notify(
        quickTx.editing ? 'Movimiento actualizado' : type === 'income' ? 'Ingreso registrado' : 'Gasto registrado',
        `${result.transaction.categoryName} · ${result.transaction.description || 'Sin descripción'}`,
        'success',
      );
      if (result.alert) {
        notifyBudgetAlert(result.alert);
      }
      closeQuickTransaction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el movimiento');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open={quickTx.open}
        onClose={closeQuickTransaction}
        title={quickTx.editing ? 'Editar movimiento' : 'Registrar movimiento'}
        subtitle="Clasifica tus ingresos y gastos para mantener tu balance al día"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Selector Gasto / Ingreso */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowDownCircle size={17} />
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowUpCircle size={17} />
              Ingreso
            </button>
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Monto (COP)</label>
              <FormattedNumberInput
                prefix="COP $"
                required
                autoFocus
                value={amount}
                onChange={setAmount}
                placeholder="Ej. 45,000"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-14 pr-3 text-base font-bold text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">Fecha</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {/* Categorías */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">Categoría</label>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <Plus size={13} />
                Nueva categoría
              </button>
            </div>

            <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {filteredCategories.map((cat) => {
                const selected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition ${
                      selected
                        ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${cat.color}18` }}
                    >
                      <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                    </span>
                    <span className="w-full truncate text-[11px] font-medium">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategorías de llenado rápido */}
          {selectedCategory && selectedCategory.subcategories.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <Layers size={12} className="text-brand-600" />
                  Subcategorías de {selectedCategory.name}
                </span>

                <div className="inline-flex rounded-lg bg-white p-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setSubMode('unit')}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                      subMode === 'unit'
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    1 vez
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubMode('monthly')}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                      subMode === 'monthly'
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Total del mes
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedCategory.subcategories.map((sub) => {
                  const chosenAmount =
                    subMode === 'unit' ? sub.unitAmount : sub.monthlyTotal;
                  const chosenDesc =
                    subMode === 'monthly' && sub.frequencyMonth > 1
                      ? `${sub.name} (${sub.frequencyMonth}x al mes)`
                      : sub.name;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setAmount(String(chosenAmount));
                        setDescription(chosenDesc);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-800"
                    >
                      <span>{sub.name}</span>
                      <span className="font-bold text-slate-900">
                        {formatMoney(chosenAmount)}
                      </span>
                      {subMode === 'monthly' && sub.frequencyMonth > 1 && (
                        <span className="text-[10px] text-slate-400">
                          ({sub.frequencyMonth}x)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Descripción (opcional)
            </label>
            <input
              type="text"
              maxLength={140}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'expense'
                  ? 'Ej. Supermercado, gasolina, cena...'
                  : 'Ej. Salario mensual, proyecto freelance...'
              }
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeQuickTransaction}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {submitting
                ? 'Guardando...'
                : quickTx.editing
                  ? 'Guardar cambios'
                  : type === 'income'
                    ? 'Guardar ingreso'
                    : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </Modal>

      <CategoryModal
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        defaultType={type}
        onCreated={(cat) => {
          setType(cat.type);
          setCategoryId(cat.id);
        }}
      />
    </>
  );
}
