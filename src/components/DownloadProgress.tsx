import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface DownloadProgressProps {
  isVisible: boolean;
  progress: number;
  downloadSpeed?: string;
  fileName?: string;
  onCancel?: () => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({
  isVisible,
  progress,
  downloadSpeed,
  fileName,
  onCancel
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (!isVisible) return null;

  const progressPercentage = Math.round(progress);

  return (
    <div className={`download-progress-overlay ${theme}`}>
      <div className="download-progress-modal">
        <div className="download-progress-header">
          <h3>{t('update.downloading')}</h3>
          {onCancel && (
            <button 
              className="cancel-button"
              onClick={onCancel}
              title={t('update.cancel')}
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="download-info">
          {fileName && (
            <div className="file-name">
              <span>{t('file')}: {fileName}</span>
            </div>
          )}
          
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progressPercentage}%` }}
              >
                <span className="progress-text">{progressPercentage}%</span>
              </div>
            </div>
          </div>
          
          <div className="download-stats">
            <span className="progress-percentage">{t('update.downloadProgress')}: {progressPercentage}%</span>
            {downloadSpeed && (
              <span className="download-speed">{t('update.downloadSpeed')}: {downloadSpeed}</span>
            )}
          </div>
        </div>
        
        <div className="download-message">
          <p>{t('download_in_progress')}</p>
          <p className="warning-text">{t('do_not_close_app')}</p>
        </div>
      </div>
    </div>
  );
};

export default DownloadProgress;