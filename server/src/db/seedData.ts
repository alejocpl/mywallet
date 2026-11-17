/**
 * Datos de demostración realistas para MyWallet.
 * Carga 6 meses de movimientos, presupuestos (con alertas activas),
 * metas de ahorro con aportes y deudas para priorización (método avalancha).
 */
import { db } from './connection';
import { currentMonth, shiftMonth } from '../utils/date';

const pad = (n: number) => String(n).padStart(2, '0');

export function seedDemoData(force = false): { seeded: boolean } {
  const existing = db.prepare('SELECT COUNT(*) AS total FROM transactions').get() as { total: number };
  if (!force && existing.total > 0) {
    return { seeded: false };
  }

  const categoryRows = db.prepare('SELECT id, name, type FROM categories').all() as {
    id: number;
    name: string;
    type: 'income' | 'expense';
  }[];
  const catId = (name: string, type: 'income' | 'expense'): number => {
    const found = categoryRows.find((c) => c.name === name && c.type === type);
    if (!found) throw new Error(`Categoría requerida no encontrada: ${name} (${type})`);
    return found.id;
  };

  const nowMonth = currentMonth();

  const run = db.transaction(() => {
    if (force) {
      db.exec(`
        DELETE FROM essential_payments;
        DELETE FROM essential_plans;
        DELETE FROM debt_payments;
        DELETE FROM debts;
        DELETE FROM goal_contributions;
        DELETE FROM goals;
        DELETE FROM budgets;
        DELETE FROM subcategories;
        DELETE FROM transactions;
      `);
    }

    const insertTx = db.prepare(
      `INSERT INTO transactions (type, amount, category_id, description, date) VALUES (?, ?, ?, ?, ?)`,
    );

    // 6 meses de historial en pesos colombianos (COP)
    const monthlyProfiles = [
      { offset: -5, freelance: 600000, food: 780000, leisure: 220000, dining: 210000, shopping: 280000, transport: 240000 },
      { offset: -4, freelance: 900000, food: 810000, leisure: 280000, dining: 260000, shopping: 190000, transport: 255000 },
      { offset: -3, freelance: 550000, food: 760000, leisure: 195000, dining: 185000, shopping: 360000, transport: 230000 },
      { offset: -2, freelance: 1100000, food: 870000, leisure: 270000, dining: 290000, shopping: 220000, transport: 275000 },
      { offset: -1, freelance: 800000, food: 890000, leisure: 290000, dining: 310000, shopping: 250000, transport: 265000 },
      { offset: 0, freelance: 950000, food: 850000, leisure: 420000, dining: 280000, shopping: 240000, transport: 260000 },
    ];

    for (const p of monthlyProfiles) {
      const m = shiftMonth(nowMonth, p.offset);

      // Ingresos
      insertTx.run('income', 4200000, catId('Salario', 'income'), 'Nómina mensual', `${m}-01`);
      insertTx.run('income', p.freelance, catId('Freelance', 'income'), 'Consultoría y proyectos', `${m}-12`);
      if (p.offset % 2 === 0) {
        insertTx.run('income', 180000, catId('Inversiones', 'income'), 'Rendimientos CDT / fondo', `${m}-15`);
      }

      // Gastos fijos y necesidades
      insertTx.run('expense', 1400000, catId('Vivienda', 'expense'), 'Arriendo de apartamento', `${m}-02`);
      insertTx.run('expense', 320000, catId('Servicios', 'expense'), 'Energía, agua, gas e internet', `${m}-05`);
      insertTx.run('expense', Math.round(p.food * 0.6), catId('Alimentación', 'expense'), 'Mercado quincenal', `${m}-04`);
      insertTx.run('expense', Math.round(p.food * 0.4), catId('Alimentación', 'expense'), 'Frutas, verduras y despensa', `${m}-14`);
      insertTx.run('expense', p.transport, catId('Transporte', 'expense'), 'Gasolina y transporte', `${m}-07`);
      insertTx.run('expense', 140000, catId('Salud', 'expense'), 'Medicina prepagada / farmacia', `${m}-09`);
      if (p.offset === -2 || p.offset === 0) {
        insertTx.run('expense', 250000, catId('Educación', 'expense'), 'Curso de especialización', `${m}-10`);
      }

      // Gastos de deseos
      insertTx.run('expense', 85000, catId('Suscripciones', 'expense'), 'Streaming, nube y música', `${m}-03`);
      insertTx.run('expense', p.dining, catId('Restaurantes', 'expense'), 'Salidas y cafés', `${m}-11`);
      insertTx.run('expense', p.leisure, catId('Ocio', 'expense'), 'Cine, eventos y entretenimiento', `${m}-13`);
      insertTx.run('expense', p.shopping, catId('Compras', 'expense'), 'Artículos personales', `${m}-08`);
    }

    // Presupuestos para el mes anterior y el mes actual (con estados ok, warning y exceeded)
    const insertBudget = db.prepare(
      `INSERT INTO budgets (category_id, month, amount) VALUES (?, ?, ?)`,
    );
    const prevMonth = shiftMonth(nowMonth, -1);
    const budgetTemplates: [string, number][] = [
      ['Vivienda', 1500000],
      ['Alimentación', 950000],
      ['Transporte', 350000],
      ['Servicios', 380000],
      ['Restaurantes', 400000],
      ['Ocio', 300000],
      ['Compras', 350000],
      ['Suscripciones', 120000],
    ];
    for (const [name, amount] of budgetTemplates) {
      insertBudget.run(catId(name, 'expense'), prevMonth, amount);
      insertBudget.run(catId(name, 'expense'), nowMonth, amount);
    }

    // Metas de ahorro + aportes
    const insertGoal = db.prepare(
      `INSERT INTO goals (name, target_amount, current_amount, deadline, icon, color) VALUES (?, ?, 0, ?, ?, ?)`,
    );
    const insertContrib = db.prepare(
      `INSERT INTO goal_contributions (goal_id, amount, date, note) VALUES (?, ?, ?, ?)`,
    );
    const updateGoalCurrent = db.prepare(
      `UPDATE goals SET current_amount = (SELECT COALESCE(SUM(amount), 0) FROM goal_contributions WHERE goal_id = ?) WHERE id = ?`,
    );

    const futureDate = (monthsAhead: number) => {
      const target = shiftMonth(nowMonth, monthsAhead);
      return `${target}-28`;
    };

    const g1 = Number(
      insertGoal.run('Fondo de emergencia', 12000000, futureDate(10), 'shield', '#059669').lastInsertRowid,
    );
    const g2 = Number(
      insertGoal.run('Vacaciones familiares', 5000000, futureDate(6), 'plane', '#2563EB').lastInsertRowid,
    );
    const g3 = Number(
      insertGoal.run('Laptop de trabajo', 4200000, futureDate(4), 'laptop', '#8B5CF6').lastInsertRowid,
    );

    const contribPlan: { goalId: number; offset: number; amount: number; note: string }[] = [
      { goalId: g1, offset: -4, amount: 1000000, note: 'Aporte inicial' },
      { goalId: g1, offset: -3, amount: 800000, note: 'Ahorro mensual' },
      { goalId: g1, offset: -2, amount: 900000, note: 'Ahorro mensual' },
      { goalId: g1, offset: -1, amount: 750000, note: 'Ahorro mensual' },
      { goalId: g1, offset: 0, amount: 350000, note: 'Reserva del mes' },
      { goalId: g2, offset: -3, amount: 500000, note: 'Ahorro viaje' },
      { goalId: g2, offset: -2, amount: 600000, note: 'Ahorro viaje' },
      { goalId: g2, offset: -1, amount: 450000, note: 'Ahorro viaje' },
      { goalId: g2, offset: 0, amount: 150000, note: 'Aporte quincenal' },
      { goalId: g3, offset: -2, amount: 700000, note: 'Bono freelance' },
      { goalId: g3, offset: -1, amount: 800000, note: 'Ahorro equipo' },
      { goalId: g3, offset: 0, amount: 100000, note: 'Aporte mensual' },
    ];

    for (const c of contribPlan) {
      const m = shiftMonth(nowMonth, c.offset);
      insertContrib.run(c.goalId, c.amount, `${m}-${pad(10)}`, c.note);
    }
    for (const id of [g1, g2, g3]) {
      updateGoalCurrent.run(id, id);
    }

    // Deudas (ordenadas por tasa para demostrar método avalancha)
    const insertDebt = db.prepare(
      `INSERT INTO debts (name, creditor, total_amount, remaining_amount, interest_rate, monthly_payment, due_day)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insertDebt.run('Tarjeta de Crédito Visa', 'Bancolombia', 6500000, 4200000, 28.5, 380000, 15);
    insertDebt.run('Crédito Vehicular', 'Finanzauto', 28000000, 16500000, 13.5, 690000, 22);
    insertDebt.run('Préstamo Educativo', 'ICETEX', 12000000, 5800000, 9.2, 310000, 5);

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ('onboarding_completed', '1', datetime('now'))
       ON CONFLICT (key) DO UPDATE SET value = '1', updated_at = datetime('now')`,
    ).run();
  });

  run();
  return { seeded: true };
}
