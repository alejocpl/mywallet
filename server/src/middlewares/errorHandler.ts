import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

/** 404 para rutas de la API inexistentes. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

/** Manejador global de errores: traduce errores conocidos a respuestas JSON. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({
      error: first ? first.message : 'Datos inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const code = typeof err?.code === 'string' ? err.code : '';
  if (code.startsWith('SQLITE_CONSTRAINT')) {
    res.status(409).json({ error: 'La operación entra en conflicto con datos existentes' });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
