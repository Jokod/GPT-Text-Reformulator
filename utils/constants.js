export const API = {
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-3.5-turbo',
  MIN_KEY_LENGTH: 40
};

export const ERRORS = {
  API_KEY: {
    EMPTY: () => "La clé API ne peut pas être vide",
    INVALID_FORMAT: () => "Format de clé API invalide. Elle doit commencer par 'sk-'",
    TOO_SHORT: () => "La clé API semble trop courte",
    INVALID: () => "Clé API invalide ou erreur de connexion",
    NOT_CONFIGURED: () => "Clé API non configurée",
    DECRYPT_ERROR: () => "Impossible de récupérer la clé API. Veuillez la reconfigurer.",
    ENCRYPT_ERROR: () => "Erreur lors du chiffrement de la clé API"
  },
  RATE_LIMIT: () => "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
  REFORMULATION: () => "Erreur lors de la reformulation"
};

export const TEST_CASES = [
  { success: false, error: ERRORS.API_KEY.NOT_CONFIGURED() },
  { success: false, error: ERRORS.REFORMULATION() },
  { success: false, error: ERRORS.API_KEY.DECRYPT_ERROR() },
  { success: false, error: ERRORS.RATE_LIMIT() },
  { success: true, reformulatedText: 'Ceci est un texte reformulé de test.' }
];

export const TEMPLATES = {
  reformulation: {
    professional: 'Reformule ce texte de manière professionnelle',
    casual: 'Reformule ce texte de manière plus décontractée',
    formal: 'Reformule ce texte de manière formelle et soutenue',
    custom: text => `Reformule ce texte: ${text}`
  }
}; 