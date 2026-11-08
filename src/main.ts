import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import started from 'electron-squirrel-startup';
import { VaultManager, VaultAccount, VaultData } from './vault';
import AdmZip from 'adm-zip';
import https from 'https';
import http from 'http';

// Path güvenlik fonksiyonları
const isPathSafe = (filePath: string, allowedDir: string): boolean => {
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);
  const relativePath = path.relative(resolvedAllowedDir, resolvedPath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const UPDATE_REPOSITORY = 'itsvarp/vaultenc';
const ALLOWED_UPDATE_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com'
]);

let downloadedUpdatePath: string | null = null;

const validateUpdateUrl = (rawUrl: string, isRedirect = false): URL => {
  const parsedUrl = new URL(rawUrl);
  if (parsedUrl.protocol !== 'https:' || !ALLOWED_UPDATE_HOSTS.has(parsedUrl.hostname)) {
    throw new Error('Güncelleme adresi güvenilir değil');
  }

  if (!isRedirect) {
    const expectedPrefix = `/${UPDATE_REPOSITORY}/releases/download/`;
    if (parsedUrl.hostname !== 'github.com' || !parsedUrl.pathname.startsWith(expectedPrefix)) {
      throw new Error('Güncelleme yalnızca resmi GitHub deposundan indirilebilir');
    }
  }

  return parsedUrl;
};

const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Vault manager instance
const vaultManager = new VaultManager();
let currentVaultData: VaultData | null = null;

// Sürüm kontrolü değişkenleri
let updateCheckInterval: NodeJS.Timeout | null = null;
let mainWindow: BrowserWindow | null = null;
let UPDATE_CHECK_INTERVAL = 10 * 60 * 1000; // 10 dakika
let VERSION_URL = 'http://localhost:5173/version-info.json'; // Local development URL
let autoUpdateEnabled = true;
let downloadInProgress = false;
let downloadCancelled = false;

// Config dosyasını oku
const loadConfig = (): void => {
  try {
    // Farklı yolları dene
    const possiblePaths = [
      path.join(process.cwd(), 'config.json'),
      path.join(__dirname, '../config.json'),
      path.join(__dirname, '../../config.json'),
      path.join(app.getAppPath(), 'config.json')
    ];
    
    let configPath = '';
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        configPath = testPath;
        break;
      }
    }
    
    if (configPath) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      VERSION_URL = configData.updateUrl || VERSION_URL;
      UPDATE_CHECK_INTERVAL = configData.updateCheckInterval || UPDATE_CHECK_INTERVAL;
      autoUpdateEnabled = configData.autoUpdateEnabled !== undefined ? configData.autoUpdateEnabled : autoUpdateEnabled;
      console.log('Config yüklendi');
    } else {
      console.log('Config dosyası bulunamadı, varsayılan ayarlar kullanılıyor');
    }
  } catch (error) {
    console.error('Config dosyası okunamadı:', error);
  }
};

// Uygulama başlatılırken config'i yükle
loadConfig();

// Memory management
const cleanupMemory = () => {
  if (currentVaultData) {
    // Hassas verileri temizle
    if (currentVaultData.accounts) {
      currentVaultData.accounts.forEach(account => {
        if (account.password) {
          // Password string'ini sıfırla
          account.password = '';
        }
      });
    }
    currentVaultData = null;
  }
  
  // Garbage collection'ı tetikle
  if (global.gc) {
    global.gc();
  }
};

// Sürüm kontrolü fonksiyonları
const getCurrentVersion = (): string => {
  const packagePath = path.join(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
};

const compareVersions = (current: string, latest: string): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  return false;
};

const fetchVersionInfo = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const makeRequest = (url: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Çok fazla redirect'));
        return;
      }
      
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (res) => {
        // Redirect kontrolü
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          const location = res.headers.location;
          if (location) {
            console.log(`Redirect: ${url} -> ${location}`);
            makeRequest(location, redirectCount + 1);
            return;
          }
        }
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            // Boş veya geçersiz response kontrolü
            if (!data || data.trim() === '') {
              reject(new Error('Boş sürüm bilgisi yanıtı'));
              return;
            }
            
            // "Redirecting..." gibi HTML içeriği kontrolü
            if (data.includes('Redirecting') || data.includes('<html>') || data.includes('<!DOCTYPE')) {
              reject(new Error('Geçersiz JSON yanıtı - HTML sayfası döndü'));
              return;
            }
            
            const versionInfo = JSON.parse(data);
            
            // Gerekli alanların varlığını kontrol et
            if (!versionInfo.version) {
              reject(new Error('Sürüm bilgisi eksik'));
              return;
            }
            
            resolve(versionInfo);
          } catch (error) {
            console.error('JSON Parse Hatası:', error);
            reject(new Error(`Sürüm bilgisi parse edilemedi: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        console.error('HTTP Request Hatası:', error);
        reject(new Error(`Sürüm kontrolü hatası: ${error.message}`));
      });
    };
    
    makeRequest(VERSION_URL);
  });
};

const checkForUpdates = async (showNoUpdateMessage = false): Promise<void> => {
  if (!autoUpdateEnabled && !showNoUpdateMessage) return;
  
  try {
    const versionInfo = await fetchVersionInfo();
    const currentVersion = getCurrentVersion();
    const hasUpdate = compareVersions(currentVersion, versionInfo.version);
    
    if (hasUpdate) {
      // Ana pencereye güncelleme bilgisini gönder
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:available', {
          currentVersion,
          latestVersion: versionInfo.version,
          releaseNotes: versionInfo.releaseNotes,
          downloadUrl: versionInfo.platforms?.windows?.url || versionInfo.downloadUrl,
          mandatory: versionInfo.mandatory || false
        });
      }
    } else {
      // Güncelleme yoksa her durumda bildir (manuel kontrol veya otomatik)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update:not-available', { currentVersion });
      }
    }
  } catch (error) {
    console.error('Sürüm kontrolü hatası:', error);
    // Hata durumunda her zaman event gönder (manuel kontrol veya otomatik)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:error', { error: error.message });
    }
  }
};

const startUpdateChecker = (): void => {
  // İlk kontrol 30 saniye sonra
  setTimeout(() => checkForUpdates(), 30000);
  
  // Periyodik kontrol
  updateCheckInterval = setInterval(() => {
    checkForUpdates();
  }, UPDATE_CHECK_INTERVAL);
};

const stopUpdateChecker = (): void => {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }
};

function downloadUpdate(updateInfo: any): Promise<string> {
  return new Promise((resolve, reject) => {
    if (downloadInProgress) {
      reject(new Error('Zaten bir indirme devam ediyor'));
      return;
    }

    const downloadUrl = updateInfo.downloadUrl || updateInfo.platforms?.windows?.url;
    if (!downloadUrl) {
      reject(new Error('İndirme URL\'si bulunamadı'));
      return;
    }

    downloadInProgress = true;
    downloadCancelled = false;
    downloadedUpdatePath = null;
    
    let initialUrl: URL;
    try {
      initialUrl = validateUpdateUrl(downloadUrl);
    } catch (error) {
      reject(error);
      return;
    }

    const fileName = sanitizeFileName(path.basename(initialUrl.pathname));
    if (!fileName.toLowerCase().endsWith('.exe')) {
      reject(new Error('Desteklenmeyen güncelleme dosyası'));
      return;
    }
    const tempDir = path.join(process.env.TEMP || '/tmp', 'vaultenc-updates');
    const filePath = path.join(tempDir, fileName);

    // Temp dizini oluştur
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const handleRequest = (url: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        downloadInProgress = false;
        reject(new Error('Çok fazla yönlendirme'));
        return;
      }

      let validatedUrl: URL;
      try {
        validatedUrl = validateUpdateUrl(url, redirectCount > 0);
      } catch (error) {
        downloadInProgress = false;
        reject(error);
        return;
      }
      
      https.get(validatedUrl, (response) => {
        // Redirect durumları (301, 302, 307, 308)
        if (response.statusCode && [301, 302, 307, 308].includes(response.statusCode)) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`Yönlendiriliyor: ${url} -> ${redirectUrl}`);
            handleRequest(new URL(redirectUrl, validatedUrl).toString(), redirectCount + 1);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          downloadInProgress = false;
          reject(new Error(`İndirme hatası: ${response.statusCode}`));
          return;
        }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      const startTime = Date.now();

      const fileStream = fs.createWriteStream(filePath);
      
      response.on('data', (chunk) => {
        if (downloadCancelled) {
          fileStream.destroy();
          fs.unlink(filePath, () => {});
          downloadInProgress = false;
          reject(new Error('İndirme iptal edildi'));
          return;
        }

        downloadedSize += chunk.length;
        fileStream.write(chunk);

        // Progress hesapla
        const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : 0;
        const elapsedTime = (Date.now() - startTime) / 1000;
        const speed = downloadedSize / elapsedTime;
        const speedText = formatBytes(speed) + '/s';

        // Progress event gönder
        if (mainWindow) {
          mainWindow.webContents.send('download:progress', {
            progress: Math.round(progress),
            downloadedSize,
            totalSize,
            speed: speedText,
            fileName
          });
        }
      });

      response.on('end', () => {
        fileStream.end();
        downloadInProgress = false;
        
        if (!downloadCancelled) {
          if (mainWindow) {
            mainWindow.webContents.send('download:complete', { filePath, fileName });
          }
          downloadedUpdatePath = path.resolve(filePath);
          resolve(downloadedUpdatePath);
        }
      });

      response.on('error', (error) => {
        fileStream.destroy();
        fs.unlink(filePath, () => {});
        downloadInProgress = false;
        reject(error);
      });
      });
    };
    
    // İlk isteği başlat
    handleRequest(downloadUrl);
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function cancelDownload(): void {
  downloadCancelled = true;
  downloadInProgress = false;
  downloadedUpdatePath = null;
}

function installUpdate(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const resolvedPath = path.resolve(filePath);
    if (!downloadedUpdatePath || resolvedPath !== downloadedUpdatePath || !fs.existsSync(resolvedPath)) {
      reject(new Error('Güncelleme dosyası bulunamadı'));
      return;
    }

    // Güncelleme dosyasını çalıştır
    shell.openPath(resolvedPath).then((errorMessage) => {
      if (errorMessage) {
        throw new Error(errorMessage);
      }
      // Uygulamayı yeniden başlat
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1000);
      resolve();
    }).catch(reject);
  });
}

const createWindow = (): void => {
  // Alt tuşu menüsünü devre dışı bırak
  Menu.setApplicationMenu(null);
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 750,
    minWidth: 370,
    minHeight: 500,
    maxWidth: 600,
    maxHeight: 750,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = mainWindow?.webContents.getURL();
    if (currentUrl && navigationUrl !== currentUrl) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  
  // Otomatik sürüm kontrolünü başlat
  startUpdateChecker();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  cleanupMemory();
  stopUpdateChecker();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handler'ları
ipcMain.handle('vault:exists', async () => {
  return await vaultManager.vaultExists();
});

ipcMain.handle('vault:isUnlocked', () => {
  return vaultManager.isUnlocked();
});

ipcMain.handle('vault:create', async (_, masterPassword: string) => {
  await vaultManager.createVault(masterPassword);
  currentVaultData = { accounts: [] };
  return true;
});

ipcMain.handle('vault:unlock', async (_, masterPassword: string) => {
  try {
    currentVaultData = await vaultManager.unlockVault(masterPassword);
    return currentVaultData;
  } catch (error) {
    currentVaultData = null;
    throw error;
  }
});

ipcMain.handle('vault:lock', async () => {
  vaultManager.lockVault();
  cleanupMemory();
});

ipcMain.handle('vault:verify-password', async (_, masterPassword: string) => {
  try {
    // Mevcut vault'u unlock etmeye çalışarak password'u doğrula
    await vaultManager.unlockVault(masterPassword);
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('vault:getAccounts', () => {
  if (!currentVaultData) {
    throw new Error('Vault kilidi açılmamış');
  }
  return currentVaultData.accounts;
});

ipcMain.handle('vault:addAccount', async (_, account: VaultAccount) => {
  if (!currentVaultData) {
    throw new Error('Vault kilidi açılmamış');
  }
  
  currentVaultData.accounts.push(account);
  await vaultManager.saveVault(currentVaultData);
});

ipcMain.handle('vault:deleteAccount', async (_, index: number) => {
  if (!currentVaultData) {
    throw new Error('Vault kilidi açılmamış');
  }
  
  currentVaultData.accounts.splice(index, 1);
  await vaultManager.saveVault(currentVaultData);
});

ipcMain.handle('vault:export', async () => {
  if (!currentVaultData) {
    return { success: false, message: 'Vault kilidi açılmamış' };
  }

  try {
    // Kayıt konumu seçimi
    const result = await dialog.showSaveDialog({
      title: 'Vault Verilerini Kaydet',
      defaultPath: sanitizeFileName('vault-backup.zip'),
      filters: [
        { name: 'ZIP Dosyaları', extensions: ['zip'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'İşlem iptal edildi' };
    }

    // Path güvenlik kontrolü
    const allowedDir = os.homedir();
    if (!isPathSafe(result.filePath, allowedDir)) {
      return { success: false, message: 'Güvenlik nedeniyle dosya kaydedilemedi' };
    }

    // ZIP dosyası oluştur
    const zip = new AdmZip();
    
    // Vault.enc dosyasını ZIP'e ekle
    const vaultPath = path.join(os.homedir(), 'Documents', '.vaultenc', 'vault.enc');
    if (fs.existsSync(vaultPath)) {
      zip.addLocalFile(vaultPath);
    }

    // ZIP dosyasını kaydet
    zip.writeZip(result.filePath);

    return { success: true, message: 'Veriler başarıyla dışa aktarıldı' };
  } catch (error) {
    return { success: false, message: 'Dışa aktarma sırasında hata oluştu' };
  }
});

ipcMain.handle('vault:import', async () => {
  try {
    // Dosya seçimi
    const result = await dialog.showOpenDialog({
      title: 'Vault Dosyasını Seç',
      filters: [
        { name: 'ZIP Dosyaları', extensions: ['zip'] },
        { name: 'Vault Dosyaları', extensions: ['enc'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths.length) {
      return { success: false, message: 'İşlem iptal edildi' };
    }

    const selectedFile = result.filePaths[0];
    
    // Path güvenlik kontrolü
    const allowedDir = os.homedir();
    if (!isPathSafe(selectedFile, allowedDir)) {
      return { success: false, message: 'Güvenlik nedeniyle dosya okunamadı' };
    }

    // Dosya uzantısı kontrolü
    const allowedExtensions = ['.zip', '.enc'];
    const fileExt = path.extname(selectedFile).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return { success: false, message: 'Desteklenmeyen dosya formatı' };
    }

    const vaultDir = path.join(os.homedir(), 'Documents', '.vaultenc');
    const vaultPath = path.join(vaultDir, 'vault.enc');

    // Klasörü oluştur (yoksa)
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    if (selectedFile.endsWith('.zip')) {
      // ZIP dosyasından vault.enc'yi çıkar
      const zip = new AdmZip(selectedFile);
      const entries = zip.getEntries();
      
      // Sadece vault.enc dosyasını kabul et
      const vaultEntry = entries.find(entry => entry.entryName === 'vault.enc');
      if (!vaultEntry) {
        return { success: false, message: 'ZIP dosyasında vault.enc bulunamadı' };
      }

      // Dosya boyutu kontrolü (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (vaultEntry.header.size > maxSize) {
        return { success: false, message: 'Dosya boyutu çok büyük' };
      }

      fs.writeFileSync(vaultPath, vaultEntry.getData());
    } else if (selectedFile.endsWith('.enc')) {
      // Dosya boyutu kontrolü
      const stats = fs.statSync(selectedFile);
      const maxSize = 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        return { success: false, message: 'Dosya boyutu çok büyük' };
      }

      // Doğrudan vault.enc dosyasını kopyala
      fs.copyFileSync(selectedFile, vaultPath);
    }

    return { success: true, message: 'Veriler başarıyla içe aktarıldı' };
  } catch (error) {
    return { success: false, message: 'İçe aktarma sırasında hata oluştu' };
  }
});

ipcMain.handle('app:close', () => {
  app.quit();
});

// Sürüm kontrolü IPC handler'ları
ipcMain.handle('update:check-manual', async () => {
  try {
    await checkForUpdates(true); // showNoUpdateMessage = true
    return { success: true, message: 'Güncelleme kontrolü tamamlandı' };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update:download', async (event, updateInfo) => {
  try {
    const result = await downloadUpdate(updateInfo);
    return result;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update:cancel-download', async () => {
  try {
    cancelDownload();
    return { success: true, message: 'İndirme iptal edildi' };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update:install', async (event, filePath: string) => {
  try {
    await installUpdate(filePath);
    return { success: true, message: 'Güncelleme yükleniyor...' };
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('update:get-settings', async () => {
  return {
    autoUpdateEnabled,
    checkInterval: UPDATE_CHECK_INTERVAL,
    downloadInProgress
  };
});

ipcMain.handle('update:set-auto-update', async (event, enabled: boolean) => {
  autoUpdateEnabled = enabled;
  
  if (enabled) {
    startUpdateChecker();
  } else {
    stopUpdateChecker();
  }
  
  return { success: true, autoUpdateEnabled };
});

// Uygulama yeniden başlatma için
ipcMain.handle('app:restart', async () => {
  app.relaunch();
  app.exit();
});

// Güncelleme başarı durumunu kaydet
ipcMain.handle('update:mark-success', async () => {
  // Güncelleme başarılı olduğunu işaretle
  const configPath = path.join(os.homedir(), '.vaultenc', 'update-status.json');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify({
    lastUpdateSuccess: true,
    lastUpdateTime: new Date().toISOString()
  }));
  
  return { success: true };
});

// Güncelleme durumunu kontrol et
ipcMain.handle('update:check-success', async () => {
  const configPath = path.join(os.homedir(), '.vaultenc', 'update-status.json');
  
  if (fs.existsSync(configPath)) {
    try {
      const status = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (status.lastUpdateSuccess) {
        // Durumu temizle
        fs.unlinkSync(configPath);
        return { updateSuccess: true, updateTime: status.lastUpdateTime };
      }
    } catch (error) {
      console.error('Update status okuma hatası:', error);
    }
  }
  
  return { updateSuccess: false };
});

ipcMain.handle('delete-vault-folder', async () => {
  try {
    // Önce vault'u kilitle
    vaultManager.lockVault();
    currentVaultData = null;
    
    const vaultPath = vaultManager.getVaultPath();
    const vaultDir = path.dirname(vaultPath);
    
    // .vaultenc klasörünü kontrol et ve sil
    if (fs.existsSync(vaultDir)) {
      // Windows'ta dosya kilitleri için biraz bekle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Önce dosyaları tek tek sil
      const files = fs.readdirSync(vaultDir);
      
      for (const file of files) {
        const filePath = path.join(vaultDir, file);
        
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
            throw new Error('Vault dosyası silinemedi');
          }
        }
      }
      
      // Sonra klasörü sil
      try {
        fs.rmdirSync(vaultDir);
      } catch (dirError) {
        throw new Error('Vault klasörü silinemedi');
      }
    }
    return { success: true };
  } catch (error) {
    logError(error, 'delete-vault-folder');
    return { success: false, error: getUserFriendlyMessage(error) };
  }
});

// Uygulama kapatılırken vault'u kilitle
app.on('before-quit', () => {
  vaultManager.lockVault();
  cleanupMemory();
});
