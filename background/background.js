import { CryptoManager } from '../utils/crypto.js';
import { saveEncryptedKey, getEncryptedKey } from '../utils/storage.js';
import { reformulateText } from '../utils/openai.js';

const TEST_MODE = false;

async function handleReformulation(text, template) {
  if (TEST_MODE) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const testCases = [
      { success: false, error: 'Clé API non configurée' },
      { success: false, error: 'Erreur lors de la reformulation' },
      { success: false, error: 'Impossible de récupérer la clé API. Veuillez la reconfigurer.' },
      { success: false, error: 'Limite de requêtes atteinte. Veuillez réessayer plus tard.' },
      { success: true, reformulatedText: 'Ceci est un texte reformulé de test.' }
    ];
    
    return testCases[Math.floor(Math.random() * testCases.length)];
  }

  const encryptedKey = await getEncryptedKey();
  if (!encryptedKey) throw new Error('Clé API non configurée');

  try {
    const apiKey = await CryptoManager.decryptApiKey(encryptedKey);
    return await reformulateText(apiKey, text, template);
  } catch (error) {
    if (error.message.includes('rate limit')) {
      throw new Error('Limite de requêtes atteinte. Veuillez réessayer plus tard.');
    }
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'encryptApiKey') {
    CryptoManager.encryptApiKey(request.apiKey)
      .then(async encrypted => {
        await saveEncryptedKey(encrypted);
        sendResponse(encrypted);
      });
    return true;
  }
  
  if (request.action === 'getDecryptedApiKey') {
    getEncryptedKey()
      .then(async encryptedKey => {
        if (!encryptedKey) {
          sendResponse(null);
          return;
        }
        try {
          const apiKey = await CryptoManager.decryptApiKey(encryptedKey);
          sendResponse(apiKey);
        } catch (error) {
          console.error('Erreur de déchiffrement:', error);
          sendResponse(null);
        }
      });
    return true;
  }
  
  if (request.action === 'reformulateText') {
    handleReformulation(request.text, request.template)
      .then(result => setTimeout(() => sendResponse(
        TEST_MODE ? result : { 
          success: true, 
          reformulatedText: result 
        }
      ), 500))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message 
      }));
    return true;
  }
}); 