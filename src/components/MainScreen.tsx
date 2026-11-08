import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FiPlus, FiTrash2, FiEye, FiEyeOff, FiUser, FiKey, FiTag, FiCopy, FiGlobe, FiChevronDown, FiSearch } from 'react-icons/fi';
import { FaGoogle, FaFacebook, FaGithub, FaGitlab, FaInstagram, FaYandex, FaSnapchat, FaTiktok, FaPinterest, FaLinkedin, FaTwitch } from 'react-icons/fa';
import { RiTwitterXFill } from 'react-icons/ri';
import Header from './Header';
import Settings from './Settings';
import Footer from './Footer';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getThemeClasses } from '../utils/themeUtils';
import { validateAccount, sanitizeString } from '../utils/validation';

interface VaultAccount {
  title: string;
  username: string;
  password: string;
  description?: string;
}

interface MainScreenProps {
  accounts: VaultAccount[];
  onAddAccount: (account: VaultAccount) => Promise<void>;
  onDeleteAccount: (index: number) => Promise<void>;
  onLock: () => Promise<void>;
  onLogout?: () => void;
  onVaultDeleted?: () => void;
}

const MainScreen: React.FC<MainScreenProps> = ({ accounts, onAddAccount, onDeleteAccount, onLock, onLogout, onVaultDeleted }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAccount, setNewAccount] = useState({
    title: '',
    description: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { theme } = useTheme();
  const { t } = useLanguage();
  const themeClasses = getThemeClasses(theme);

  const predefinedServices = [
    { name: 'Gmail', icon: <FaGoogle className="w-4 h-4 text-red-500" /> },
    { name: 'Facebook', icon: <FaFacebook className="w-4 h-4 text-blue-600" /> },
    { name: 'GitHub', icon: <FaGithub className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} /> },
    { name: 'GitLab', icon: <FaGitlab className="w-4 h-4 text-orange-500" /> },
    { name: 'Instagram', icon: <FaInstagram className="w-4 h-4 text-pink-500" /> },
    { name: 'X', icon: <RiTwitterXFill className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} /> },
    { name: 'Yandex', icon: <FaYandex className="w-4 h-4 text-red-500" /> },
    { name: 'Snapchat', icon: <FaSnapchat className="w-4 h-4 text-yellow-400" /> },
    { name: 'TikTok', icon: <FaTiktok className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} /> },
    { name: 'Pinterest', icon: <FaPinterest className="w-4 h-4 text-red-600" /> },
    { name: 'LinkedIn', icon: <FaLinkedin className="w-4 h-4 text-blue-700" /> },
    { name: 'Twitch', icon: <FaTwitch className="w-4 h-4 text-purple-600" /> },
  ];

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTitleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getServiceIcon = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('gmail') || lowerTitle.includes('google')) {
      return <FaGoogle className="w-4 h-4 text-red-500" />;
    } else if (lowerTitle.includes('facebook') || lowerTitle.includes('fb')) {
      return <FaFacebook className="w-4 h-4 text-blue-600" />;
    } else if (lowerTitle.includes('github')) {
      return <FaGithub className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} />;
    } else if (lowerTitle.includes('gitlab')) {
      return <FaGitlab className="w-4 h-4 text-orange-500" />;
    } else if (lowerTitle.includes('instagram')) {
      return <FaInstagram className="w-4 h-4 text-pink-500" />;
    } else if (lowerTitle.includes('twitter') || lowerTitle.includes('x.com') || lowerTitle === 'x' || lowerTitle.startsWith('x ') || lowerTitle.endsWith(' x') || lowerTitle.includes('x ')) {
      return <RiTwitterXFill className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} />;
    } else if (lowerTitle.includes('yandex')) {
      return <FaYandex className="w-4 h-4 text-red-500" />;
    } else if (lowerTitle.includes('snapchat')) {
      return <FaSnapchat className="w-4 h-4 text-yellow-400" />;
    } else if (lowerTitle.includes('tiktok')) {
      return <FaTiktok className={`w-4 h-4 ${theme === 'light' ? 'text-black' : 'text-white'}`} />;
    } else if (lowerTitle.includes('pinterest')) {
      return <FaPinterest className="w-4 h-4 text-red-600" />;
    } else if (lowerTitle.includes('linkedin')) {
      return <FaLinkedin className="w-4 h-4 text-blue-700" />;
    } else if (lowerTitle.includes('twitch')) {
      return <FaTwitch className="w-4 h-4 text-purple-600" />;
    } else {
      return <FiGlobe className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleAddAccount = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input sanitization
    const sanitizedAccount = {
      title: sanitizeString(newAccount.title, 100),
      username: sanitizeString(newAccount.username, 255),
      password: sanitizeString(newAccount.password, 1000),
      description: sanitizeString(newAccount.description || '', 50)
    };
    
    // Validation
    const validation = validateAccount(sanitizedAccount);
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAddAccount(sanitizedAccount);
      setNewAccount({ title: '', description: '', username: '', password: '' });
      setShowAddForm(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('vault.errorAddingAccount'));
    } finally {
      setLoading(false);
    }
  }, [newAccount, onAddAccount, t]);

  const handleDeleteAccount = useCallback(async (index: number) => {
    if (confirm(t('vault.confirmDeleteAccount'))) {
      try {
        await onDeleteAccount(index);
      } catch (error) {
        alert(t('vault.errorDeletingAccount') + ': ' + (error instanceof Error ? error.message : t('common.unknownError')));
      }
    }
  }, [onDeleteAccount, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showTitleDropdown) return;
    
    const filteredServices = predefinedServices.filter(service => 
      service.name.toLowerCase().includes(newAccount.title.toLowerCase())
    );
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedDropdownIndex(prev => 
        prev < filteredServices.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedDropdownIndex(prev => 
        prev > 0 ? prev - 1 : filteredServices.length - 1
      );
    } else if (e.key === 'Enter' && selectedDropdownIndex >= 0) {
      e.preventDefault();
      const selectedService = filteredServices[selectedDropdownIndex];
      if (selectedService) {
        setNewAccount({ ...newAccount, title: selectedService.name });
        setShowTitleDropdown(false);
        setSelectedDropdownIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowTitleDropdown(false);
      setSelectedDropdownIndex(-1);
    }
  };

  const togglePasswordVisibility = useCallback((index: number) => {
    setShowPasswords(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }, []);

  const copyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Notification container oluştur veya mevcut olanı bul
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
      }
      
      // Modern bildirim oluştur
      const notification = document.createElement('div');
      notification.className = `
        flex items-center px-4 py-3 bg-white/90 backdrop-blur-sm border border-green-200 
        rounded-xl shadow-lg transform transition-all duration-300 ease-out
        translate-x-full opacity-0
      `;
      
      notification.innerHTML = `
        <div class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
          <span class="text-sm font-medium text-gray-800">${type} ${t('common.copied')}!</span>
          <svg class="w-4 h-4 ml-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      `;
      
      container.appendChild(notification);
      
      // Animasyon ile göster
      setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
        notification.classList.add('translate-x-0', 'opacity-100');
      }, 10);
      
      // 3 saniye sonra kaldır
      setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
          if (container && notification.parentNode === container) {
            container.removeChild(notification);
            // Container boşsa kaldır
            if (container.children.length === 0) {
              document.body.removeChild(container);
            }
          }
        }, 300);
      }, 3000);
    } catch (error) {
      console.error('Kopyalama hatası:', error);
    }
  }, [t]);

  // Filtreleme fonksiyonu - memoized
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    
    const query = searchQuery.toLowerCase();
    return accounts.filter(account => {
      return account.title.toLowerCase().includes(query) || 
             account.username.toLowerCase().includes(query);
    });
  }, [accounts, searchQuery]);

  if (showSettings) {
    return <Settings onClose={() => setShowSettings(false)} onLogout={onLogout} onVaultDeleted={onVaultDeleted} />;
  }

  return (
    <div className={`min-h-screen ${themeClasses.bg.primary}`}>
      <Header 
        accountCount={accounts.length}
        onAddAccount={() => setShowAddForm(true)}
        onLock={onLock}
        onSettings={() => setShowSettings(true)}
      />

      {/* Search Bar */}
      <div className={`px-4 pt-20 pb-3 ${themeClasses.bg.primary} border-b ${themeClasses.border.primary}`}>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${themeClasses.placeholder} focus:ring-1 ${themeClasses.focus.ring} ${themeClasses.border.focus} outline-none text-sm`}
            placeholder={t('vault.searchAccounts')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${themeClasses.text.tertiary} ${themeClasses.hover.text}`}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <main className="px-4 py-4">
        {/* Add Account Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${themeClasses.bg.modal} ${themeClasses.border.primary} rounded-xl shadow-xl w-full max-w-sm p-4`}>
              <h2 className={`text-lg font-bold ${themeClasses.text.primary} mb-4`}>{t('vault.newAccount')}</h2>
              
              <form onSubmit={handleAddAccount} className="space-y-3">
                <div>
                  <label htmlFor="title" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    {t('vault.title')}
                  </label>
                  <div className="relative" ref={dropdownRef}>
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3">
                      {newAccount.title ? getServiceIcon(newAccount.title) : <FiTag className="text-gray-500 w-3 h-3" />}
                    </div>
                    <input
                      id="title"
                      type="text"
                      value={newAccount.title}
                      onChange={(e) => {
                        setNewAccount({ ...newAccount, title: e.target.value });
                        setSelectedDropdownIndex(-1);
                      }}
                      onFocus={() => setShowTitleDropdown(true)}
                      onKeyDown={handleKeyDown}
                      className={`block w-full pl-9 pr-10 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${themeClasses.placeholder} focus:ring-1 ${themeClasses.focus.ring} ${themeClasses.border.focus} outline-none text-sm`}
                      placeholder={t('vault.titlePlaceholder')}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTitleDropdown(!showTitleDropdown)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                      disabled={loading}
                    >
                      <FiChevronDown className={`w-3 h-3 transition-transform ${showTitleDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showTitleDropdown && (
                      <div className={`absolute z-10 w-full mt-1 ${themeClasses.bg.modal} ${themeClasses.border.input} rounded-lg shadow-lg max-h-48 overflow-y-auto`}>
                        {predefinedServices
                          .filter(service => 
                            service.name.toLowerCase().includes(newAccount.title.toLowerCase())
                          )
                          .map((service, index) => (
                          <button
                            key={service.name}
                            type="button"
                            onClick={() => {
                              setNewAccount({ ...newAccount, title: service.name });
                              setShowTitleDropdown(false);
                              setSelectedDropdownIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center space-x-2 text-sm ${
                              index === selectedDropdownIndex 
                                ? `${themeClasses.bg.secondary} ${themeClasses.text.primary}` 
                                : `${themeClasses.hover.bg} ${themeClasses.text.primary}`
                            }`}
                            disabled={loading}
                          >
                            {service.icon}
                            <span>{service.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    {t('vault.description')}
                  </label>
                  <div className="relative">
                    <input
                      id="description"
                      type="text"
                      value={newAccount.description}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 50) {
                          setNewAccount({ ...newAccount, description: value });
                        }
                      }}
                      className={`block w-full px-3 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${themeClasses.placeholder} focus:ring-1 ${themeClasses.focus.ring} ${themeClasses.border.focus} outline-none text-sm`}
                      placeholder={t('vault.descriptionPlaceholder')}
                      disabled={loading}
                      maxLength={50}
                    />
                    <div className={`text-xs ${themeClasses.text.tertiary} mt-1 text-right`}>
                      {newAccount.description.length}/50
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="username" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    {t('vault.username')}
                  </label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
                    <input
                      id="username"
                      type="text"
                      value={newAccount.username}
                      onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                      className={`block w-full pl-9 pr-3 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${themeClasses.placeholder} focus:ring-1 ${themeClasses.focus.ring} ${themeClasses.border.focus} outline-none text-sm`}
                      placeholder={t('vault.usernamePlaceholder')}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className={`block text-sm font-medium ${themeClasses.text.secondary} mb-1`}>
                    {t('vault.password')}
                  </label>
                  <div className="relative">
                    <FiKey className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
                    <input
                      id="password"
                      type="password"
                      value={newAccount.password}
                      onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                      className={`block w-full pl-9 pr-3 py-2 ${themeClasses.bg.input} ${themeClasses.border.input} rounded-lg ${themeClasses.text.primary} ${themeClasses.placeholder} focus:ring-1 ${themeClasses.focus.ring} ${themeClasses.border.focus} outline-none text-sm`}
                      placeholder={t('vault.passwordPlaceholder')}
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-700 rounded-lg p-2">
                    <p className="text-red-300 text-xs">{error}</p>
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 ${themeClasses.button.primary} py-2 px-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
                  >
                    {loading ? t('common.adding') : t('common.add')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAccount({ title: '', description: '', username: '', password: '' });
                      setShowTitleDropdown(false);
                      setError('');
                    }}
                    disabled={loading}
                    className={`flex-1 ${themeClasses.button.secondary} py-2 px-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm`}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Accounts List */}
        {filteredAccounts.length === 0 && accounts.length > 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiSearch className="w-6 h-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-white mb-1">{t('vault.noResultsFound')}</h3>
            <p className="text-gray-500 mb-4 text-xs">{t('vault.noMatchingAccounts')}</p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-gray-800 text-gray-400 px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
            >
              {t('vault.clearSearch')}
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <FiKey className="w-6 h-6 text-gray-500" />
            </div>
            <h3 className="text-sm font-medium text-white mb-1">{t('vault.noAccountsYet')}</h3>
            <p className="text-gray-500 mb-4 text-xs">{t('vault.addFirstAccount')}</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-flex items-center text-sm"
            >
              <FiPlus className="w-3 h-3 mr-1" />
              {t('vault.addAccount')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAccounts.map((account, index) => {
              // Orijinal index'i bul
              const originalIndex = accounts.findIndex(acc => 
                acc.title === account.title && 
                acc.username === account.username && 
                acc.password === account.password
              );
              return (
              <div key={index} className={`${themeClasses.bg.card} ${themeClasses.border.primary} rounded-lg p-3`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {getServiceIcon(account.title)}
                      <h3 className={`text-sm font-semibold ${themeClasses.text.primary} ml-2`}>{account.title}</h3>
                      {account.description && (
                        <span className={`text-xs ${themeClasses.text.tertiary} italic ml-2`}>
                          - {account.description}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center ${themeClasses.text.tertiary}`}>
                          <FiUser className="w-3 h-3 mr-1" />
                          <span className="text-xs">{t('vault.user')}:</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`text-xs ${themeClasses.text.secondary} mr-1 truncate max-w-[120px]`}>{account.username}</span>
                          <button
                            onClick={() => copyToClipboard(account.username, t('vault.username'))}
                            className={`${themeClasses.text.muted} ${themeClasses.hover.text} p-0.5`}
                            title={t('common.copy')}
                          >
                            <FiCopy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={`flex items-center ${themeClasses.text.tertiary}`}>
                          <FiKey className="w-3 h-3 mr-1" />
                          <span className="text-xs">{t('vault.password')}:</span>
                        </div>
                        <div className="flex items-center">
                          <span className={`text-xs ${themeClasses.text.secondary} mr-1 font-mono max-w-[100px] truncate`}>
                            {showPasswords[originalIndex] ? account.password : '•'.repeat(Math.min(account.password.length, 8))}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(originalIndex)}
                            className={`${themeClasses.text.muted} ${themeClasses.hover.text} p-0.5 mr-0.5`}
                            title={showPasswords[originalIndex] ? t('common.hide') : t('common.show')}
                          >
                            {showPasswords[originalIndex] ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(account.password, t('vault.password'))}
                            className={`${themeClasses.text.muted} ${themeClasses.hover.text} p-0.5`}
                            title={t('common.copy')}
                          >
                            <FiCopy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAccount(originalIndex)}
                    className={`ml-3 ${themeClasses.button.danger} p-1 rounded-lg transition-colors`}
                    title={t('vault.deleteAccount')}
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MainScreen;
