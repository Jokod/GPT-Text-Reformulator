import { CryptoError } from './errors.js';
import { ERRORS } from './constants.js';

export class CryptoManager {
  static ALGORITHM = 'AES-GCM';
  static KEY_LENGTH = 256;
  static SALT_LENGTH = 16;
  static IV_LENGTH = 12;

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

      return {
        encrypted: Array.from(new Uint8Array(doubleEncrypted)),
        iv: Array.from(iv),
        salt: Array.from(salt),
        key: Array.from(new Uint8Array(exportedKey))
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new CryptoError(ERRORS.API_KEY.ENCRYPT_ERROR());
    }
  }

  static async decryptApiKey(encryptedBundle) {
    try {
      const {
        encrypted,
        iv,
        key,
        salt
      } = encryptedBundle;

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

      return new TextDecoder().decode(finalDecryption);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new CryptoError(ERRORS.API_KEY.DECRYPT_ERROR());
    }
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
} 