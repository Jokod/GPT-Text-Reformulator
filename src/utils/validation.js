import { ERRORS } from './constants.js';
import { validateApiKey } from '../services/api/openai.js';

export class ApiKeyValidator {
  static async validate(apiKey) {
    if (!apiKey) {
      throw new Error(ERRORS.API_KEY.NOT_CONFIGURED());
    }

    if (!apiKey.startsWith('sk-')) {
      throw new Error(ERRORS.API_KEY.FORMAT());
    }

    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      throw new Error(ERRORS.API_KEY.INVALID());
    }
  }
}