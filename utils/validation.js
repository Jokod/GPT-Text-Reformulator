import { ExtensionError } from './errors.js';
import { ERRORS } from './constants.js';

export class ApiKeyValidator {
  static MIN_LENGTH = 40;
  static MAX_LENGTH = 200;
  static KEY_PREFIXES = ['sk-', 'sk-proj-'];

  static async validate(key) {
    try {
      await this.validateFormat(key);

      const isValid = await this.validateWithServer(key);
      if (!isValid) {
        throw new ExtensionError('API_KEY', ERRORS.API_KEY.INVALID());
      }

      return true;
    } catch (error) {
      if (error instanceof ExtensionError) {
        throw error;
      }
      throw new ExtensionError('API_KEY', ERRORS.API_KEY.INVALID());
    }
  }

  static validateFormat(key) {
    if (!key || typeof key !== 'string') {
      throw new ExtensionError('API_KEY', ERRORS.API_KEY.EMPTY());
    }

    key = key.trim();

    const hasValidPrefix = this.KEY_PREFIXES.some(prefix => key.startsWith(prefix));
    if (!hasValidPrefix) {
      throw new ExtensionError('API_KEY', ERRORS.API_KEY.INVALID_FORMAT());
    }

    if (key.length < this.MIN_LENGTH) {
      throw new ExtensionError('API_KEY', ERRORS.API_KEY.TOO_SHORT());
    }

    if (key.length > this.MAX_LENGTH) {
      throw new ExtensionError('API_KEY', ERRORS.API_KEY.INVALID_FORMAT());
    }

    return true;
  }

  static async validateWithServer(key) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        method: 'GET'
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Invalid API key');
      }
      
      return true;
    } catch (error) {
      console.error('API Key validation error:', error);
      return false;
    }
  }
}