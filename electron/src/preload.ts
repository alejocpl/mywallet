/**
 * Preload seguro para el proceso de renderizado (React).
 * Con `nodeIntegration: false`, `contextIsolation: true` y `sandbox: true`,
 * este script actúa como único puente controlado entre Electron y la UI.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface DesktopUpdateStatus {
  state:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  version?: string;
  progressPercent?: number;
  message?: string;
}

interface DesktopBootstrapConfig {
  platform: string;
  appVersion: string;
  apiBaseUrl: string;
  dbPath: string;
}

function readArgValue(prefix: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function resolveBootstrapConfig(): DesktopBootstrapConfig {
  const apiArg = readArgValue('--mywallet-api=');
  const versionArg = readArgValue('--mywallet-version=');
  const dbArg = readArgValue('--mywallet-db=');

  if (apiArg && versionArg && dbArg) {
    return {
      platform: process.platform,
      appVersion: versionArg,
      apiBaseUrl: apiArg,
      dbPath: decodeURIComponent(dbArg),
    };
  }

  // Fallback seguro si el entorno omitió `additionalArguments`.
  return ipcRenderer.sendSync('app:get-desktop-config') as DesktopBootstrapConfig;
}

const config = resolveBootstrapConfig();

contextBridge.exposeInMainWorld('mywalletDesktop', {
  isDesktop: true,
  platform: config.platform,
  appVersion: config.appVersion,
  apiBaseUrl: config.apiBaseUrl,
  dbPath: config.dbPath,
  checkForUpdates: (): Promise<DesktopUpdateStatus> => ipcRenderer.invoke('updater:check'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  openDataFolder: (): Promise<void> => ipcRenderer.invoke('app:open-data-folder'),
  onUpdateStatus: (callback: (status: DesktopUpdateStatus) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: DesktopUpdateStatus) => {
      callback(status);
    };
    ipcRenderer.on('updater:status', listener);
    return () => {
      ipcRenderer.removeListener('updater:status', listener);
    };
  },
});
