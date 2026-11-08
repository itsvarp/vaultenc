import { contextBridge, ipcRenderer } from 'electron';
import { VaultAccount, VaultData } from './vault';

// Güvenli API'yi renderer process'e expose et
contextBridge.exposeInMainWorld('vaultAPI', {
  // Vault durumu
  vaultExists: () => ipcRenderer.invoke('vault:exists'),
  isUnlocked: () => ipcRenderer.invoke('vault:isUnlocked'),
  
  // Vault işlemleri
  createVault: (masterPassword: string) => ipcRenderer.invoke('vault:create', masterPassword),
  unlockVault: (masterPassword: string) => ipcRenderer.invoke('vault:unlock', masterPassword),
  lockVault: () => ipcRenderer.invoke('vault:lock'),
  verifyPassword: (masterPassword: string) => ipcRenderer.invoke('vault:verify-password', masterPassword),
  
  // Hesap yönetimi
  getAccounts: () => ipcRenderer.invoke('vault:getAccounts'),
  addAccount: (account: VaultAccount) => ipcRenderer.invoke('vault:addAccount', account),
  deleteAccount: (index: number) => ipcRenderer.invoke('vault:deleteAccount', index),
  
  // Import/Export işlemleri
  exportVault: () => ipcRenderer.invoke('vault:export'),
  importVault: () => ipcRenderer.invoke('vault:import'),
  
  // Uygulama işlemleri
  closeApp: () => ipcRenderer.invoke('app:close'),
  deleteVaultFolder: () => ipcRenderer.invoke('delete-vault-folder'),
  
  // Güncelleme işlemleri
  checkForUpdates: () => ipcRenderer.invoke('update:check-manual'),
  downloadUpdate: (updateInfo: any) => ipcRenderer.invoke('update:download', updateInfo),
  cancelDownload: () => ipcRenderer.invoke('update:cancel-download'),
  installUpdate: (filePath: string) => ipcRenderer.invoke('update:install', filePath),
  getUpdateSettings: () => ipcRenderer.invoke('update:get-settings'),
  setAutoUpdate: (enabled: boolean) => ipcRenderer.invoke('update:set-auto-update', enabled),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  markUpdateSuccess: () => ipcRenderer.invoke('update:mark-success'),
  checkUpdateSuccess: () => ipcRenderer.invoke('update:check-success'),
  
  // Güncelleme event'leri
  onUpdateAvailable: (callback: (updateInfo: any) => void) => {
    ipcRenderer.on('update:available', (_, updateInfo) => callback(updateInfo));
  },
  onNoUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update:not-available', (_, info) => callback(info));
  },
  onUpdateCheckError: (callback: (error: string) => void) => {
    ipcRenderer.on('update:error', (_, error) => callback(error));
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download:progress', (_, progress) => callback(progress));
  },
  onDownloadComplete: (callback: (info: any) => void) => {
    ipcRenderer.on('download:complete', (_, info) => callback(info));
  },
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update:available');
    ipcRenderer.removeAllListeners('update:not-available');
    ipcRenderer.removeAllListeners('update:error');
    ipcRenderer.removeAllListeners('download:progress');
    ipcRenderer.removeAllListeners('download:complete');
  }
});

// Electron API'yi expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // Güncelleme işlemleri
  downloadUpdate: (updateInfo: any) => ipcRenderer.invoke('update:download', updateInfo),
  cancelDownload: () => ipcRenderer.invoke('update:cancel-download'),
  installUpdate: (filePath: string) => ipcRenderer.invoke('update:install', filePath),
  markUpdateSuccess: () => ipcRenderer.invoke('update:mark-success'),
  checkUpdateSuccess: () => ipcRenderer.invoke('update:check-success'),
  
  // Event dinleyicileri
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download:progress', (_, progress) => callback(progress));
  },
  onDownloadComplete: (callback: (info: any) => void) => {
    ipcRenderer.on('download:complete', (_, info) => callback(info));
  }
});

// TypeScript için tip tanımları
declare global {
  interface Window {
    vaultAPI: {
      removeUpdateListeners(): unknown;
      onUpdateAvailable(arg0: (updateData: any) => void): unknown;
      vaultExists: () => Promise<boolean>;
      isUnlocked: () => Promise<boolean>;
      createVault: (masterPassword: string) => Promise<void>;
      unlockVault: (masterPassword: string) => Promise<VaultData>;
      lockVault: () => Promise<void>;
      verifyPassword: (masterPassword: string) => Promise<boolean>;
      getAccounts: () => Promise<VaultAccount[]>;
      addAccount: (account: VaultAccount) => Promise<void>;
      deleteAccount: (index: number) => Promise<void>;
      exportVault: () => Promise<{success: boolean; message: string}>;
      importVault: () => Promise<{success: boolean; message: string}>;
      closeApp: () => Promise<void>;
      deleteVaultFolder: () => Promise<{success: boolean; error?: string}>;
    };
    electronAPI: {
      installUpdate(filePath: string): unknown;
      checkUpdateSuccess(): unknown;
      markUpdateSuccess(): unknown;
      cancelDownload(): unknown;
      downloadUpdate(updateInfo: any): unknown;
      onDownloadComplete(arg0: (info: any) => void): unknown;
      onDownloadProgress(arg0: (progress: any) => void): unknown;
    };
  }
}

