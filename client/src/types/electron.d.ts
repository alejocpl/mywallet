/// <reference types="vite/client" />

/** Estado emitido por `electron-updater` hacia la interfaz de escritorio. */
export interface DesktopUpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progressPercent?: number;
  message?: string;
}

/** Contrato seguro expuesto por `electron/src/preload.ts` mediante `contextBridge`. */
export interface MyWalletDesktopBridge {
  isDesktop: boolean;
  platform: string;
  appVersion: string;
  apiBaseUrl: string;
  dbPath: string;
  checkForUpdates: () => Promise<DesktopUpdateStatus>;
  installUpdate: () => Promise<void>;
  openDataFolder: () => Promise<void>;
  onUpdateStatus: (callback: (status: DesktopUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    mywalletDesktop?: MyWalletDesktopBridge;
  }
}

export {};
