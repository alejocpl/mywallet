/**
 * Conexión única (singleton) a SQLite usando better-sqlite3.
 * better-sqlite3 es síncrono, rápido y perfecto para apps personales.
 * Para escalar a multiusuario se puede reemplazar por PostgreSQL manteniendo
 * la misma interfaz en los repositorios.
 */
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { resolveDbPath } from '../config/env';

const resolvedDbPath = resolveDbPath();
fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });

export const db: Database.Database = new Database(resolvedDbPath);

// WAL mejora la concurrencia de lectura/escritura.
db.pragma('journal_mode = WAL');
// SQLite no activa las claves foráneas por defecto.
db.pragma('foreign_keys = ON');

let closed = false;

/** Devuelve la ruta absoluta real del archivo SQLite en uso. */
export function getDbPath(): string {
  return resolvedDbPath;
}

/**
 * Cierra limpiamente la conexión SQLite haciendo checkpoint del diario WAL.
 * Imprescindible al apagar el servidor Express desde Electron (`will-quit`).
 */
export function closeDatabase(): void {
  if (closed || !db.open) return;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Si la base de datos no soporta checkpoint en este instante, continuamos al cierre.
  }
  db.close();
  closed = true;
}
