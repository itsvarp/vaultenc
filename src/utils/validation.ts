/**
 * Input validation ve sanitization utilities
 */

// HTML karakterlerini escape et
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'\/]/g, (s) => map[s]);
};

// Güçlü parola kontrolü
export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 12) {
    return { isValid: false, message: 'Parola en az 12 karakter olmalıdır' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Parola en az bir küçük harf içermelidir' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Parola en az bir büyük harf içermelidir' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Parola en az bir rakam içermelidir' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Parola en az bir özel karakter içermelidir' };
  }
  
  // Yaygın parolaları kontrol et
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return { isValid: false, message: 'Parola yaygın kullanılan kelimeler içermemelidir' };
  }
  
  return { isValid: true, message: 'Parola güçlü' };
};

// Hesap bilgilerini validate et
export const validateAccount = (account: { title: string; username: string; password: string }): { isValid: boolean; message: string } => {
  // Title validation
  if (!account.title || account.title.trim().length === 0) {
    return { isValid: false, message: 'Başlık boş olamaz' };
  }
  
  if (account.title.length > 100) {
    return { isValid: false, message: 'Başlık 100 karakterden uzun olamaz' };
  }
  
  // Username validation
  if (!account.username || account.username.trim().length === 0) {
    return { isValid: false, message: 'Kullanıcı adı boş olamaz' };
  }
  
  if (account.username.length > 255) {
    return { isValid: false, message: 'Kullanıcı adı 255 karakterden uzun olamaz' };
  }
  
  // Password validation
  if (!account.password || account.password.trim().length === 0) {
    return { isValid: false, message: 'Parola boş olamaz' };
  }
  
  if (account.password.length > 1000) {
    return { isValid: false, message: 'Parola 1000 karakterden uzun olamaz' };
  }
  
  return { isValid: true, message: 'Hesap bilgileri geçerli' };
};

// String'i sanitize et
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  if (!input) return '';
  
  // Tehlikeli karakterleri temizle
  let sanitized = input
    .replace(/[\x00-\x1F\x7F]/g, '') // Kontrol karakterlerini kaldır
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // Unicode BOM karakterlerini kaldır
    .trim();
  
  // Maksimum uzunluğu kontrol et
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// Email formatını kontrol et
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// URL formatını kontrol et
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};