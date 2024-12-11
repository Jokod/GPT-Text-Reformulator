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

  if (request.action === 'encryptApiKey') {
    CryptoManager.encryptApiKey(request.apiKey)
      .then(async encrypted => {
        await saveEncryptedKey(encrypted);
        sendResponse(encrypted);
      });
    return true;
  }
});

// Créer les éléments du menu contextuel
chrome.runtime.onInstalled.addListener(() => {
  // Menu parent
  chrome.contextMenus.create({
    id: 'gptReformulator',
    title: 'GPT Reformulator',
    contexts: ['editable']
  });

  // Sous-menus
  chrome.contextMenus.create({
    id: 'reformulate',
    parentId: 'gptReformulator',
    title: 'Reformuler',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'undo',
    parentId: 'gptReformulator',
    title: 'Version précédente',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'redo',
    parentId: 'gptReformulator',
    title: 'Version suivante',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'rollback',
    parentId: 'gptReformulator',
    title: 'Revenir au texte original',
    contexts: ['editable']
  });

  chrome.contextMenus.create({
    id: 'config',
    parentId: 'gptReformulator',
    title: 'Configurer',
    contexts: ['editable']
  });

  // Fonction pour créer les menus de style
  async function createStyleMenus() {
    const { 'gpt-reformulation-style': currentStyle } = await chrome.storage.local.get('gpt-reformulation-style');
    
    const styles = [
      { id: 'professional', title: 'Professionnel' },
      { id: 'casual', title: 'Casual' },
      { id: 'formal', title: 'Formel' }
    ];

    styles.forEach(style => {
      chrome.contextMenus.create({
        id: style.id,
        parentId: 'config',
        title: `${(currentStyle || 'professional') === style.id ? '✓ ' : ''}${style.title}`,
        contexts: ['editable']
      });
    });
  }

  createStyleMenus();
});

// Mettre à jour les menus quand le style change
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes['gpt-reformulation-style']) {
    // Recréer les menus de style
    chrome.contextMenus.remove('professional');
    chrome.contextMenus.remove('casual');
    chrome.contextMenus.remove('formal');
    
    const styles = [
      { id: 'professional', title: 'Professionnel' },
      { id: 'casual', title: 'Casual' },
      { id: 'formal', title: 'Formel' }
    ];

    const currentStyle = changes['gpt-reformulation-style'].newValue;
    styles.forEach(style => {
      chrome.contextMenus.create({
        id: style.id,
        parentId: 'config',
        title: `${style.id === currentStyle ? '✓ ' : ''}${style.title}`,
        contexts: ['editable']
      });
    });
  }
});

// Gestionnaire de clic sur le menu contextuel
chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, {
    action: 'contextMenuAction',
    command: info.menuItemId,
    targetElementId: info.targetElementId
  });
}); 