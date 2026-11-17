/**
 * Generador de reportes Excel (.xlsx) con ExcelJS.
 * Una hoja por sección para facilitar el análisis y los filtros.
 */
import ExcelJS from 'exceljs';
import { BRAND } from '../../../config/brand';
import type { ReportData } from '../reports.service';

const MONEY_FORMAT = '$" "#,##0';
const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

/** Aplica estilo de marca a la fila de encabezados y congela la primera fila. */
function styleSheet(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(BRAND.primaryColor) } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function setMoneyColumns(sheet: ExcelJS.Worksheet, keys: string[]): void {
  for (const key of keys) sheet.getColumn(key).numFmt = MONEY_FORMAT;
}

export async function generateExcelReport(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND.name;
  wb.created = data.generatedAt;
  const { summary } = data;

  // ---------- Resumen ----------
  const resumen = wb.addWorksheet('Resumen');
  resumen.columns = [
    { header: 'Concepto', key: 'label', width: 34 },
    { header: 'Valor', key: 'value', width: 20 },
  ];
  resumen.addRows([
    { label: 'Periodo', value: data.label },
    { label: 'Ingresos', value: summary.totals.income },
    { label: 'Gastos', value: summary.totals.expenses },
    { label: 'Ahorro (aportes a metas)', value: summary.totals.savings },
    { label: 'Disponible', value: summary.totals.available },
    { label: 'Presupuestado', value: summary.totals.budgeted },
    { label: 'Presupuesto restante', value: summary.totals.budgetRemaining },
    { label: 'Deuda pendiente total', value: summary.debts.totalRemaining },
    { label: 'Total ahorrado en metas', value: summary.goals.totalSaved },
  ]);
  resumen.getColumn('value').numFmt = MONEY_FORMAT;
  styleSheet(resumen);

  // ---------- Movimientos ----------
  const movimientos = wb.addWorksheet('Movimientos');
  movimientos.columns = [
    { header: 'Fecha', key: 'date', width: 12 },
    { header: 'Tipo', key: 'type', width: 10 },
    { header: 'Categoría', key: 'category', width: 20 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Monto', key: 'amount', width: 16 },
  ];
  for (const t of data.transactions) {
    const row = movimientos.addRow({
      date: t.date,
      type: t.type === 'income' ? 'Ingreso' : 'Gasto',
      category: t.categoryName,
      description: t.description,
      amount: t.type === 'income' ? t.amount : -t.amount,
    });
    row.getCell('amount').font = { color: { argb: t.type === 'income' ? 'FF059669' : 'FFE11D48' } };
  }
  setMoneyColumns(movimientos, ['amount']);
  movimientos.autoFilter = { from: 'A1', to: 'E1' };
  styleSheet(movimientos);

  // ---------- Gastos por categoría ----------
  const categorias = wb.addWorksheet('Gastos por categoría');
  categorias.columns = [
    { header: 'Categoría', key: 'name', width: 24 },
    { header: 'Total', key: 'total', width: 16 },
    { header: '% del gasto', key: 'percentage', width: 14 },
  ];
  categorias.addRows(summary.expensesByCategory.map((c) => ({ name: c.name, total: c.total, percentage: c.percentage / 100 })));
  setMoneyColumns(categorias, ['total']);
  categorias.getColumn('percentage').numFmt = '0.0%';
  styleSheet(categorias);

  // ---------- Presupuestos ----------
  const presupuestos = wb.addWorksheet('Presupuestos');
  presupuestos.columns = [
    { header: 'Categoría', key: 'category', width: 24 },
    { header: 'Presupuesto', key: 'amount', width: 16 },
    { header: 'Gastado', key: 'spent', width: 16 },
    { header: 'Restante', key: 'remaining', width: 16 },
    { header: '% usado', key: 'percentage', width: 12 },
    { header: 'Estado', key: 'status', width: 18 },
  ];
  const statusLabel = { ok: 'En control', warning: 'Cerca del límite', exceeded: 'Superado' } as const;
  presupuestos.addRows(
    data.budgets.items.map((b) => ({
      category: b.categoryName,
      amount: b.amount,
      spent: b.spent,
      remaining: b.remaining,
      percentage: b.percentage / 100,
      status: statusLabel[b.status],
    })),
  );
  setMoneyColumns(presupuestos, ['amount', 'spent', 'remaining']);
  presupuestos.getColumn('percentage').numFmt = '0%';
  styleSheet(presupuestos);

  // ---------- Tendencia ----------
  const tendencia = wb.addWorksheet('Tendencia');
  tendencia.columns = [
    { header: 'Mes', key: 'month', width: 12 },
    { header: 'Ingresos', key: 'income', width: 16 },
    { header: 'Gastos', key: 'expenses', width: 16 },
    { header: 'Ahorro', key: 'savings', width: 16 },
    { header: 'Balance', key: 'balance', width: 16 },
  ];
  tendencia.addRows(data.trend);
  setMoneyColumns(tendencia, ['income', 'expenses', 'savings', 'balance']);
  styleSheet(tendencia);

  // ---------- Metas ----------
  const metas = wb.addWorksheet('Metas');
  metas.columns = [
    { header: 'Meta', key: 'name', width: 26 },
    { header: 'Objetivo', key: 'targetAmount', width: 16 },
    { header: 'Ahorrado', key: 'currentAmount', width: 16 },
    { header: 'Faltante', key: 'remaining', width: 16 },
    { header: 'Progreso', key: 'progress', width: 12 },
    { header: 'Fecha límite', key: 'deadline', width: 14 },
    { header: 'Ahorro mensual sugerido', key: 'monthlyNeeded', width: 24 },
  ];
  metas.addRows(data.goals.map((g) => ({ ...g, progress: g.progress / 100, deadline: g.deadline ?? '—' })));
  setMoneyColumns(metas, ['targetAmount', 'currentAmount', 'remaining', 'monthlyNeeded']);
  metas.getColumn('progress').numFmt = '0%';
  styleSheet(metas);

  // ---------- Deudas ----------
  const deudas = wb.addWorksheet('Deudas');
  deudas.columns = [
    { header: 'Deuda', key: 'name', width: 24 },
    { header: 'Acreedor', key: 'creditor', width: 20 },
    { header: 'Total', key: 'totalAmount', width: 16 },
    { header: 'Pendiente', key: 'remainingAmount', width: 16 },
    { header: 'Tasa anual %', key: 'interestRate', width: 14 },
    { header: 'Cuota mensual', key: 'monthlyPayment', width: 16 },
    { header: 'Meses estimados', key: 'monthsToPayoff', width: 16 },
  ];
  deudas.addRows(data.debts.items.map((d) => ({ ...d, monthsToPayoff: d.monthsToPayoff ?? '—' })));
  setMoneyColumns(deudas, ['totalAmount', 'remainingAmount', 'monthlyPayment']);
  styleSheet(deudas);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
