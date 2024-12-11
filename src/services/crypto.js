import { CryptoError } from '../utils/errors.js';
import { ERRORS } from '../utils/constants.js';
import { SecurityChecker } from './security.js';

export class CryptoManager {
  static ALGORITHM = 'AES-GCM';
  static KEY_LENGTH = 256;
  static SALT_LENGTH = 16;
  static IV_LENGTH = 12;
  static MAX_ATTEMPTS = 3;
  static LOCKOUT_DURATION = 60000; // 1 minute

  static #decryptAttempts = 0;
  static #lastAttemptTime = 0;
  static #isLocked = false;

  static async #handleDecryptAttempt() {
    const now = Date.now();
    
    if (this.#isLocked) {
      if (now - this.#lastAttemptTime < this.LOCKOUT_DURATION) {
        throw new CryptoError('Trop de tentatives. Veuillez attendre avant de réessayer.');
      }
      this.#isLocked = false;
      this.#decryptAttempts = 0;
    }

    this.#decryptAttempts++;
    this.#lastAttemptTime = now;

    if (this.#decryptAttempts >= this.MAX_ATTEMPTS) {
      this.#isLocked = true;
      throw new CryptoError('Trop de tentatives. Veuillez attendre avant de réessayer.');
    }
  }

  static async generateEncryptionKey() {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async deriveKey(extensionId) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(extensionId)
    );

    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptApiKey(apiKey) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const masterKey = await this.generateEncryptionKey();
      const derivedKey = await this.deriveKey(chrome.runtime.id);

      const encoder = new TextEncoder();
      const encodedData = encoder.encode(apiKey);
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        masterKey,
        encodedData
      );

      const doubleEncrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        derivedKey,
        new Uint8Array(encryptedData)
      );

      const exportedKey = await crypto.subtle.exportKey('raw', masterKey);

      const integrity = await this.generateChecksum(apiKey);
      
      return {
        encrypted: Array.from(new Uint8Array(doubleEncrypted)),
        iv: Array.from(iv),
        salt: Array.from(salt),
        key: Array.from(new Uint8Array(exportedKey)),
        integrity
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new CryptoError(ERRORS.API_KEY.ENCRYPT_ERROR());
    }
  }

  static async decryptApiKey(encryptedBundle) {
    try {
      // Vérifications de sécurité
      if (SecurityChecker.isDeveloperMode() && !SecurityChecker.isLocalDevelopment()) {
        throw new CryptoError('Mode développeur détecté');
      }

      if (!await SecurityChecker.checkBrowserIntegrity()) {
        throw new CryptoError('Environnement non sécurisé détecté');
      }

      const devToolsDetector = SecurityChecker.detectDevTools();
      if (await devToolsDetector()) {
        throw new CryptoError('Outils de développement détectés');
      }

      await this.#handleDecryptAttempt();

      const {
        encrypted,
        iv,
        key,
        salt,
        integrity
      } = encryptedBundle;

      if (chrome.runtime.id !== await this.#getOriginalExtensionId()) {
        throw new CryptoError('Accès non autorisé');
      }

      const derivedKey = await this.deriveKey(chrome.runtime.id);
      const masterKey = await crypto.subtle.importKey(
        'raw',
        new Uint8Array(key),
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH
        },
        true,
        ['decrypt']
      );

      const firstDecryption = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv)
        },
        derivedKey,
        new Uint8Array(encrypted)
      );

      const finalDecryption = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv)
        },
        masterKey,
        firstDecryption
      );

      this.#decryptAttempts = 0;
      this.#isLocked = false;

      const decryptedKey = new TextDecoder().decode(finalDecryption);
      
      const currentIntegrity = await this.generateChecksum(decryptedKey);
      if (currentIntegrity !== integrity) {
        throw new CryptoError('Intégrité de la clé compromise');
      }

      return new SecureApiKey(decryptedKey);

    } catch (error) {
      console.error('Decryption error:', error);
      throw new CryptoError(ERRORS.API_KEY.DECRYPT_ERROR());
    }
  }

  static async #getOriginalExtensionId() {
    const stored = await chrome.storage.local.get('originalExtensionId');
    if (!stored.originalExtensionId) {
      await chrome.storage.local.set({ originalExtensionId: chrome.runtime.id });
      return chrome.runtime.id;
    }
    return stored.originalExtensionId;
  }

  static async generateChecksum(data) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async verifyChecksum(data, checksum) {
    const calculatedChecksum = await this.generateChecksum(data);
    return calculatedChecksum === checksum;
  }

  static async backupEncryptedKey(encryptedBundle) {
    const backup = {
      data: encryptedBundle,
      timestamp: Date.now(),
      checksum: await this.generateChecksum(encryptedBundle)
    };
    
    await chrome.storage.local.set({ keyBackup: backup });
  }
}

class SecureApiKey {
  #fragments = new Map();
  #timeoutId;
  
  constructor(key) {
    // Ajouter une couche d'obfuscation
    const obfuscated = key.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 0x42)
    ).join('');
    
    // Puis fragmenter
    const fragments = [];
    for(let i = 0; i < obfuscated.length; i += 4) {
      fragments.push(obfuscated.slice(i, i + 4));
    }
    
    // Stocker les fragments de manière non séquentielle
    fragments.forEach((fragment, index) => {
      const randomKey = crypto.getRandomValues(new Uint8Array(8));
      this.#fragments.set(randomKey, {
        value: fragment,
        position: index
      });
    });

    // Auto-destruction après 30 secondes
    this.#startTimeout();
  }

  #startTimeout() {
    this.#timeoutId = setTimeout(() => {
      this.destroy();
    }, 30000);
  }

  getValue() {
    if (this.#fragments.size === 0) {
      throw new CryptoError('La clé API n\'est plus disponible');
    }
    // Reconstituer la clé uniquement au moment de l'utilisation
    const sortedFragments = Array.from(this.#fragments.entries())
      .sort((a, b) => a[1].position - b[1].position)
      .map(([_, data]) => data.value);
    
    const obfuscated = sortedFragments.join('');
    // Dé-obfusquer
    return obfuscated.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 0x42)
    ).join('');
  }

  destroy() {
    // Effacer tous les fragments
    this.#fragments.clear();
    clearTimeout(this.#timeoutId);
  }
} 