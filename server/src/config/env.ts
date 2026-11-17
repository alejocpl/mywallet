/**
 * Configuración de entorno del servidor.
 * Lee variables desde `.env` (ver `.env.example`) y expone valores tipados
 * para que el resto de la app nunca lea `process.env` directamente.
 */
import 'dotenv/config';
import path from 'node:path';

/**
 * Resuelve dinámicamente la ruta de SQLite para que Electron pueda
 * inyectar `process.env.DB_PATH` hacia la carpeta persistente del usuario
 * (`app.getPath('userData')`) antes de inicializar la base de datos.
 */
export function resolveDbPath(): string {
  if (process.env.DB_PATH) {
    return path.resolve(process.env.DB_PATH);
  }
  const baseDir = path.basename(__dirname) === 'dist' ? '../data/mywallet.db' : '../../data/mywallet.db';
  return path.resolve(__dirname, baseDir);
}

export const env = {
  get port(): number {
    return Number(process.env.PORT ?? 4000);
  },
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? 'development';
  },
  /** Ruta absoluta del archivo SQLite. Por defecto: server/data/mywallet.db */
  get dbPath(): string {
    return resolveDbPath();
  },
  get corsOrigin(): string {
    return process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  },
  get locale(): string {
    return process.env.APP_LOCALE ?? 'es-CO';
  },
  get currency(): string {
    return process.env.APP_CURRENCY ?? 'COP';
  },
};
