import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiAlertCircle } from 'react-icons/fi';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getThemeClasses } from '../utils/themeUtils';

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  mandatory: boolean;
}

interface UpdateNotificationProps {
  updateInfo: UpdateInfo | null;
  onClose: () => void;
  onDownload: (url: string) => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onClose,
  onDownload
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const themeClasses = getThemeClasses(theme);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!updateInfo) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(updateInfo.downloadUrl);
    } catch (error) {
      console.error('İndirme hatası:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`${themeClasses.background.secondary} border ${themeClasses.border.primary} rounded-xl shadow-xl w-full max-w-md p-6`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {updateInfo.mandatory ? (
              <FiAlertCircle className="w-6 h-6 text-orange-500 mr-3" />
            ) : (
              <FiDownload className="w-6 h-6 text-blue-500 mr-3" />
            )}
            <h3 className={`text-lg font-bold ${themeClasses.text.primary}`}>
              {updateInfo.mandatory ? 'Zorunlu Güncelleme' : 'Güncelleme Mevcut'}
            </h3>
          </div>
          {!updateInfo.mandatory && (
            <button
              onClick={onClose}
              className={`p-1 rounded-lg ${themeClasses.hover.bg} ${themeClasses.text.tertiary} transition-colors`}
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Version Info */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm ${themeClasses.text.secondary}`}>Mevcut Sürüm:</span>
            <span className={`text-sm font-mono ${themeClasses.text.primary}`}>v{updateInfo.currentVersion}</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm ${themeClasses.text.secondary}`}>Yeni Sürüm:</span>
            <span className={`text-sm font-mono font-bold text-green-600 dark:text-green-400`}>v{updateInfo.latestVersion}</span>
          </div>
        </div>

        {/* Release Notes */}
        {updateInfo.releaseNotes && (
          <div className="mb-4">
            <h4 className={`text-sm font-medium ${themeClasses.text.primary} mb-2`}>Yenilikler:</h4>
            <div className={`p-3 ${themeClasses.bg.input} rounded-lg`}>
              <p className={`text-sm ${themeClasses.text.secondary} leading-relaxed`}>
                {updateInfo.releaseNotes}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!updateInfo.mandatory && (
            <button
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} border rounded-lg ${themeClasses.text.secondary} text-sm transition-colors hover:${themeClasses.hover.bg}`}
            >
              Daha Sonra
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                İndiriliyor...
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4 mr-2" />
                {updateInfo.mandatory ? 'Şimdi Güncelle' : 'İndir'}
              </>
            )}
          </button>
        </div>

        {/* Mandatory Warning */}
        {updateInfo.mandatory && (
          <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
            <p className="text-sm text-orange-800 dark:text-orange-300">
              ⚠️ Bu güncelleme zorunludur. Uygulamayı kullanmaya devam etmek için güncellemeniz gerekir.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateNotification;