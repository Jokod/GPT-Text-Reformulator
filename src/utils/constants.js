export const SECURITY = {
  KEY_ROTATION_INTERVAL: 1000 * 60 * 60 * 24, // 24 heures
  ENCRYPTION_ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  SALT_LENGTH: 16,
  IV_LENGTH: 12
};

export const API = {
  OPENAI: {
    BASE_URL: 'https://api.openai.com/v1',
    MODEL: 'gpt-3.5-turbo',
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.7
  }
};

export const TEMPLATES = {
  reformulation: {
    professional: {
      system: () => chrome.i18n.getMessage('professionalSystem'),
      prompt: () => chrome.i18n.getMessage('professionalPrompt')
    },
    casual: {
      system: () => chrome.i18n.getMessage('casualSystem'),
      prompt: () => chrome.i18n.getMessage('casualPrompt')
    },
    formal: {
      system: () => chrome.i18n.getMessage('formalSystem'),
      prompt: () => chrome.i18n.getMessage('formalPrompt')
    }
  }
};

export const ERRORS = {
  API_KEY: {
    NOT_CONFIGURED: () => chrome.i18n.getMessage('errorApiKeyNotConfigured'),
    INVALID: () => chrome.i18n.getMessage('errorApiKeyInvalid'),
    ENCRYPT_ERROR: () => chrome.i18n.getMessage('errorApiKeyEncryption'),
    DECRYPT_ERROR: () => chrome.i18n.getMessage('errorApiKeyDecryption'),
    FORMAT: () => chrome.i18n.getMessage('errorApiKeyFormat')
  },
  RATE_LIMIT: () => chrome.i18n.getMessage('errorRateLimit'),
  NETWORK: () => chrome.i18n.getMessage('errorNetwork'),
  UNKNOWN: () => chrome.i18n.getMessage('errorUnknown')
};

export const UI = {
  ANIMATION: {
    TYPING_DELAY: {
      BASE: 15,
      MIN: 2
    },
    PUNCTUATION_PAUSE: 100
  },
  HISTORY: {
    MAX_SIZE: 50
  }
};

export const STORAGE_KEYS = {
  API_KEY: 'encryptedApiKey',
  SHOW_ON_FOCUS: 'showOnFocus',
  STYLE: 'gpt-reformulation-style'
}; 