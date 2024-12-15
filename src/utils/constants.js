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
      prompt: "Reformulez ce texte de manière professionnelle en conservant le sens original : ",
      system: "Vous êtes un expert en communication professionnelle. Votre tâche est de reformuler le texte de manière claire, précise et professionnelle tout en conservant le message d'origine."
    },
    casual: {
      prompt: "Reformulez ce texte de manière décontractée et naturelle : ",
      system: "Vous êtes un expert en communication décontractée. Votre tâche est de reformuler le texte de manière naturelle et accessible tout en conservant le message d'origine."
    },
    formal: {
      prompt: "Reformulez ce texte de manière formelle et soutenue : ",
      system: "Vous êtes un expert en communication formelle. Votre tâche est de reformuler le texte dans un style soutenu et élégant tout en conservant le message d'origine."
    }
  }
};

export const ERRORS = {
  API_KEY: {
    NOT_CONFIGURED: () => "La clé API n'est pas configurée. Veuillez configurer votre clé API dans les paramètres.",
    INVALID: () => "La clé API est invalide. Veuillez vérifier votre clé API.",
    ENCRYPT_ERROR: () => "Erreur lors du chiffrement de la clé API.",
    DECRYPT_ERROR: () => "Erreur lors du déchiffrement de la clé API.",
    FORMAT: () => "Format de clé API invalide. La clé doit commencer par 'sk-'."
  },
  RATE_LIMIT: () => "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
  NETWORK: () => "Erreur de connexion. Veuillez vérifier votre connexion internet.",
  UNKNOWN: () => "Une erreur inattendue s'est produite. Veuillez réessayer."
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