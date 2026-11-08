import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeClasses } from '../utils/themeUtils';

const Footer: React.FC = () => {
  const { theme } = useTheme();
  const themeClasses = getThemeClasses(theme);

  return (
    <footer className={`mt-auto py-2 px-4 border-t ${themeClasses.border.primary} ${themeClasses.bg.primary}`}>
      <div className="text-center">
        <p className={`text-xs ${themeClasses.text.secondary}`}>
          VaultEnc - 5.0.0
        </p>
      </div>
    </footer>
  );
};

export default Footer;
