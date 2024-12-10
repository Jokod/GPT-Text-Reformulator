// Validation de la clé API
export function validateApiKeyFormat(apiKey) {
  if (!apiKey) {
    throw new Error('La clé API ne peut pas être vide');
  }

  if (!apiKey.startsWith('sk-')) {
    throw new Error('Format de clé API invalide. Elle doit commencer par "sk-"');
  }

  if (apiKey.length < 40) {
    throw new Error('La clé API semble trop courte');
  }

  return true;
} 