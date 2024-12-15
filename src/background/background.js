import { CryptoManager } from '../services/crypto.js';
import { saveEncryptedKey, getEncryptedKey } from '../services/storage.js';
import { reformulateText } from '../services/api/openai.js';
import { ERRORS, SECURITY } from '../utils/constants.js';

const MENU_IDS = {
  PARENT: 'gptReformulator',
  REFORMULATE: 'reformulate',
  UNDO: 'undo',
  REDO: 'redo',
  ROLLBACK: 'rollback'
};

const MENU_ITEMS = [
  { id: MENU_IDS.REFORMULATE, title: 'Reformuler' },
  { id: MENU_IDS.UNDO, title: 'Version précédente' },
  { id: MENU_IDS.REDO, title: 'Version suivante' },
  { id: MENU_IDS.ROLLBACK, title: 'Revenir au texte original' }
];

async function handleReformulation(text, template) {
  const encryptedKey = await getEncryptedKey();
  if (!encryptedKey) {
    throw new Error(ERRORS.API_KEY.NOT_CONFIGURED());
  }

  try {
    const decryptedKey = await CryptoManager.decryptApiKey(encryptedKey);
    const apiKey = decryptedKey.getValue();
    const result = await reformulateText(apiKey, text, template);
    return { success: true, reformulatedText: result };
  } catch (error) {
    handleReformulationError(error);
    throw error;
  }
}

function handleReformulationError(error) {
  if (error.message.includes('401')) {
    chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
    throw new Error(ERRORS.API_KEY.INVALID());
  }
  if (error.message.includes('429')) {
    throw new Error(ERRORS.RATE_LIMIT());
  }
  throw error;
}

async function rotateEncryption() {
  let secureApiKey;
  try {
    const encryptedKey = await getEncryptedKey();
    if (!encryptedKey) return;

    secureApiKey = await CryptoManager.decryptApiKey(encryptedKey);
    const apiKey = secureApiKey.getValue();
    
    const newEncrypted = await CryptoManager.encryptApiKey(apiKey);
    await saveEncryptedKey(newEncrypted);
  } catch (error) {
    console.error(ERRORS.API_KEY.ENCRYPT_ERROR(), error);
  } finally {
    secureApiKey?.destroy();
  }
}

const messageHandlers = {
  async reformulateText(request) {
    const result = await handleReformulation(request.text, request.template);
    return result;
  },

  async getDecryptedApiKey() {
    const encryptedKey = await getEncryptedKey();
    if (!encryptedKey) return null;

    let secureApiKey;
    try {
      secureApiKey = await CryptoManager.decryptApiKey(encryptedKey);
      const apiKey = secureApiKey.getValue();
      return apiKey;
    } catch (error) {
      console.error('Erreur de déchiffrement:', error);
      return null;
    } finally {
      secureApiKey?.destroy();
    }
  },

  async encryptApiKey(request) {
    const encrypted = await CryptoManager.encryptApiKey(request.apiKey);
    await saveEncryptedKey(encrypted);
    return { success: true };
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handler = messageHandlers[request.action];
  if (!handler) return false;

  handler(request)
    .then(result => setTimeout(() => sendResponse(result), 500))
    .catch(error => sendResponse({ 
      success: false, 
      error: error.message 
    }));
  return true;
});

function setupContextMenus() {
  chrome.contextMenus.create({
    id: MENU_IDS.PARENT,
    title: 'GPT Reformulator',
    contexts: ['editable']
  });

  MENU_ITEMS.forEach(item => {
    chrome.contextMenus.create({
      ...item,
      parentId: MENU_IDS.PARENT,
      contexts: ['editable']
    });
  });
}

function handleContextMenuClick(info, tab) {
  chrome.tabs.sendMessage(tab.id, {
    action: 'contextMenuAction',
    command: info.menuItemId,
    targetElementId: info.targetElementId
  });
}

chrome.runtime.onInstalled.addListener(setupContextMenus);
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

setInterval(rotateEncryption, SECURITY.KEY_ROTATION_INTERVAL);