import * as crypto from 'crypto';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logError, getUserFriendlyMessage, ErrorType } from './utils/errorHandler';
// import * as argon2 from 'argon2'; // Visual Studio gerektirdiği için PBKDF2 kullanıyoruz

export interface VaultAccount {
  title: string;
  username: string;
  password: string;
  description?: string;
}

export interface VaultData {
  accounts: VaultAccount[];
}

export class VaultManager {
  private vaultPath: string;
  private masterKey: Buffer | null = null;
  private currentSalt: Buffer | null = null;

  constructor() {
    // Belgeler dizininde gizli klasör oluştur
    const documentsPath = path.join(os.homedir(), 'Documents');
    const vaultDir = path.join(documentsPath, '.vaultenc');
    
    this.vaultPath = path.join(vaultDir, 'vault.enc');
    
    // Klasörü async olarak oluştur (yoksa)
    this.ensureVaultDir();
  }

  /**
   * Vault dizininin var olduğundan emin ol
   */
  private async ensureVaultDir(): Promise<void> {
    const vaultDir = path.dirname(this.vaultPath);
    try {
      await fsPromises.access(vaultDir);
    } catch {
      await fsPromises.mkdir(vaultDir, { recursive: true });
    }
  }

  /**
   * Master password'den PBKDF2 ile anahtar türet
   */
  private async deriveKey(masterPassword: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(masterPassword, salt, 600000, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Salt'tan AAD değeri türet
   */
  private deriveAAD(salt: Buffer): Buffer {
    return crypto.createHash('sha256').update(Buffer.concat([Buffer.from('vaultenc-aad'), salt])).digest().slice(0, 16);
  }

  /**
   * Vault dosyasının var olup olmadığını kontrol et
   */
  public async vaultExists(): Promise<boolean> {
    try {
      await fsPromises.access(this.vaultPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Yeni vault oluştur
   */
  public async createVault(masterPassword: string): Promise<void> {
    try {
      await this.ensureVaultDir();
      
      const salt = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      
      // Salt'ı sakla
      this.currentSalt = salt;
      
      // Master key'i türet ve sakla
      this.masterKey = await this.deriveKey(masterPassword, salt);
      
      // Boş veri yapısı
      const vaultData: VaultData = { accounts: [] };
      const jsonData = JSON.stringify(vaultData);
      
      // AES-256-GCM ile şifrele
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      const aad = this.deriveAAD(salt);
      cipher.setAAD(aad);
      
      let encrypted = cipher.update(jsonData, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      // Dosya formatı: [salt(32)] + [iv(16)] + [authTag(16)] + [encrypted_data]
      const fileData = Buffer.concat([salt, iv, authTag, encrypted]);
      
      await fsPromises.writeFile(this.vaultPath, fileData);
    } catch (error) {
      logError(error, 'VaultManager.createVault');
      throw new Error(getUserFriendlyMessage(error));
    }
  }

  /**
   * Vault'u aç (master password ile çöz)
   */
  public async unlockVault(masterPassword: string): Promise<VaultData> {
    try {
      if (!(await this.vaultExists())) {
        throw new Error('Vault dosyası bulunamadı');
      }

      const fileData = await fsPromises.readFile(this.vaultPath);
      
      // Dosya formatını parse et
      const salt = fileData.slice(0, 32);
      const iv = fileData.slice(32, 48);
      const authTag = fileData.slice(48, 64);
      const encryptedData = fileData.slice(64);
      
      // Salt'ı sakla
      this.currentSalt = salt;
      
      // Master key'i türet
      this.masterKey = await this.deriveKey(masterPassword, salt);
      
      try {
        // AES-256-GCM ile çöz
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(authTag);
        const aad = this.deriveAAD(salt);
        decipher.setAAD(aad);
        
        let decrypted = decipher.update(encryptedData, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        
        const vaultData: VaultData = JSON.parse(decrypted);
        return vaultData;
      } catch (error) {
        this.masterKey = null;
        this.currentSalt = null;
        throw new Error('Yanlış master password');
      }
    } catch (error) {
      logError(error, 'VaultManager.unlockVault');
      
      // Özel error mesajları
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error('Vault dosyası bulunamadı');
        }
        if (error.message.includes('Unsupported state or unable to authenticate data')) {
          throw new Error('Yanlış parola veya bozuk vault dosyası');
        }
        if (error.message === 'Yanlış master password' || error.message === 'Vault dosyası bulunamadı') {
          throw error;
        }
      }
      
      throw new Error(getUserFriendlyMessage(error));
    }
  }

  /**
   * Vault'u kaydet (şifreli olarak)
   */
  public async saveVault(vaultData: VaultData): Promise<void> {
    try {
      if (!this.masterKey || !this.currentSalt) {
        throw new Error('Vault kilidi açılmamış');
      }

      await this.ensureVaultDir();
      
      // Orijinal salt'ı kullan, yeni IV oluştur
      const salt = this.currentSalt;
      const iv = crypto.randomBytes(16);
      
      const jsonData = JSON.stringify(vaultData);
      
      // AES-256-GCM ile şifrele
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      const aad = this.deriveAAD(salt);
      cipher.setAAD(aad);
      
      let encrypted = cipher.update(jsonData, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      
      // Dosya formatı: [salt(32)] + [iv(16)] + [authTag(16)] + [encrypted_data]
      const fileData = Buffer.concat([salt, iv, authTag, encrypted]);
      
      await fsPromises.writeFile(this.vaultPath, fileData);
    } catch (error) {
      logError(error, 'VaultManager.saveVault');
      throw new Error(getUserFriendlyMessage(error));
    }
  }

  /**
   * Vault'u kilitle (master key'i temizle)
   */
  public lockVault(): void {
    this.masterKey = null;
    this.currentSalt = null;
  }

  /**
   * Vault'un kilidi açık mı kontrol et
   */
  public isUnlocked(): boolean {
    return this.masterKey !== null;
  }

  /**
   * Vault dosyasının yolunu döndür
   */
  public getVaultPath(): string {
    return this.vaultPath;
  }
}
