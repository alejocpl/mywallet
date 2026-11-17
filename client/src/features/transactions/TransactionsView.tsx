/**
 * Vista de Movimientos:
 * Permite ingresar ingresos y gastos, filtrar por tipo/categoría/texto,
 * gestionar categorías personalizadas y editar o eliminar registros.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { CategoryIcon } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { categoriesApi, transactionsApi } from '../../services/api';
import type { Transaction, TransactionType } from '../../types';
import { formatDate, formatMoney, monthLabel } from '../../utils/format';
import { CategoryModal } from './CategoryModal';

export function TransactionsView() {
  const { month, categories, openQuickTransaction, refreshAll, refreshKey, notify } = useWallet();

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showCatModal, setShowCatModal] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionsApi.list({
        month,
        type: typeFilter === 'all' ? undefined : typeFilter,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        search: search.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      notify(
        'Error al cargar movimientos',
        err instanceof Error ? err.message : 'Intenta nuevamente',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [month, typeFilter, categoryFilter, search, notify]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshKey]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of items) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [items]);

  const customCategories = useMemo(
    () => categories.filter((c) => !c.isDefault),
    [categories],
  );

  async function handleDelete(tx: Transaction) {
    try {
      await transactionsApi.remove(tx.id);
      await refreshAll();
      notify('Movimiento eliminado', `${tx.categoryName} (${formatMoney(tx.amount)})`, 'info');
    } catch (err) {
      notify('No se pudo eliminar', err instanceof Error ? err.message : 'Error', 'error');
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    try {
      await categoriesApi.remove(id);
      await refreshAll();
      notify('Categoría eliminada', `Se eliminó "${name}".`, 'info');
    } catch (err) {
      notify(
        'No se puede eliminar',
        err instanceof Error ? err.message : 'La categoría tiene movimientos asociados',
        'warning',
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera de módulo */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Ingresos y Gastos
          </h1>
          <p className="text-sm text-slate-500">
            Historial clasificado de {monthLabel(month)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCatModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Tag size={14} />
            Nueva categoría
          </button>
          <button
            type="button"
            onClick={() => openQuickTransaction('income')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <ArrowUpCircle size={15} />
            Ingresar ingreso
          </button>
          <button
            type="button"
            onClick={() => openQuickTransaction('expense')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <ArrowDownCircle size={15} />
            Ingresar gasto
          </button>
        </div>
      </div>

      {/* Filtros y resumen rápido */}
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  typeFilter === t
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'expense' ? 'Solo gastos' : 'Solo ingresos'}
              </button>
            ))}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-600"
            >
              <option value="">Todas las categorías</option>
              {categories
                .filter((c) => typeFilter === 'all' || c.type === typeFilter)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'income' ? 'Ingreso' : 'Gasto'})
                  </option>
                ))}
            </select>
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descripción o categoría..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        {/* Barra de totales filtrados */}
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center sm:text-left">
          <div>
            <span className="block text-[11px] font-medium text-slate-500">Ingresos filtrados</span>
            <span className="text-sm font-bold text-emerald-600">{formatMoney(totals.income)}</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-500">Gastos filtrados</span>
            <span className="text-sm font-bold text-rose-600">{formatMoney(totals.expense)}</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-500">Balance neto</span>
            <span
              className={`text-sm font-bold ${
                totals.net >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}
            >
              {formatMoney(totals.net)}
            </span>
          </div>
        </div>
      </Card>

      {/* Lista de movimientos */}
      <Card noPadding>
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No hay movimientos con estos filtros"
              description="Registra un ingreso o gasto para comenzar a visualizar tu flujo de dinero este mes."
              action={
                <button
                  type="button"
                  onClick={() => openQuickTransaction('expense')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  <Plus size={14} />
                  Registrar primer movimiento
                </button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-slate-50/70"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${tx.categoryColor}18` }}
                  >
                    <CategoryIcon name={tx.categoryIcon} size={18} color={tx.categoryColor} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {tx.categoryName}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          tx.type === 'income'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {tx.description || 'Sin descripción'} · {formatDate(tx.date)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openQuickTransaction(tx.type, tx)}
                      aria-label="Editar movimiento"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(tx)}
                      aria-label="Eliminar movimiento"
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Categorías personalizadas */}
      {customCategories.length > 0 && (
        <Card
          title="Tus categorías personalizadas"
          subtitle="Puedes eliminar categorías personalizadas que no tengan movimientos asociados"
        >
          <div className="flex flex-wrap gap-2">
            {customCategories.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs"
              >
                <CategoryIcon name={c.icon} size={14} color={c.color} />
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-[10px] text-slate-400">
                  ({c.type === 'income' ? 'Ingreso' : 'Gasto'})
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteCategory(c.id, c.name)}
                  aria-label={`Eliminar categoría ${c.name}`}
                  className="ml-1 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <CategoryModal
        open={showCatModal}
        onClose={() => setShowCatModal(false)}
        defaultType="expense"
      />
    </div>
  );
}
