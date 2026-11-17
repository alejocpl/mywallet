/**
 * Sistema de actualizaciones automáticas basado en `electron-updater`.
 * Emite el progreso hacia el frontend vía IPC seguro (`updater:status`) y
 * expone handlers explícitos para comprobar e instalar nuevas versiones.
 */
import { app, ipcMain, type BrowserWindow } from 'electron';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';
import type { DesktopUpdateStatus } from './preload';

let latestStatus: DesktopUpdateStatus = { state: 'idle' };
let initialized = false;

function isMissingReleaseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('404') ||
    lower.includes('latest.yml') ||
    lower.includes('latest-mac.yml') ||
    lower.includes('no published versions') ||
    lower.includes('unable to find latest version') ||
    lower.includes('cannot find channel')
  );
}

function broadcastStatus(getWindow: () => BrowserWindow | null, status: DesktopUpdateStatus): void {
  latestStatus = status;
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', status);
  }
}

export function setupAutoUpdater(getWindow: () => BrowserWindow | null): void {
  if (initialized) return;
  initialized = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcastStatus(getWindow, { state: 'checking' });
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    broadcastStatus(getWindow, {
      state: 'available',
      version: info.version,
    });
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    broadcastStatus(getWindow, {
      state: 'not-available',
      version: info.version,
    });
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    broadcastStatus(getWindow, {
      state: 'downloading',
      progressPercent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    broadcastStatus(getWindow, {
      state: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err: Error) => {
    const rawMessage = err?.message ?? '';
    if (isMissingReleaseError(rawMessage)) {
      broadcastStatus(getWindow, {
        state: 'not-available',
        version: app.getVersion(),
        message: 'Ya tienes la versión más reciente instalada.',
      });
      return;
    }
    broadcastStatus(getWindow, {
      state: 'error',
      message: rawMessage || 'No se pudo consultar el servidor de actualizaciones.',
    });
  });

  ipcMain.handle('updater:check', async (): Promise<DesktopUpdateStatus> => {
    if (!app.isPackaged) {
      return {
        state: 'not-available',
        version: app.getVersion(),
        message: 'Las actualizaciones automáticas se habilitan en la versión instalada (.exe / .dmg).',
      };
    }

    try {
      await autoUpdater.checkForUpdates();
      return latestStatus;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      if (isMissingReleaseError(rawMessage)) {
        const upToDateStatus: DesktopUpdateStatus = {
          state: 'not-available',
          version: app.getVersion(),
          message: 'Ya tienes la versión más reciente instalada.',
        };
        broadcastStatus(getWindow, upToDateStatus);
        return upToDateStatus;
      }

      const errorStatus: DesktopUpdateStatus = {
        state: 'error',
        message: rawMessage
          ? `No fue posible verificar actualizaciones: ${rawMessage}`
          : 'No fue posible verificar actualizaciones.',
      };
      broadcastStatus(getWindow, errorStatus);
      return errorStatus;
    }
  });

  ipcMain.handle('updater:install', (): void => {
    if (app.isPackaged) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Verificación silenciosa poco después de abrir la versión instalada.
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => undefined);
    }, 6000).unref();
  }
}
