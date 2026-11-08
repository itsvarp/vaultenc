/**
 * Güvenli error handling utilities
 */

export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  ENCRYPTION = 'ENCRYPTION',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

export interface SafeError {
  type: ErrorType;
  message: string;
  code?: string;
  timestamp: string;
}

// Güvenli error mesajları - hassas bilgi içermez
const SAFE_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTHENTICATION]: 'Kimlik doğrulama hatası oluştu',
  [ErrorType.VALIDATION]: 'Girilen bilgiler geçersiz',
  [ErrorType.FILE_SYSTEM]: 'Dosya işlemi başarısız oldu',
  [ErrorType.ENCRYPTION]: 'Şifreleme işlemi başarısız oldu',
  [ErrorType.NETWORK]: 'Ağ bağlantısı hatası',
  [ErrorType.UNKNOWN]: 'Beklenmeyen bir hata oluştu'
};

// Error tipini belirle
export const determineErrorType = (error: unknown): ErrorType => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('password') || message.includes('auth') || message.includes('unlock')) {
      return ErrorType.AUTHENTICATION;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('file') || message.includes('enoent') || message.includes('eacces')) {
      return ErrorType.FILE_SYSTEM;
    }
    
    if (message.includes('encrypt') || message.includes('decrypt') || message.includes('cipher')) {
      return ErrorType.ENCRYPTION;
    }
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
  }
  
  return ErrorType.UNKNOWN;
};

// Güvenli error objesi oluştur
export const createSafeError = (error: unknown, customMessage?: string): SafeError => {
  const errorType = determineErrorType(error);
  
  return {
    type: errorType,
    message: customMessage || SAFE_ERROR_MESSAGES[errorType],
    code: error instanceof Error ? error.name : undefined,
    timestamp: new Date().toISOString()
  };
};

// Error'ı logla (production'da hassas bilgi loglanmaz)
export const logError = (error: unknown, context?: string): void => {
  const safeError = createSafeError(error);
  
  // Development ortamında detaylı log
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      context,
      safeError,
      originalError: error
    });
  } else {
    // Production'da sadece güvenli bilgileri logla
    console.error('Application Error:', {
      context,
      type: safeError.type,
      message: safeError.message,
      timestamp: safeError.timestamp
    });
  }
};

// User-friendly error mesajı al
export const getUserFriendlyMessage = (error: unknown): string => {
  const safeError = createSafeError(error);
  return safeError.message;
};

// Retry mekanizması için error'ın retry edilebilir olup olmadığını kontrol et
export const isRetryableError = (error: unknown): boolean => {
  const errorType = determineErrorType(error);
  
  // Network ve file system hataları retry edilebilir
  return errorType === ErrorType.NETWORK || errorType === ErrorType.FILE_SYSTEM;
};

// Error boundary için error info
export const getErrorBoundaryInfo = (error: Error, errorInfo: any) => {
  return {
    error: createSafeError(error),
    componentStack: errorInfo?.componentStack || 'Unknown component',
    timestamp: new Date().toISOString()
  };
};