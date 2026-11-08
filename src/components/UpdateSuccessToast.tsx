import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface UpdateSuccessToastProps {
  show: boolean;
  onClose: () => void;
}

const UpdateSuccessToast: React.FC<UpdateSuccessToastProps> = ({ show, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // 3 saniye sonra otomatik kapat
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Animasyon süresi
  };

  if (!show) return null;

  return (
    <div className={`update-success-toast ${isVisible ? 'show' : ''} ${theme}`}>
      <div className="toast-content">
        <div className="toast-icon">
          ✓
        </div>
        <div className="toast-message">
          <h4>{t('update.updateSuccess')}</h4>
          <p>Uygulama başarıyla güncellendi ve yeniden başlatıldı.</p>
        </div>
        <button className="toast-close" onClick={handleClose}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default UpdateSuccessToast;