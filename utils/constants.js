window.API = {
  BASE_URL: 'https://api.openai.com/v1',
  MODEL: 'gpt-3.5-turbo',
  MIN_KEY_LENGTH: 40
};

window.ERRORS = {
  API_KEY: {
    EMPTY: () => "La clé API ne peut pas être vide",
    INVALID_FORMAT: () => "Format de clé API invalide. Elle doit commencer par 'sk-'",
    TOO_SHORT: () => "La clé API semble trop courte",
    INVALID: () => "Clé API invalide ou erreur de connexion",
    NOT_CONFIGURED: () => "Clé API non configurée",
    DECRYPT_ERROR: () => "Impossible de récupérer la clé API. Veuillez la reconfigurer."
  },
  RATE_LIMIT: () => "Limite de requêtes atteinte. Veuillez réessayer plus tard.",
  REFORMULATION: () => "Erreur lors de la reformulation"
};

window.TEST_CASES = [
  { success: false, error: window.ERRORS.API_KEY.NOT_CONFIGURED },
  { success: false, error: window.ERRORS.REFORMULATION },
  { success: false, error: window.ERRORS.API_KEY.DECRYPT_ERROR },
  { success: false, error: window.ERRORS.RATE_LIMIT },
  { success: true, reformulatedText: 'Ceci est un texte reformulé de test.' }
]; 