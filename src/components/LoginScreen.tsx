import React, { useState, useCallback, useMemo } from 'react';
import { FiLock, FiEye, FiEyeOff, FiUpload } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getThemeClasses } from '../utils/themeUtils';
import { validatePassword, sanitizeString } from '../utils/validation';
import Footer from './Footer';

interface LoginScreenProps {
  vaultExists: boolean;
  onUnlock: (masterPassword: string, isNewVault?: boolean) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ vaultExists, onUnlock }) => {
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { theme } = useTheme();
  const { t } = useLanguage();
  const themeClasses = getThemeClasses(theme);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input sanitization
    const sanitizedPassword = sanitizeString(masterPassword, 1000);
    const sanitizedConfirmPassword = sanitizeString(confirmPassword, 1000);
    
    if (!sanitizedPassword.trim()) {
      setError(t('auth.masterPasswordRequired'));
      return;
    }

    if (!vaultExists && sanitizedPassword !== sanitizedConfirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }

    // Yeni vault için güçlü parola kontrolü
    if (!vaultExists) {
      const passwordValidation = validatePassword(sanitizedPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.message);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await onUnlock(sanitizedPassword, !vaultExists);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [masterPassword, confirmPassword, vaultExists, onUnlock, t]);

  const handleImport = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await window.vaultAPI.importVault();
      if (result.success) {
        alert(t('auth.importSuccess'));
        // Import başarılı, sayfayı yenile
        window.location.reload();
      } else {
        alert(result.message || t('auth.importError'));
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : t('auth.importError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const vaultFile = files.find(file => 
      file.name.endsWith('.enc') || file.name.endsWith('.zip')
    );
    
    if (vaultFile) {
      // Dosya yolu ile import işlemi yapılabilir
      // Şimdilik normal import fonksiyonunu çağırıyoruz
      await handleImport();
    } else {
      alert(t('auth.invalidFileType'));
    }
  };

  const handleClose = async () => {
    await window.vaultAPI.closeApp();
  };

  return (
    <div className={`min-h-screen flex flex-col ${themeClasses.background.primary}`}>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className={`w-full max-w-md p-6 ${themeClasses.background.secondary} rounded-lg shadow-lg border ${themeClasses.border.primary}`}>
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className={`text-xl font-bold ${themeClasses.text.primary}`}>VaultEnc</h1>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Master Password */}
          <div>
            <label htmlFor="masterPassword" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
              {t('auth.masterPassword')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className={`h-4 w-4 ${themeClasses.text.muted}`} />
              </div>
              <input
                id="masterPassword"
                type={showPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                className={`block w-full pl-10 pr-10 py-2 border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} ${themeClasses.background.primary} focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm`}
                placeholder={t('auth.enterMasterPassword')}
                disabled={loading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={useCallback(() => setShowPassword(prev => !prev), [])}
                disabled={loading}
              >
                {showPassword ? (
                  <FiEyeOff className={`h-4 w-4 ${themeClasses.text.muted} hover:${themeClasses.text.secondary}`} />
                ) : (
                  <FiEye className={`h-4 w-4 ${themeClasses.text.muted} hover:${themeClasses.text.secondary}`} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (sadece yeni vault için) */}
          {!vaultExists && (
            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className={`h-4 w-4 ${themeClasses.text.muted}`} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-10 pr-10 py-2 border ${themeClasses.border.primary} rounded-lg ${themeClasses.text.primary} ${themeClasses.background.primary} focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-sm`}
                  placeholder={t('auth.enterConfirmPassword')}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={useCallback(() => setShowConfirmPassword(prev => !prev), [])}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className={`h-4 w-4 ${themeClasses.text.muted} hover:${themeClasses.text.secondary}`} />
                  ) : (
                      <FiEye className={`h-4 w-4 ${themeClasses.text.muted} hover:${themeClasses.text.secondary}`} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full ${themeClasses.button.primary} py-2 px-4 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {vaultExists ? t('auth.opening') : t('auth.creating')}
              </div>
            ) : (
              vaultExists ? t('auth.openVault') : t('auth.createVault')
            )}
          </button>

          {/* Import Section - sadece yeni vault için */}
          {!vaultExists && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowImportArea(!showImportArea)}
                disabled={loading}
                className={`w-full ${themeClasses.button.secondary} py-2 px-4 rounded-lg font-medium transition-colors text-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <FiUpload className="mr-2 h-4 w-4" />
                {t('auth.importVault')}
              </button>
              
              {/* Import Area */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showImportArea ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragOver 
                      ? 'border-green-400 bg-green-50' 
                      : `${themeClasses.border.primary} ${themeClasses.background.secondary}`
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <FiUpload className={`mx-auto h-8 w-8 ${themeClasses.text.muted} mb-2`} />
                  <p className={`text-sm ${themeClasses.text.secondary} mb-2`}>
                    {t('auth.dragDropVault')}
                  </p>
                  <p className={`text-xs ${themeClasses.text.muted} mb-3`}>
                    {t('auth.supportedFormats')}: .enc, .zip
                  </p>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={loading}
                    className={`px-4 py-2 ${themeClasses.button.primary} rounded-lg text-sm transition-colors disabled:opacity-50`}
                  >
                    {t('auth.selectFile')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className={`w-full ${themeClasses.button.secondary} py-2 px-4 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {t('common.exit')}
          </button>
        </form>

        {/* Info */}
        {!vaultExists && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <p className="text-yellow-300 text-xs">
              <strong>{t('auth.security')}:</strong> {t('auth.securityWarning')}
            </p>
          </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LoginScreen;
