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
    const secureApiKey = await CryptoManager.decryptApiKey(encryptedKey);
    const result = await reformulateText(secureApiKey, text, template);
    return result;
  } catch (error) {
    if (error.message === ERRORS.API_KEY.INVALID()) {
      await chrome.storage.local.remove('encryptedApiKey');
    }
    if (error.message.includes('rate limit')) {
      throw new Error('Limite de requêtes atteinte. Veuillez réessayer plus tard.');
    }
    throw error;
  }
}

// Ajouter une fonction de rotation du chiffrement
async function rotateEncryption() {
  try {
    const encryptedKey = await getEncryptedKey();
    if (encryptedKey) {
      const secureApiKey = await CryptoManager.decryptApiKey(encryptedKey);
      const apiKey = secureApiKey.getValue();
      secureApiKey.destroy();
      
      // Re-chiffrer avec de nouvelles clés
      const newEncrypted = await CryptoManager.encryptApiKey(apiKey);
      await saveEncryptedKey(newEncrypted);
    }
  } catch (error) {
    console.error('Erreur lors de la rotation du chiffrement:', error);
  }
}

// Effectuer la rotation toutes les 24 heures
setInterval(rotateEncryption, 24 * 60 * 60 * 1000);

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
          const secureApiKey = await CryptoManager.decryptApiKey(encryptedKey);
          const apiKeyValue = secureApiKey.getValue();
          secureApiKey.destroy();
          sendResponse(apiKeyValue);
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

// Vérifier l'intégrité du code de l'extension
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Créer une empreinte de l'extension basée sur son ID et sa version
    const manifest = chrome.runtime.getManifest();
    const extensionFingerprint = await CryptoManager.generateChecksum({
      id: chrome.runtime.id,
      version: manifest.version,
      name: manifest.name
    });
    
    // Stocker l'empreinte pour les vérifications futures
    await chrome.storage.local.set({ 
      extensionIntegrity: {
        fingerprint: extensionFingerprint,
        timestamp: Date.now(),
        version: manifest.version
      }
    });

    // Vérifier si c'est une mise à jour
    const previousVersion = await chrome.storage.local.get('lastVersion');
    if (previousVersion.lastVersion !== manifest.version) {
      // Mettre à jour la version stockée
      await chrome.storage.local.set({ lastVersion: manifest.version });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification d\'intégrité:', error);
  }
});

// Ajouter une fonction pour vérifier l'intégrité
async function checkExtensionIntegrity() {
  try {
    const { extensionIntegrity } = await chrome.storage.local.get('extensionIntegrity');
    if (!extensionIntegrity) return false;

    // Vérifier si la version correspond
    const manifest = chrome.runtime.getManifest();
    if (extensionIntegrity.version !== manifest.version) return false;

    // Recalculer l'empreinte
    const currentFingerprint = await CryptoManager.generateChecksum({
      id: chrome.runtime.id,
      version: manifest.version,
      name: manifest.name
    });

    // Comparer avec l'empreinte stockée
    return currentFingerprint === extensionIntegrity.fingerprint;
  } catch (error) {
    console.error('Erreur lors de la vérification d\'intégrité:', error);
    return false;
  }
} 