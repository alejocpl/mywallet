/**
 * Generador de reportes PDF con PDFKit.
 * Estructura: encabezado de marca → resumen → presupuestos → gastos por
 * categoría → movimientos. Pie de página con numeración.
 */
import fs from 'node:fs';
import type { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';
import { BRAND } from '../../../config/brand';
import { formatMoney } from '../../../utils/money';
import type { ReportData } from '../reports.service';

type Doc = PDFKit.PDFDocument;

const COLORS = {
  primary: BRAND.primaryColor,
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  soft: '#F1F5F9',
  income: '#059669',
  expense: '#E11D48',
  warning: '#D97706',
};

const MARGIN = 40;

interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const contentWidth = (doc: Doc) => doc.page.width - MARGIN * 2;
const bottomLimit = (doc: Doc) => doc.page.height - doc.page.margins.bottom;

function ensureSpace(doc: Doc, needed: number): void {
  if (doc.y + needed > bottomLimit(doc)) doc.addPage();
}

function sectionTitle(doc: Doc, title: string): void {
  ensureSpace(doc, 60);
  doc.moveDown(1.2);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.text).text(title, MARGIN, doc.y);
  const y = doc.y + 4;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + 40, y).lineWidth(2).strokeColor(COLORS.primary).stroke();
  doc.y = y + 10;
}

function drawTable(doc: Doc, columns: Column[], rows: string[][], cellColor?: (row: number, col: number) => string | undefined): void {
  const rowHeight = 20;
  const width = contentWidth(doc);

  const drawHeader = () => {
    const y = doc.y;
    doc.rect(MARGIN, y, width, rowHeight).fill(COLORS.soft);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.muted);
    let x = MARGIN;
    for (const col of columns) {
      doc.text(col.header.toUpperCase(), x + 6, y + 7, { width: col.width - 12, align: col.align ?? 'left', lineBreak: false });
      x += col.width;
    }
    doc.y = y + rowHeight;
  };

  ensureSpace(doc, rowHeight * 2);
  drawHeader();

  rows.forEach((row, ri) => {
    if (doc.y + rowHeight > bottomLimit(doc)) {
      doc.addPage();
      drawHeader();
    }
    const y = doc.y;
    let x = MARGIN;
    doc.font('Helvetica').fontSize(9);
    row.forEach((cell, ci) => {
      doc
        .fillColor(cellColor?.(ri, ci) ?? COLORS.text)
        .text(cell, x + 6, y + 6, { width: columns[ci].width - 12, align: columns[ci].align ?? 'left', lineBreak: false });
      x += columns[ci].width;
    });
    doc.moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + width, y + rowHeight).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.y = y + rowHeight;
  });
}

function drawHeader(doc: Doc, data: ReportData): void {
  doc.rect(0, 0, doc.page.width, 96).fill(COLORS.primary);

  let textX = MARGIN;
  if (fs.existsSync(BRAND.pdfLogoPath)) {
    doc.image(BRAND.pdfLogoPath, MARGIN, 26, { height: 44 });
    textX = MARGIN + 56;
  }

  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text(BRAND.name, textX, 30);
  doc.font('Helvetica').fontSize(10).text('Reporte financiero mensual', textX, 58);

  doc.font('Helvetica-Bold').fontSize(13).text(capitalize(data.label), MARGIN, 32, { width: contentWidth(doc), align: 'right' });
  doc
    .font('Helvetica')
    .fontSize(8)
    .text(`Generado el ${data.generatedAt.toLocaleDateString('es')}`, MARGIN, 52, { width: contentWidth(doc), align: 'right' });

  doc.y = 116;
}

function drawSummary(doc: Doc, data: ReportData): void {
  const { totals } = data.summary;
  const cards = [
    { label: 'Ingresos', value: totals.income, color: COLORS.income },
    { label: 'Gastos', value: totals.expenses, color: COLORS.expense },
    { label: 'Ahorro', value: totals.savings, color: COLORS.primary },
    { label: 'Disponible', value: totals.available, color: totals.available >= 0 ? COLORS.text : COLORS.expense },
  ];
  const gap = 10;
  const cardWidth = (contentWidth(doc) - gap * (cards.length - 1)) / cards.length;
  const y = doc.y;

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardWidth + gap);
    doc.roundedRect(x, y, cardWidth, 58, 6).fill(COLORS.soft);
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(card.label.toUpperCase(), x + 10, y + 12, { width: cardWidth - 20 });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(card.color).text(formatMoney(card.value), x + 10, y + 30, { width: cardWidth - 20 });
  });
  doc.y = y + 70;

  // Distribución 50/30/20
  sectionTitle(doc, 'Distribución recomendada (50/30/20)');
  drawTable(
    doc,
    [
      { header: 'Grupo', width: 155 },
      { header: 'Recomendado', width: 120, align: 'right' },
      { header: 'Real', width: 120, align: 'right' },
      { header: '% del ingreso', width: contentWidth(doc) - 395, align: 'right' },
    ],
    data.summary.distribution.map((d) => [
      `${d.label} (${d.recommendedPercent}%)`,
      formatMoney(d.recommended),
      formatMoney(d.actual),
      `${d.actualPercent}%`,
    ]),
  );
}

function drawBudgets(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Presupuestos del mes');
  if (data.budgets.items.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('No se definieron presupuestos para este mes.', MARGIN);
    return;
  }
  const statusLabel = { ok: 'En control', warning: 'Cerca del límite', exceeded: 'Superado' } as const;
  const items = data.budgets.items;
  drawTable(
    doc,
    [
      { header: 'Categoría', width: 135 },
      { header: 'Presupuesto', width: 95, align: 'right' },
      { header: 'Gastado', width: 95, align: 'right' },
      { header: 'Restante', width: 95, align: 'right' },
      { header: 'Estado', width: contentWidth(doc) - 420, align: 'right' },
    ],
    items.map((b) => [b.categoryName, formatMoney(b.amount), formatMoney(b.spent), formatMoney(b.remaining), `${statusLabel[b.status]} (${b.percentage}%)`]),
    (row, col) => {
      if (col !== 4) return undefined;
      const s = items[row].status;
      return s === 'exceeded' ? COLORS.expense : s === 'warning' ? COLORS.warning : COLORS.income;
    },
  );
}

function drawCategoryBreakdown(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Gastos por categoría');
  const categories = data.summary.expensesByCategory;
  if (categories.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Sin gastos registrados.', MARGIN);
    return;
  }
  const max = Math.max(...categories.map((c) => c.total));
  const barX = MARGIN + 130;
  const barMaxWidth = contentWidth(doc) - 130 - 130;

  for (const c of categories) {
    ensureSpace(doc, 22);
    const y = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(truncate(c.name, 22), MARGIN, y + 3, { width: 125, lineBreak: false });
    doc.roundedRect(barX, y + 2, barMaxWidth, 10, 5).fill(COLORS.soft);
    doc.roundedRect(barX, y + 2, Math.max(4, (c.total / max) * barMaxWidth), 10, 5).fill(c.color);
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(`${formatMoney(c.total)}  (${c.percentage}%)`, barX + barMaxWidth + 8, y + 3, { width: 122, align: 'right', lineBreak: false });
    doc.y = y + 20;
  }
}

function drawTransactions(doc: Doc, data: ReportData): void {
  sectionTitle(doc, `Movimientos (${data.transactions.length})`);
  if (data.transactions.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Sin movimientos registrados.', MARGIN);
    return;
  }
  const items = data.transactions;
  drawTable(
    doc,
    [
      { header: 'Fecha', width: 70 },
      { header: 'Descripción', width: 190 },
      { header: 'Categoría', width: 125 },
      { header: 'Monto', width: contentWidth(doc) - 385, align: 'right' },
    ],
    items.map((t) => [
      t.date,
      truncate(t.description || '—', 38),
      truncate(t.categoryName, 24),
      `${t.type === 'income' ? '+' : '-'} ${formatMoney(t.amount)}`,
    ]),
    (row, col) => (col === 3 ? (items[row].type === 'income' ? COLORS.income : COLORS.expense) : undefined),
  );
}

function drawFooters(doc: Doc): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Se quita el margen inferior temporalmente para que PDFKit no cree páginas nuevas.
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`${BRAND.name} · ${BRAND.tagline}`, MARGIN, doc.page.height - 28, { lineBreak: false })
      .text(`Página ${i + 1} de ${range.count}`, MARGIN, doc.page.height - 28, { width: contentWidth(doc), align: 'right', lineBreak: false });
    doc.page.margins.bottom = originalBottom;
  }
}

/** Escribe el PDF en el stream recibido (por ejemplo, la respuesta HTTP). */
export function generatePdfReport(data: ReportData, output: Writable): void {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: `Reporte ${data.label}`, Author: BRAND.name },
  });
  doc.pipe(output);

  drawHeader(doc, data);
  drawSummary(doc, data);
  drawBudgets(doc, data);
  drawCategoryBreakdown(doc, data);
  drawTransactions(doc, data);
  drawFooters(doc);

  doc.end();
}
