import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import MainScreen from './MainScreen';
import UpdateNotification from './UpdateNotification';
import DownloadProgress from './DownloadProgress';
import UpdateSuccessToast from './UpdateSuccessToast';
import { ThemeProvider } from '../contexts/ThemeContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';

interface VaultAccount {
  title: string;
  username: string;
  password: string;
  description?: string;
}

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
};

const AppContent: React.FC = () => {
  const { t } = useLanguage();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultExists, setVaultExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<VaultAccount[]>([]);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('');
  const [downloadedFilePath, setDownloadedFilePath] = useState('');
  const [showUpdateSuccessToast, setShowUpdateSuccessToast] = useState(false);

  useEffect(() => {
    checkVaultStatus();
    
    // API'lerin mevcut olup olmadığını kontrol et
    if (window.vaultAPI) {
      // Güncelleme event'lerini dinle
      window.vaultAPI.onUpdateAvailable((updateData: any) => {
        setUpdateInfo(updateData);
        setShowUpdateNotification(true);
      });
    }

    if (window.electronAPI) {
      // İndirme progress event dinleyicileri
      window.electronAPI.onDownloadProgress((progress: any) => {
        setDownloadProgress(progress.progress);
        setDownloadSpeed(progress.speed);
        setDownloadFileName(progress.fileName);
      });

      window.electronAPI.onDownloadComplete((info: any) => {
        setShowDownloadProgress(false);
        setDownloadedFilePath(info.filePath);
        // Otomatik yükleme başlat
        handleInstallUpdate(info.filePath);
      });

      // Uygulama başlatıldığında güncelleme başarısını kontrol et
      checkUpdateSuccess();
    }
    
    return () => {
      if (window.vaultAPI && window.vaultAPI.removeUpdateListeners) {
        window.vaultAPI.removeUpdateListeners();
      }
    };
  }, []);

  const checkVaultStatus = async () => {
    try {
      if (!window.vaultAPI) {
        console.error('vaultAPI mevcut değil');
        setLoading(false);
        return;
      }
      
      const exists = await window.vaultAPI.vaultExists();
      const unlocked = await window.vaultAPI.isUnlocked();
      
      setVaultExists(exists);
      setIsUnlocked(unlocked);
      
      if (unlocked) {
        const accountsData = await window.vaultAPI.getAccounts();
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error('Vault durumu kontrol edilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (masterPassword: string, isNewVault = false) => {
    if (isNewVault) {
      await window.vaultAPI.createVault(masterPassword);
    } else {
      await window.vaultAPI.unlockVault(masterPassword);
    }
    
    const accountsData = await window.vaultAPI.getAccounts();
    setAccounts(accountsData);
    setIsUnlocked(true);
    setVaultExists(true);
  };

  const handleLock = async () => {
    try {
      await window.vaultAPI.lockVault();
      setIsUnlocked(false);
      setAccounts([]);
    } catch (error) {
      console.error('Vault kilitlenirken hata:', error);
    }
  };

  const handleAddAccount = async (account: VaultAccount) => {
    try {
      await window.vaultAPI.addAccount(account);
      const accountsData = await window.vaultAPI.getAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Hesap eklenirken hata:', error);
      throw error;
    }
  };

  const handleDeleteAccount = async (index: number) => {
    try {
      await window.vaultAPI.deleteAccount(index);
      const accountsData = await window.vaultAPI.getAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Hesap silinirken hata:', error);
      throw error;
    }
  };
  
  const handleUpdateDownload = async () => {
      if (updateInfo && window.electronAPI) {
        try {
          setShowUpdateNotification(false);
          setShowDownloadProgress(true);
          setDownloadProgress(0);
          await window.electronAPI.downloadUpdate(updateInfo);
        } catch (error) {
          console.error('Güncelleme indirme hatası:', error);
          setShowDownloadProgress(false);
        }
      }
    };

  const handleCancelDownload = async () => {
      try {
        if (!window.electronAPI) {
          console.error('electronAPI mevcut değil');
          return;
        }
        
        await window.electronAPI.cancelDownload();
        setShowDownloadProgress(false);
      } catch (error) {
        console.error('İndirme iptal hatası:', error);
      }
    };

   const handleInstallUpdate = async (filePath: string) => {
      try {
        if (!window.electronAPI) {
          console.error('electronAPI mevcut değil');
          return;
        }
        
        await window.electronAPI.installUpdate(filePath);
        // Güncelleme başarılı olarak işaretle
        await window.electronAPI.markUpdateSuccess();
      } catch (error) {
        console.error('Yükleme hatası:', error);
      }
    };

   const checkUpdateSuccess = async () => {
     try {
       if (!window.electronAPI) {
         console.error('electronAPI mevcut değil');
         return;
       }
       
       const result = await window.electronAPI.checkUpdateSuccess();
       if (result.updateSuccess) {
         // Güncelleme başarı bildirimi göster
         setTimeout(() => {
           setShowUpdateSuccessToast(true);
         }, 1000);
       }
     } catch (error) {
       console.error('Güncelleme durumu kontrol hatası:', error);
     }
   };
  
  const handleCloseUpdateNotification = () => {
    if (!updateInfo?.mandatory) {
      setShowUpdateNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <LoginScreen
        vaultExists={vaultExists}
        onUnlock={handleUnlock}
      />
    );
  }

  const handleLogout = () => {
    setIsUnlocked(false);
    setAccounts([]);
  };

  const handleVaultDeleted = () => {
    setVaultExists(false);
    setIsUnlocked(false);
    setAccounts([]);
  };

  return (
    <>
      <MainScreen
        accounts={accounts}
        onAddAccount={handleAddAccount}
        onDeleteAccount={handleDeleteAccount}
        onLock={handleLock}
        onLogout={handleLogout}
        onVaultDeleted={handleVaultDeleted}
      />
      
      {/* Güncelleme Bildirimi */}
      {showUpdateNotification && (
        <UpdateNotification
          updateInfo={updateInfo}
          onClose={handleCloseUpdateNotification}
          onDownload={handleUpdateDownload}
        />
      )}
      
      <DownloadProgress
        isVisible={showDownloadProgress}
        progress={downloadProgress}
        downloadSpeed={downloadSpeed}
        fileName={downloadFileName}
        onCancel={handleCancelDownload}
      />
      
      <UpdateSuccessToast
        show={showUpdateSuccessToast}
        onClose={() => setShowUpdateSuccessToast(false)}
      />
    </>
  );
};

export default App;
