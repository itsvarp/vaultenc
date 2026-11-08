import { Theme } from '../contexts/ThemeContext';

export const getThemeClasses = (theme: Theme) => {
  return {
    // Background colors
    background: {
      primary: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      secondary: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
      tertiary: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
      header: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      card: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      input: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      modal: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      loading: theme === 'dark' ? 'bg-gray-100' : 'bg-gray-900'
    },
    
    // Background colors (backward compatibility)
    bg: {
      primary: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      secondary: theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50',
      tertiary: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
      header: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      card: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      input: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      modal: theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#ffffff]',
      loading: theme === 'dark' ? 'bg-gray-100' : 'bg-gray-900'
    },
    
    // Text colors
    text: {
      primary: theme === 'dark' ? 'text-white' : 'text-black',
      secondary: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
      tertiary: theme === 'dark' ? 'text-gray-500' : 'text-gray-500',
      muted: theme === 'dark' ? 'text-gray-600' : 'text-gray-400',
      loading: theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
    },
    
    // Border colors
    border: {
      primary: theme === 'dark' ? 'border-gray-800' : 'border-gray-200',
      secondary: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
      input: theme === 'dark' ? 'border-gray-700' : 'border-gray-300',
      focus: theme === 'dark' ? 'focus:border-white' : 'focus:border-black'
    },
    
    // Button colors
    button: {
      primary: theme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800',
      secondary: theme === 'dark' ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-200 text-gray-600 hover:bg-gray-300',
      danger: theme === 'dark' ? 'text-red-500 hover:text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:text-red-500 hover:bg-red-50'
    },
    
    // Hover effects
    hover: {
      bg: theme === 'dark' ? 'hover:bg-gray-900' : 'hover:bg-gray-100',
      text: theme === 'dark' ? 'hover:text-white' : 'hover:text-black'
    },
    
    // Focus effects
    focus: {
      ring: theme === 'dark' ? 'focus:ring-white' : 'focus:ring-black'
    },
    
    // Placeholder colors
    placeholder: theme === 'dark' ? 'placeholder-gray-500' : 'placeholder-gray-400'
  };
};
