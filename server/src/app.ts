/**
 * Configuración de la aplicación Express (sin levantar el servidor).
 * Separarlo de `index.ts` facilita los tests de integración.
 */
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import apiRoutes from './routes';

export interface AppOptions {
  /** Ruta explícita hacia `client/dist` compilado (usada por Electron empaquetado). */
  clientDistPath?: string;
  /** Política CORS personalizada (`true`, `false` u origen explícito). */
  corsOrigin?: string | boolean;
}

function resolveClientDistPath(explicitPath?: string): string | null {
  const candidates = [
    explicitPath,
    process.env.CLIENT_DIST_PATH,
    path.resolve(__dirname, '../client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../client/dist'),
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, 'index.html'))) {
      return resolved;
    }
  }
  return null;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const configuredOrigin = options.corsOrigin ?? env.corsOrigin;

  app.use(
    cors({
      origin:
        typeof configuredOrigin === 'boolean'
          ? configuredOrigin
          : (origin, callback) => {
              if (!origin) return callback(null, true);
              if (
                origin === configuredOrigin ||
                /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
              ) {
                return callback(null, true);
              }
              return callback(new Error('Origen CORS no permitido'));
            },
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRoutes);
  app.use('/api', notFoundHandler);

  // En producción o Electron, sirve el build compilado de React (client/dist).
  const clientDist = resolveClientDistPath(options.clientDistPath);
  if (clientDist) {
    app.use(express.static(clientDist, { dotfiles: 'allow' }));
    app.get('*', (_req, res) =>
      res.sendFile('index.html', { root: clientDist, dotfiles: 'allow' }),
    );
  }

  app.use(errorHandler);
  return app;
}
