/**
 * Punto de entrada y gestor de ciclo de vida del servidor Express.
 * Permite ejecutar el backend de forma independiente (`npm start` / `npm run dev`)
 * o embebido dentro del proceso principal de Electron (`startServer` / `stopServer`).
 */
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from './app';
import { env } from './config/env';
import { closeDatabase, getDbPath } from './db/connection';
import { runMigrations } from './db/schema';

export interface StartServerOptions {
  port?: number;
  host?: string;
  clientDistPath?: string;
  corsOrigin?: string | boolean;
}

export interface RunningServer {
  server: http.Server;
  port: number;
  host: string;
  url: string;
  dbPath: string;
  stop: () => Promise<void>;
}

let activeServer: http.Server | null = null;

function listenOnPort(
  app: ReturnType<typeof createApp>,
  port: number,
  host: string,
): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once('error', (err) => reject(err));
  });
}

/**
 * Inicializa el esquema SQLite y levanta el servidor Express.
 * Si el puerto preferido ya está en uso (`EADDRINUSE`) y es distinto de `0`,
 * solicita automáticamente un puerto libre al sistema operativo (`port: 0`).
 */
export async function startServer(options: StartServerOptions = {}): Promise<RunningServer> {
  if (activeServer && activeServer.listening) {
    const address = activeServer.address() as AddressInfo;
    const activeHost = options.host ?? '127.0.0.1';
    return {
      server: activeServer,
      port: address.port,
      host: activeHost,
      url: `http://${activeHost}:${address.port}`,
      dbPath: getDbPath(),
      stop: stopServer,
    };
  }

  runMigrations();

  const app = createApp({
    clientDistPath: options.clientDistPath,
    corsOrigin: options.corsOrigin,
  });

  const host = options.host ?? '127.0.0.1';
  const preferredPort = options.port ?? env.port;

  let server: http.Server;
  try {
    server = await listenOnPort(app, preferredPort, host);
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'EADDRINUSE' && preferredPort !== 0) {
      server = await listenOnPort(app, 0, host);
    } else {
      throw err;
    }
  }

  activeServer = server;
  const address = server.address() as AddressInfo;
  const boundPort = address.port;
  const url = `http://${host}:${boundPort}`;

  console.log(`💰 MyWallet API escuchando en ${url}/api (DB: ${getDbPath()})`);

  return {
    server,
    port: boundPort,
    host,
    url,
    dbPath: getDbPath(),
    stop: stopServer,
  };
}

/**
 * Detiene el servidor Express activo y cierra la conexión SQLite haciendo
 * checkpoint de WAL para no dejar bloqueos al salir de la aplicación.
 */
export async function stopServer(): Promise<void> {
  const serverToClose = activeServer;
  activeServer = null;

  if (serverToClose && serverToClose.listening) {
    await new Promise<void>((resolve) => {
      serverToClose.close(() => resolve());
      // Cierra conexiones HTTP keep-alive abiertas para no demorar el cierre de Electron.
      if (typeof serverToClose.closeAllConnections === 'function') {
        serverToClose.closeAllConnections();
      }
    });
  }

  closeDatabase();
}

// Ejecución directa cuando se inicia desde CLI (`node dist/index.js` o `tsx watch src/index.ts`).
if (require.main === module) {
  startServer().catch((err) => {
    console.error('❌ Error al iniciar el servidor MyWallet:', err);
    process.exit(1);
  });

  const shutdown = () => {
    stopServer()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
