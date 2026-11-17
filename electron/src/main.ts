/**
 * Proceso principal de Electron para MyWallet (Windows y macOS).
 * Responsabilidades:
 *  1. Asegurar instancia única de la aplicación.
 *  2. Configurar SQLite en una carpeta persistente del usuario (`app.getPath('userData')`),
 *     fuera de la carpeta de instalación para proteger datos entre actualizaciones.
 *  3. Iniciar y detener automáticamente el servidor Express embebido en `127.0.0.1`.
 *  4. Crear la ventana con aislamiento estricto de seguridad (`nodeIntegration: false`,
 *     `contextIsolation: true`, `sandbox: true`, `webSecurity: true`).
 *  5. Gestionar actualizaciones automáticas mediante `electron-updater`.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { setupAutoUpdater } from './updater';

interface EmbeddedServerHandle {
  port: number;
  host: string;
  url: string;
  dbPath: string;
  stop: () => Promise<void>;
}

interface EmbeddedServerModule {
  startServer: (options?: {
    port?: number;
    host?: string;
    clientDistPath?: string;
    corsOrigin?: string | boolean;
  }) => Promise<EmbeddedServerHandle>;
  stopServer: () => Promise<void>;
}

app.setName('MyWallet');

let mainWindow: BrowserWindow | null = null;
let embeddedServer: EmbeddedServerHandle | null = null;
let isShuttingDown = false;
let currentApiBaseUrl = '';
let currentDbPath = '';

function resolvePersistentDbPath(): string {
  const userDataDir = app.getPath('userData');
  const dataDir = path.join(userDataDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'mywallet.db');
}

function probeHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 600 }, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function bootstrapBackend(): Promise<{
  windowUrl: string;
  apiBaseUrl: string;
  dbPath: string;
}> {
  const appRoot = path.resolve(__dirname, '../..');
  const unpackedRoot =
    app.isPackaged && path.basename(appRoot).toLowerCase() === 'app.asar'
      ? path.join(path.dirname(appRoot), 'app.asar.unpacked')
      : appRoot;

  const unpackedClientDist = path.join(unpackedRoot, 'client', 'dist');
  const clientDistPath = fs.existsSync(path.join(unpackedClientDist, 'index.html'))
    ? unpackedClientDist
    : path.join(appRoot, 'client', 'dist');

  const unpackedServerEntry = path.join(unpackedRoot, 'server', 'dist', 'index.js');
  const serverEntryPath = fs.existsSync(unpackedServerEntry)
    ? unpackedServerEntry
    : path.join(appRoot, 'server', 'dist', 'index.js');

  const persistentDbPath = resolvePersistentDbPath();

  process.env.DB_PATH = persistentDbPath;
  process.env.CLIENT_DIST_PATH = clientDistPath;
  process.env.ELECTRON_RUN = '1';
  process.env.APP_VERSION = app.getVersion();

  const isDevMode = !app.isPackaged && process.env.MYWALLET_DEV === '1';

  if (isDevMode) {
    const devViteUrl = process.env.MYWALLET_VITE_URL ?? 'http://localhost:5173';
    const devApiOrigin = 'http://127.0.0.1:4000';
    const devServerAlive = await probeHealth(`${devApiOrigin}/api/health`);

    if (devServerAlive) {
      const devDbPath = path.join(appRoot, 'server', 'data', 'mywallet.db');
      return {
        windowUrl: devViteUrl,
        apiBaseUrl: `${devApiOrigin}/api`,
        dbPath: fs.existsSync(devDbPath) ? devDbPath : persistentDbPath,
      };
    }

    // Si se ejecutó sin el servidor paralelo, levantamos el backend embebido en :4000.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serverModule = require(serverEntryPath) as EmbeddedServerModule;
    embeddedServer = await serverModule.startServer({
      host: '127.0.0.1',
      port: 4000,
      clientDistPath,
      corsOrigin: true,
    });

    return {
      windowUrl: devViteUrl,
      apiBaseUrl: `${embeddedServer.url}/api`,
      dbPath: embeddedServer.dbPath,
    };
  }

  process.env.NODE_ENV = 'production';

  if (!fs.existsSync(serverEntryPath)) {
    throw new Error(
      `No se encontró el backend compilado en ${serverEntryPath}. Ejecuta "npm run build" antes de iniciar Electron.`,
    );
  }
  if (!fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    throw new Error(
      `No se encontró el frontend compilado en ${clientDistPath}. Ejecuta "npm run build" antes de iniciar Electron.`,
    );
  }

  // Carga diferida tras fijar `process.env.DB_PATH` en `userData`.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serverModule = require(serverEntryPath) as EmbeddedServerModule;
  embeddedServer = await serverModule.startServer({
    host: '127.0.0.1',
    port: 0,
    clientDistPath,
  });

  return {
    windowUrl: embeddedServer.url,
    apiBaseUrl: `${embeddedServer.url}/api`,
    dbPath: embeddedServer.dbPath,
  };
}

function createMainWindow(windowUrl: string, apiBaseUrl: string, dbPath: string): BrowserWindow {
  const allowedOrigins = new Set<string>([
    new URL(windowUrl).origin,
    new URL(apiBaseUrl).origin,
  ]);

  const iconCandidate = path.resolve(__dirname, '../../build/icon.png');
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'MyWallet — Finanzas Personales (COP)',
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    ...(fs.existsSync(iconCandidate) ? { icon: iconCandidate } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      additionalArguments: [
        `--mywallet-api=${apiBaseUrl}`,
        `--mywallet-version=${app.getVersion()}`,
        `--mywallet-db=${encodeURIComponent(dbPath)}`,
      ],
    },
  });

  // Bloquea cualquier ventana emergente o navegación hacia orígenes externos.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      const targetOrigin = new URL(targetUrl).origin;
      if (!allowedOrigins.has(targetOrigin)) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  win.loadURL(windowUrl);

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  return win;
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Deshabilita `<webview>` en todo Electron como medida adicional de endurecimiento.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
  });

  app.whenReady().then(async () => {
    try {
      const boot = await bootstrapBackend();
      currentApiBaseUrl = boot.apiBaseUrl;
      currentDbPath = boot.dbPath;

      ipcMain.on('app:get-desktop-config', (event) => {
        event.returnValue = {
          platform: process.platform,
          appVersion: app.getVersion(),
          apiBaseUrl: currentApiBaseUrl,
          dbPath: currentDbPath,
        };
      });

      ipcMain.handle('app:open-data-folder', () => {
        if (currentDbPath) {
          shell.showItemInFolder(currentDbPath);
        }
      });

      mainWindow = createMainWindow(boot.windowUrl, boot.apiBaseUrl, boot.dbPath);
      setupAutoUpdater(() => mainWindow);

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          mainWindow = createMainWindow(boot.windowUrl, currentApiBaseUrl, currentDbPath);
        }
      });
    } catch (err) {
      dialog.showErrorBox(
        'Error al iniciar MyWallet',
        err instanceof Error ? err.message : 'Ocurrió un error inesperado al iniciar el servidor local.',
      );
      app.quit();
    }
  });

  app.on('before-quit', async (event) => {
    if (embeddedServer && !isShuttingDown) {
      event.preventDefault();
      isShuttingDown = true;
      try {
        await embeddedServer.stop();
      } catch {
        // Garantizamos salida limpia incluso ante errores en cierre de sockets.
      } finally {
        embeddedServer = null;
        app.quit();
      }
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
