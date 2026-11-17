/**
 * Tarjeta interactiva de "Control de Pagos Esenciales (Check Mensual)".
 * - Muestra las cuotas mensuales configuradas para Vivienda, Salud, Alimentación,
 *   Servicios, Transporte y Educación.
 * - Categorías fijas: se marcan con un solo clic usando su valor configurado.
 * - Categorías variables (Servicios, Alimentación, Transporte): permiten ingresar o
 *   ajustar cuánto se pagó realmente antes de confirmar el check.
 * - Una vez marcado un pago, queda bloqueado permanentemente (no se puede desmarcar).
 */
import { useState } from 'react';
import { Check, CheckCircle2, Circle, Lock, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { FormattedNumberInput } from '../ui/FormattedNumberInput';
import { CategoryIcon } from '../../config/icons';
import { useWallet } from '../../context/WalletContext';
import { essentialsApi } from '../../services/api';
import type { EssentialCategoryChecklist, EssentialPaymentItem } from '../../types';
import { formatMoney, monthLabel } from '../../utils/format';

export function EssentialChecklistCard() {
  const { month, essentials, refreshAll, notify, notifyBudgetAlert } = useWallet();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  if (essentials.length === 0) return null;

  const totalPayments = essentials.reduce((s, e) => s + e.frequencyMonth, 0);
  const totalChecked = essentials.reduce((s, e) => s + e.paidCount, 0);

  async function confirmCheck(
    item: EssentialCategoryChecklist,
    payment: EssentialPaymentItem,
    amount?: number,
  ) {
    setBusyId(payment.id);
    try {
      const res = await essentialsApi.checkPayment(payment.id, amount);
      setEditingPaymentId(null);
      setCustomAmount('');
      await refreshAll();
      notify(
        'Pago esencial confirmado',
        `${item.categoryName}${
          item.frequencyMonth > 1 ? ` (Pago ${payment.installmentNum}/${item.frequencyMonth})` : ''
        } · ${formatMoney(amount ?? payment.expectedAmount)}`,
        'success',
      );
      if (res.alert) notifyBudgetAlert(res.alert);
    } catch (err) {
      notify(
        'No se pudo registrar el check',
        err instanceof Error ? err.message : 'Intenta nuevamente',
        'error',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card
      title={`Pagos esenciales del mes · ${monthLabel(month)}`}
      subtitle="Marca cada pago conforme lo realizas. Una vez hecho el check queda bloqueado para proteger tus cuentas."
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          <CheckCircle2 size={14} className="text-emerald-600" />
          {totalChecked} de {totalPayments} pagados
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {essentials.map((item) => (
          <div
            key={item.planId}
            className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
              item.allChecked
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${item.categoryColor}18` }}
                  >
                    <CategoryIcon
                      name={item.categoryIcon}
                      size={17}
                      color={item.categoryColor}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{item.categoryName}</h3>
                    <span className="text-[11px] text-slate-500">
                      {item.frequencyMonth > 1
                        ? `${item.frequencyMonth}x al mes · est. ${formatMoney(item.monthlyTotal)}`
                        : `Estimado: ${formatMoney(item.monthlyTotal)}`}
                    </span>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    item.isVariable
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.isVariable ? 'Variable' : 'Fijo'}
                </span>
              </div>

              {/* Lista de cuotas del mes */}
              <div className="mt-3 space-y-2">
                {item.payments.map((payment) => {
                  const isEditing = editingPaymentId === payment.id;
                  const isBusy = busyId === payment.id;

                  if (payment.checked) {
                    return (
                      <div
                        key={payment.id}
                        aria-disabled="true"
                        title="Pago bloqueado: ya fue registrado"
                        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                          <span>
                            {item.frequencyMonth > 1
                              ? `Pago #${payment.installmentNum}`
                              : 'Pagado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{formatMoney(payment.paidAmount ?? payment.expectedAmount)}</span>
                          <Lock size={12} className="text-emerald-600/80" />
                        </div>
                      </div>
                    );
                  }

                  if (isEditing) {
                    return (
                      <form
                        key={payment.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = Number(customAmount);
                          if (!Number.isFinite(val) || val <= 0) {
                            notify(
                              'Monto inválido',
                              'Ingresa un valor en COP mayor a 0.',
                              'warning',
                            );
                            return;
                          }
                          void confirmCheck(item, payment, val);
                        }}
                        className="space-y-2 rounded-xl border border-brand-300 bg-brand-50/60 p-2.5"
                      >
                        <label className="block text-[11px] font-semibold text-brand-900">
                          ¿Cuánto pagaste por {item.categoryName}
                          {item.frequencyMonth > 1 ? ` (#${payment.installmentNum})` : ''}?
                        </label>
                        <div className="flex items-center gap-1.5">
                          <FormattedNumberInput
                            required
                            autoFocus
                            value={customAmount}
                            onChange={setCustomAmount}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-brand-600"
                          />
                          <button
                            type="submit"
                            disabled={isBusy}
                            aria-label="Confirmar pago"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Check size={13} />
                            Listo
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPaymentId(null)}
                            aria-label="Cancelar"
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <button
                      key={payment.id}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (item.isVariable) {
                          setEditingPaymentId(payment.id);
                          setCustomAmount(String(payment.expectedAmount));
                        } else {
                          void confirmCheck(item, payment);
                        }
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-900 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <Circle size={15} className="shrink-0 text-slate-400" />
                        <span>
                          {item.frequencyMonth > 1
                            ? `Marcar pago #${payment.installmentNum}`
                            : 'Marcar como pagado'}
                        </span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.isVariable ? 'Ingresar valor' : formatMoney(payment.expectedAmount)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
              <span className="text-slate-500">
                Check: <strong>{item.paidCount}/{item.frequencyMonth}</strong>
              </span>
              <span className="font-semibold text-slate-800">
                Pagado: {formatMoney(item.totalPaidAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
