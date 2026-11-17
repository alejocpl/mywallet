/**
 * Modal para crear una categoría personalizada de ingreso o gasto.
 */
import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { COLOR_PALETTE, CategoryIcon, ICON_OPTIONS } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { categoriesApi } from '../../services/api';
import type { Category, ExpenseGroup, TransactionType } from '../../types';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  defaultType: TransactionType;
  onCreated?: (category: Category) => void;
}

export function CategoryModal({ open, onClose, defaultType, onCreated }: CategoryModalProps) {
  const { refreshAll, notify } = useWallet();
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [icon, setIcon] = useState<string>('more');
  const [color, setColor] = useState<string>(COLOR_PALETTE[0]);
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('wants');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await categoriesApi.create({
        name: name.trim(),
        type,
        icon,
        color,
        expenseGroup: type === 'expense' ? expenseGroup : null,
      });
      await refreshAll();
      notify('Categoría creada', `Se agregó "${created.name}".`, 'success');
      setName('');
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la categoría');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva categoría"
      subtitle="Personaliza cómo clasificas tus ingresos o gastos"
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Tipo</label>
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                  type === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                {t === 'expense' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Nombre</label>
          <input
            type="text"
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mascotas, Gimnasio, Bonos..."
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {type === 'expense' && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Clasificación 50/30/20
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExpenseGroup('needs')}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  expenseGroup === 'needs'
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span className="block font-semibold">Necesidad (50%)</span>
                <span className="text-[11px] opacity-75">Esenciales</span>
              </button>
              <button
                type="button"
                onClick={() => setExpenseGroup('wants')}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  expenseGroup === 'wants'
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span className="block font-semibold">Deseo (30%)</span>
                <span className="text-[11px] opacity-75">Estilo de vida</span>
              </button>
              <button
                type="button"
                onClick={() => setExpenseGroup('savings')}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  expenseGroup === 'savings'
                    ? 'border-brand-600 bg-brand-50 text-brand-900'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                <span className="block font-semibold">Inversión (20%)</span>
                <span className="text-[11px] opacity-75">Ahorro / activos</span>
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Ícono</label>
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                onClick={() => setIcon(opt.key)}
                className={`flex h-9 items-center justify-center rounded-xl border transition ${
                  icon === opt.key
                    ? 'border-brand-600 bg-brand-50 text-brand-600'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <CategoryIcon name={opt.key} size={17} />
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
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  color === c ? 'scale-110 border-slate-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Crear categoría'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
