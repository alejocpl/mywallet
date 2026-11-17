/**
 * Esquema de la base de datos y migraciones.
 * Se ejecuta en cada arranque; todas las sentencias son idempotentes
 * (`IF NOT EXISTS` / `INSERT OR IGNORE`).
 *
 * 💡 Para escalar a multiusuario: agregar tabla `users` y columna `user_id`
 *    en transactions, budgets, goals, debts y categories.
 */
import { db } from './connection';
import { DEFAULT_CATEGORIES } from './defaultCategories';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    type          TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    icon          TEXT    NOT NULL DEFAULT 'more',
    color         TEXT    NOT NULL DEFAULT '#64748B',
    expense_group TEXT    CHECK (expense_group IN ('needs', 'wants', 'savings')),
    is_default    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (name, type)
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    unit_amount     REAL    NOT NULL CHECK (unit_amount >= 0),
    frequency_month INTEGER NOT NULL DEFAULT 1 CHECK (frequency_month >= 1),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (category_id, name)
  );
  CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    amount      REAL    NOT NULL CHECK (amount > 0),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    description TEXT    NOT NULL DEFAULT '',
    date        TEXT    NOT NULL,              -- YYYY-MM-DD
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

  CREATE TABLE IF NOT EXISTS budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month       TEXT    NOT NULL,              -- YYYY-MM
    amount      REAL    NOT NULL CHECK (amount > 0),
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (category_id, month)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    target_amount  REAL    NOT NULL CHECK (target_amount > 0),
    current_amount REAL    NOT NULL DEFAULT 0,
    deadline       TEXT,                       -- YYYY-MM-DD (opcional)
    icon           TEXT    NOT NULL DEFAULT 'piggy-bank',
    color          TEXT    NOT NULL DEFAULT '#2563EB',
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goal_contributions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id    INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount     REAL    NOT NULL,               -- negativo = retiro
    date       TEXT    NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_contributions_date ON goal_contributions(date);

  CREATE TABLE IF NOT EXISTS debts (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    creditor         TEXT    NOT NULL DEFAULT '',
    total_amount     REAL    NOT NULL CHECK (total_amount > 0),
    remaining_amount REAL    NOT NULL CHECK (remaining_amount >= 0),
    interest_rate    REAL    NOT NULL DEFAULT 0, -- % anual
    monthly_payment  REAL    NOT NULL DEFAULT 0,
    due_day          INTEGER CHECK (due_day BETWEEN 1 AND 31),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debt_payments (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    debt_id        INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    amount         REAL    NOT NULL CHECK (amount > 0),
    date           TEXT    NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS essential_plans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id     INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
    unit_amount     REAL    NOT NULL CHECK (unit_amount > 0),
    frequency_month INTEGER NOT NULL DEFAULT 1 CHECK (frequency_month >= 1 AND frequency_month <= 31),
    is_variable     INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS essential_payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id         INTEGER NOT NULL REFERENCES essential_plans(id) ON DELETE CASCADE,
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month           TEXT    NOT NULL,
    installment_num INTEGER NOT NULL,
    expected_amount REAL    NOT NULL CHECK (expected_amount > 0),
    paid_amount     REAL,
    checked         INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
    checked_at      TEXT,
    transaction_id  INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    UNIQUE (plan_id, month, installment_num)
  );
  CREATE INDEX IF NOT EXISTS idx_essential_payments_month ON essential_payments(month);
`;

/** Crea las tablas e inserta las categorías por defecto. */
export function runMigrations(): void {
  db.exec(SCHEMA_SQL);
  seedDefaultCategories();
}

function seedDefaultCategories(): void {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO categories (name, type, icon, color, expense_group, is_default)
     VALUES (?, ?, ?, ?, ?, 1)`,
  );
  const insertAll = db.transaction(() => {
    for (const c of DEFAULT_CATEGORIES) {
      insert.run(c.name, c.type, c.icon, c.color, c.expenseGroup ?? null);
    }
  });
  insertAll();
}
