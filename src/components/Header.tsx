import React from 'react';
import { FiPlus, FiLock, FiKey, FiSettings } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getThemeClasses } from '../utils/themeUtils';

interface HeaderProps {
  accountCount?: number;
  onAddAccount?: () => void;
  onLock?: () => void;
  onSettings?: () => void;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onClose?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  accountCount,
  onAddAccount,
  onLock,
  onSettings,
  title,
  showBackButton,
  onBack,
  onClose
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const themeClasses = getThemeClasses(theme);
  return (
    <header className={`fixed top-0 left-0 right-0 ${themeClasses.bg.header} ${themeClasses.border.primary} border-b z-40`}>
      <div className="px-4">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className={`${themeClasses.text.tertiary} ${themeClasses.hover.text} mr-3 text-2xl font-bold p-2 rounded-lg  transition-colors`}
              >
                ‹
              </button>
            )}
            <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center mr-2">
              <FiKey className="w-3 h-3 text-black" />
            </div>
            <div>
              <h1 className={`text-lg font-bold ${themeClasses.text.primary}`}>{title || 'VaultEnc'}</h1>
              {accountCount !== undefined && (
                <p className={`text-xs ${themeClasses.text.tertiary}`}>{accountCount} {t('common.account')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className={`${themeClasses.text.tertiary} ${themeClasses.hover.text} p-1.5 transition-colors`}
                title={t('common.close')}
              >
                ✕
              </button>
            )}
            {onSettings && (
              <button
                onClick={onSettings}
                className={`${themeClasses.text.primary} ${themeClasses.hover.text} p-1.5 transition-colors flex items-center`}
                title={t('settings.title')}
              >
                <FiSettings className="w-4 h-4" />
              </button>
            )}
            {onAddAccount && (
              <button
                onClick={onAddAccount}
                className={`${themeClasses.button.primary} px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center text-sm`}
              >
                <FiPlus className="w-3 h-3 mr-1" />
                {t('common.add')}
              </button>
            )}
            {onLock && (
              <button
                onClick={onLock}
                className={`${themeClasses.button.secondary} px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center text-sm`}
              >
                <FiLock className="w-3 h-3 mr-1" />
                {t('common.lock')}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
