import React, { useState, useRef, useEffect } from 'react';
import { FiUser, FiShield, FiDownload, FiUpload, FiTrash2, FiEye, FiEyeOff, FiLock, FiSun, FiMoon, FiChevronDown } from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';
import Header from './Header';
import Footer from './Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getThemeClasses } from '../utils/themeUtils';

interface SettingsProps {
  onClose: () => void;
  onLogout?: () => void;
  onVaultDeleted?: () => void;
}

type SettingsSection = 'main' | 'account' | 'personalization' | 'security';

const Settings: React.FC<SettingsProps> = ({ onClose, onLogout, onVaultDeleted }) => {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'export' | 'delete' | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [masterPasswordError, setMasterPasswordError] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [canDelete, setCanDelete] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [updateSettings, setUpdateSettings] = useState({ autoUpdateEnabled: true, currentVersion: '1.5.0' });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');


  
  const { theme, toggleTheme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const themeClasses = getThemeClasses(theme);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'tr', name: 'Türkçe', flagClass: 'fi fi-tr' },
    { code: 'en', name: 'English', flagClass: 'fi fi-us' },
    { code: 'ru', name: 'Русский', flagClass: 'fi fi-ru' },
    { code: 'de', name: 'Deutsch', flagClass: 'fi fi-de' }
  ];

  const themes = [
    { code: 'dark', name: t('settings.darkTheme'), icon: 'moon' },
    { code: 'light', name: t('settings.lightTheme'), icon: 'sun' }
  ];

  // Dropdown dışına tıklandığında kapat
  // Güncelleme ayarlarını yükle
  useEffect(() => {
    const loadUpdateSettings = async () => {
      try {
        const settings = await window.vaultAPI.getUpdateSettings();
        setUpdateSettings(settings);
      } catch (error) {
        console.error('Güncelleme ayarları yüklenemedi:', error);
      }
    };
    
    loadUpdateSettings();
    
    // Güncelleme event'lerini dinle
    window.vaultAPI.onUpdateAvailable((updateInfo: any) => {
      setUpdateMessage(`Yeni sürüm mevcut: v${updateInfo.latestVersion}`);
      setIsCheckingUpdate(false);
    });
    
    window.vaultAPI.onNoUpdateAvailable((info: any) => {
      setUpdateMessage(`Güncel sürüm kullanıyorsunuz: v${info.currentVersion}`);
      setIsCheckingUpdate(false);
    });
    
    window.vaultAPI.onUpdateCheckError((error: any) => {
      setUpdateMessage(`Güncelleme kontrolü başarısız: ${error.error}`);
      setIsCheckingUpdate(false);
    });
    
    return () => {
      window.vaultAPI.removeUpdateListeners();
    };
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Geri sayım için useEffect
  // Sayaç için useEffect
  useEffect(() => {
    if (isCountingDown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountingDown && countdown === 0) {
      handleDeleteConfirm();
    }
  }, [isCountingDown, countdown]);

  // Dropdown'ları kapatmak için click listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setShowThemeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    setShowThemeDropdown(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return;
    
    setPasswordError('');
    
    if (passwordAction === 'delete') {
      setShowPasswordPrompt(false);
      setShowDeleteConfirm(true);
    } else if (passwordAction === 'export') {
      // Master password doğrulaması
      try {
        const isValid = await window.vaultAPI.verifyPassword(password);
        if (isValid) {
          // Export işlemi
          try {
            const result = await window.vaultAPI.exportVault();
            if (result.success) {
              alert(result.message);
            } else {
              alert(result.message);
            }
          } catch (error) {
            alert('Export işlemi sırasında hata oluştu');
          }
          setShowPasswordPrompt(false);
        } else {
          setPasswordError('Yanlış master password!');
        }
      } catch (error) {
        setPasswordError('Master password doğrulanamadı!');
      }
    }
    
    if (passwordAction !== 'export' || !passwordError) {
      setPassword('');
    }
  };

  const handleMasterPasswordSubmit = async () => {
    try {
      const isValid = await window.vaultAPI.verifyPassword(masterPassword);
      
      if (isValid) {
        setMasterPasswordError('');
        setShowMasterPasswordModal(false);
        setShowFinalConfirm(true);
        setMasterPassword('');
      } else {
        setMasterPasswordError('Yanlış master password!');
      }
    } catch (error) {
      setMasterPasswordError('Master password doğrulanamadı!');
    }
  };

  const handleFinalConfirm = () => {
    setShowFinalConfirm(false);
    setIsCountingDown(true);
    setCountdown(5);
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateMessage('Güncellemeler kontrol ediliyor...');
    
    try {
      await window.vaultAPI.checkForUpdates();
      // Event'ler otomatik olarak dinleniyor, isCheckingUpdate durumu event handler'larda false yapılıyor
    } catch (error) {
      setUpdateMessage('Güncelleme kontrolü başarısız');
      setIsCheckingUpdate(false);
    }
  };
  
  const handleAutoUpdateToggle = async () => {
    try {
      const newEnabled = !updateSettings.autoUpdateEnabled;
      await window.vaultAPI.setAutoUpdate(newEnabled);
      setUpdateSettings(prev => ({ ...prev, autoUpdateEnabled: newEnabled }));
    } catch (error) {
      console.error('Otomatik güncelleme ayarı değiştirilemedi:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      console.log('🚀 Frontend: Veri silme işlemi başlatılıyor...');
      
      const result = await window.vaultAPI.deleteVaultFolder();
      console.log('📨 Frontend: Backend\'den gelen sonuç:', result);
      
      if (result.success) {
        console.log('✅ Frontend: Tüm veriler başarıyla silindi.');
        setIsCountingDown(false);
        onClose();
        if (onVaultDeleted) {
          console.log('🔄 Frontend: Vault silindi, yeni vault oluşturma sayfasına yönlendiriliyor...');
          onVaultDeleted();
        } else if (onLogout) {
          console.log('🔓 Frontend: Logout fonksiyonu çağrılıyor...');
          onLogout();
        } else {
          console.log('🔄 Frontend: Sayfa yeniden yükleniyor...');
          window.location.reload();
        }
      } else {
        console.error('❌ Frontend: Veri silme başarısız:', result.error);
        alert('Veriler silinirken bir hata oluştu: ' + (result.error || 'Bilinmeyen hata'));
        setIsCountingDown(false);
        setCountdown(5);
      }
    } catch (error) {
      console.error('💥 Frontend: Veri silme hatası:', error);
      console.error('📋 Frontend: Hata detayları:', {
        message: error.message,
        stack: error.stack
      });
      alert('Veriler silinirken bir hata oluştu: ' + error.message);
      setIsCountingDown(false);
      setCountdown(5);
    }
  };

  const cancelDelete = () => {
    setIsCountingDown(false);
    setCountdown(5);
  };

  const requestPassword = (action: 'export' | 'delete') => {
    if (action === 'delete') {
      setShowMasterPasswordModal(true);
    } else {
      setPasswordAction(action);
      setShowPasswordPrompt(true);
    }
  };



  const renderMainSettings = () => (
    <div className="space-y-3">
      <button
        onClick={() => setCurrentSection('account')}
        className={`w-full flex items-center justify-between p-3 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg ${themeClasses.hover.bg} transition-colors`}
      >
        <div className="flex items-center">
          <FiUser className={`w-4 h-4 ${themeClasses.text.tertiary} mr-3`} />
          <span className={`${themeClasses.text.primary} text-sm`}>{t('settings.account')}</span>
        </div>
        <span className={`${themeClasses.text.tertiary}`}>›</span>
      </button>

      <button
        onClick={() => setCurrentSection('personalization')}
        className={`w-full flex items-center justify-between p-3 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg ${themeClasses.hover.bg} transition-colors`}
      >
        <div className="flex items-center">
          <FiSun className={`w-4 h-4 ${themeClasses.text.tertiary} mr-3`} />
          <span className={`${themeClasses.text.primary} text-sm`}>{t('settings.personalization')}</span>
        </div>
        <span className={`${themeClasses.text.tertiary}`}>›</span>
      </button>

      <button
        onClick={() => setCurrentSection('security')}
        className={`w-full flex items-center justify-between p-3 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg ${themeClasses.hover.bg} transition-colors`}
      >
        <div className="flex items-center">
          <FiShield className={`w-4 h-4 ${themeClasses.text.tertiary} mr-3`} />
          <span className={`${themeClasses.text.primary} text-sm`}>{t('settings.security')}</span>
        </div>
        <span className={`${themeClasses.text.tertiary}`}>›</span>
      </button>
      
      {/* Güncelleme Ayarları */}
      <div className={`p-4 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiDownload className={`w-4 h-4 ${themeClasses.text.tertiary} mr-3`} />
            <div>
              <span className={`${themeClasses.text.primary} text-sm font-medium`}>Güncellemeler</span>
              <p className={`${themeClasses.text.tertiary} text-xs mt-0.5`}>
                Mevcut sürüm: v{updateSettings.currentVersion}
              </p>
            </div>
          </div>
        </div>
        
        {/* Otomatik Güncelleme Toggle */}
        <div className="flex items-center justify-between">
          <span className={`${themeClasses.text.secondary} text-sm`}>Otomatik güncelleme kontrolü</span>
          <button
            onClick={handleAutoUpdateToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              updateSettings.autoUpdateEnabled ? 'bg-blue-600' : themeClasses.bg.input
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                updateSettings.autoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {/* Manuel Güncelleme Kontrolü */}
        <button
          onClick={handleCheckForUpdates}
          disabled={isCheckingUpdate}
          className={`w-full flex items-center justify-center p-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} text-sm transition-colors hover:${themeClasses.hover.bg} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isCheckingUpdate ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Kontrol ediliyor...
            </>
          ) : (
            'Güncellemeleri Kontrol Et'
          )}
        </button>
        
        {/* Güncelleme Mesajı */}
        {updateMessage && (
          <div className={`p-2 rounded-lg text-sm ${
            updateMessage.includes('mevcut') 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : updateMessage.includes('başarısız') 
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {updateMessage}
          </div>
        )}
      </div>
    </div>
  );

  const renderAccountSettings = () => (
    <div className="space-y-3">
      <button
        onClick={() => {/* Google hesap bağlama */}}
        className={`w-full flex items-center p-3 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg ${themeClasses.hover.bg} transition-colors`}
      >
        <FaGoogle className="w-4 h-4 text-red-500 mr-3" />
        <span className={`${themeClasses.text.primary} text-sm`}>{t('settings.linkGoogleAccount')}</span>
      </button>
    </div>
  );

  const renderPersonalizationSettings = () => (
    <div className="space-y-3">
      {/* Tema Dropdown */}
      <div className={`p-4 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {theme === 'dark' ? (
              <FiMoon className={`w-5 h-5 ${themeClasses.text.tertiary} mr-3`} />
            ) : (
              <FiSun className={`w-5 h-5 ${themeClasses.text.tertiary} mr-3`} />
            )}
            <div>
              <span className={`${themeClasses.text.primary} text-sm font-medium`}>{t('settings.theme')}</span>
              <p className={`${themeClasses.text.tertiary} text-xs mt-0.5`}>
                {themes.find(t => t.code === theme)?.name} {t('settings.active')}
              </p>
            </div>
          </div>
          <div className="relative" ref={themeDropdownRef}>
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className={`flex items-center px-3 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} text-sm transition-colors focus:outline-none focus:ring-2 ${themeClasses.focus.ring}`}
            >
              {theme === 'dark' ? (
                <FiMoon className="w-4 h-4 mr-2" />
              ) : (
                <FiSun className="w-4 h-4 mr-2" />
              )}
              <span className="mr-2">
                {themes.find(t => t.code === theme)?.name}
              </span>
              <FiChevronDown className={`w-3 h-3 transition-transform ${showThemeDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showThemeDropdown && (
              <div className={`absolute right-0 top-full mt-1 w-40 ${themeClasses.bg.modal} ${themeClasses.border.input} rounded-lg shadow-lg z-10`}>
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.code}
                    onClick={() => handleThemeChange(themeOption.code as 'dark' | 'light')}
                    className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${themeClasses.text.primary} ${themeClasses.hover.bg} ${
                      theme === themeOption.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    {themeOption.icon === 'moon' ? (
                      <FiMoon className="w-4 h-4 mr-2" />
                    ) : (
                      <FiSun className="w-4 h-4 mr-2" />
                    )}
                    <span className="flex-1">{themeOption.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dil Dropdown */}
      <div className={`p-4 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {theme === 'dark' ? (
              <FiMoon className={`w-5 h-5 ${themeClasses.text.tertiary} mr-3`} />
            ) : (
              <FiSun className={`w-5 h-5 ${themeClasses.text.tertiary} mr-3`} />
            )}
            <div>
              <span className={`${themeClasses.text.primary} text-sm font-medium`}>{t('settings.language')}</span>
              <p className={`${themeClasses.text.tertiary} text-xs mt-0.5`}>
                {languages.find(lang => lang.code === language)?.name} {t('settings.active')}
              </p>
            </div>
          </div>
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className={`flex items-center px-3 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} text-sm transition-colors focus:outline-none focus:ring-2 ${themeClasses.focus.ring}`}
            >
              <span className={`${languages.find(lang => lang.code === language)?.flagClass} mr-2 text-base`}></span>
              <span className="mr-2">
                {languages.find(lang => lang.code === language)?.name}
              </span>
              <FiChevronDown className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showLanguageDropdown && (
              <div className={`absolute right-0 top-full mt-1 w-44 ${themeClasses.bg.modal} ${themeClasses.border.input} rounded-lg shadow-lg z-10`}>
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => {
                      setLanguage(language.code as 'tr' | 'en' | 'ru' | 'de');
                      setShowLanguageDropdown(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg ${themeClasses.text.primary} ${themeClasses.hover.bg} ${setLanguage === language.code ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                  >
                    <span className={`${language.flagClass} mr-2 text-base`}></span>
                    <span className="flex-1">{language.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );



  const renderSecuritySettings = () => (
    <div className="space-y-3">
      <button
        onClick={() => requestPassword('export')}
        className={`w-full flex items-center p-3 ${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg ${themeClasses.hover.bg} transition-colors`}
      >
        <FiDownload className="w-4 h-4 text-green-500 mr-3" />
        <span className={`${themeClasses.text.primary} text-sm`}>Export Et</span>
      </button>



      <button
        onClick={() => requestPassword('delete')}
        className={`w-full flex items-center p-3 ${theme === 'dark' ? 'bg-red-900/30 border-red-700 hover:bg-red-900/50' : 'bg-red-50 border-red-200 hover:bg-red-100'} border rounded-lg transition-colors`}
      >
        <FiTrash2 className="w-4 h-4 text-red-400 mr-3" />
        <span className="text-red-300 text-sm">{t('settings.deleteAllData')}</span>
      </button>
    </div>
  );

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'account': return t('settings.account');
      case 'personalization': return t('settings.personalization');
      case 'security': return t('settings.security');
      default: return t('settings.title');
    }
  };

  return (
    <>
      <div className={`min-h-screen ${themeClasses.bg.primary} flex flex-col`}>
        <Header 
          title={getSectionTitle()}
          showBackButton={currentSection !== 'main'}
          onBack={currentSection !== 'main' ? () => setCurrentSection('main') : undefined}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 p-4 pt-20">
          {currentSection === 'main' && renderMainSettings()}
          {currentSection === 'account' && renderAccountSettings()}
          {currentSection === 'personalization' && renderPersonalizationSettings()}
          {currentSection === 'security' && renderSecuritySettings()}
        </div>
        
        <Footer />
      </div>

      {/* Password Prompt */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className={`${themeClasses.background.secondary} border ${themeClasses.border.primary} rounded-xl shadow-xl w-full max-w-xs p-4`}>
            <h3 className={`text-lg font-bold ${themeClasses.text.primary} mb-4`}>{t('auth.masterPassword')}</h3>
            <p className={`${themeClasses.text.secondary} text-sm mb-4`}>{t('settings.enterMasterPasswordForSecurity')}</p>
            
            <div className="relative mb-2">
              <FiLock className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.text.muted} w-4 h-4`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} ${themeClasses.background.primary} focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm`}
                placeholder={t('auth.enterMasterPassword')}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeClasses.text.muted} hover:${themeClasses.text.secondary}`}
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-400 text-xs mb-4">{passwordError}</p>
            )}

            <div className="flex space-x-2">
              <button
                onClick={handlePasswordSubmit}
                className={`flex-1 ${themeClasses.button.primary} py-2 px-3 rounded-lg font-medium transition-colors text-sm`}
              >
                {t('common.confirm')}
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPassword('');
                  setPasswordError('');
                  setPasswordAction(null);
                }}
                className={`flex-1 ${themeClasses.button.secondary} py-2 px-3 rounded-lg font-medium transition-colors text-sm`}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Password Modal */}
      {showMasterPasswordModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className={`${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-700' : 'bg-white border-gray-200'} border rounded-xl shadow-xl w-full max-w-xs p-4`}>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              🔒 Master Password
            </h3>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} text-sm mb-4`}>
              Devam etmek için master password'unuzu girin:
            </p>
            
            <div className="mb-4">
              <input
                type="password"
                value={masterPassword}
                onChange={(e) => {
                  setMasterPassword(e.target.value);
                  setMasterPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleMasterPasswordSubmit();
                  }
                }}
                placeholder="Master Password"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
                }`}
                autoFocus
              />
              {masterPasswordError && (
                <p className="text-red-400 text-xs mt-1">{masterPasswordError}</p>
              )}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleMasterPasswordSubmit}
                disabled={!masterPassword.trim()}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                  !masterPassword.trim()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Devam Et
              </button>
              <button
                onClick={() => {
                  setShowMasterPasswordModal(false);
                  setMasterPassword('');
                  setMasterPasswordError('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Confirmation Modal */}
      {showFinalConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className={`${theme === 'dark' ? 'bg-[#0a0a0a] border-red-700' : 'bg-white border-red-300'} border rounded-xl shadow-xl w-full max-w-xs p-4`}>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} mb-4`}>⚠️ Son Uyarı!</h3>
            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm mb-4`}>
              Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz!
            </p>
            <p className={`${theme === 'dark' ? 'text-red-300' : 'text-red-600'} text-sm mb-4 font-medium`}>
              Emin misiniz?
            </p>

            <div className="flex space-x-2">
              <button
                onClick={handleFinalConfirm}
                className="flex-1 py-2 px-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
              >
                Evet, Sil
              </button>
              <button
                onClick={() => setShowFinalConfirm(false)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown Modal */}
      {isCountingDown && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className={`${theme === 'dark' ? 'bg-[#0a0a0a] border-red-700' : 'bg-white border-red-300'} border rounded-xl shadow-xl w-full max-w-xs p-4`}>
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'} mb-4 text-center`}>🔥 Veriler Siliniyor</h3>
            
            <div className="mb-4 text-center">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke={theme === 'dark' ? '#374151' : '#d1d5db'}
                    strokeWidth="6"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="#ef4444"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (countdown / 5)}`}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-red-400">{countdown}</span>
                </div>
              </div>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm mb-2`}>
                {countdown > 0 ? `${countdown} saniye sonra tüm veriler silinecek` : 'Veriler siliniyor...'}
              </p>
            </div>

            <button
              onClick={cancelDelete}
              className={`w-full py-2 px-3 rounded-lg font-medium transition-colors text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Geri Al
            </button>
          </div>
        </div>
      )}

      {/* Old Delete Confirmation - Keep for backward compatibility */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-60">
          <div className="bg-[#0a0a0a] border border-red-700 rounded-xl shadow-xl w-full max-w-xs p-4">
            <h3 className="text-lg font-bold text-red-400 mb-4">⚠️ {t('common.warning')}!</h3>
            <p className="text-gray-300 text-sm mb-4">
              {t('settings.deleteWarning')}
            </p>
            <p className="text-red-300 text-sm mb-4 font-medium">
              {t('settings.areYouSure')}
            </p>

            <div className="flex space-x-2">
              {canDelete ? (
                <>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                  >
                    {t('settings.yesDelete')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`flex-1 ${themeClasses.button.secondary} py-2 px-3 rounded-lg font-medium transition-colors text-sm`}
                  >
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                >
                  Geri Al
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
