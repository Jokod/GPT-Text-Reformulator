import { CryptoManager } from '../services/crypto.js';
import { saveEncryptedKey, getEncryptedKey } from '../services/storage.js';
import { reformulateText } from '../services/api/openai.js';
import { ERRORS, SECURITY } from '../utils/constants.js';
import { I18nService } from '../core/i18n.js';
import { UITranslate } from '../ui/UITranslate.js';

// Initialiser i18n au démarrage
let i18nInitialized = false;

async function initializeI18n() {
  if (!i18nInitialized) {
    await I18nService.init();
    i18nInitialized = true;
  }
}

const MENU_IDS = {
  PARENT: 'gptReformulator',
  REFORMULATE: 'reformulate',
  UNDO: 'undo',
  REDO: 'redo',
  ROLLBACK: 'rollback'
};

const MENU_ITEMS = [
  { id: MENU_IDS.REFORMULATE, titleKey: 'reformulateButton' },
  { id: MENU_IDS.UNDO, titleKey: 'undoButton' },
  { id: MENU_IDS.REDO, titleKey: 'redoButton' },
  { id: MENU_IDS.ROLLBACK, titleKey: 'rollbackButton' }
];

async function handleReformulation(text, template) {
  await initializeI18n();
  
  // Récupérer le style depuis le template ou utiliser professional par défaut
  const style = template?.style || 'professional';
  
  // Attendre que la locale soit chargée et obtenir les messages traduits
  const i18n = I18nService.getInstance();
  await i18n.loadTranslations(i18n.getCurrentLocale());
  
  const selectedTemplate = {
    system: i18n.t(`${style}System`),
    prompt: i18n.t(`${style}Prompt`)
  };
  
  const encryptedKey = await getEncryptedKey();
  if (!encryptedKey) {
    throw new Error(ERRORS.API_KEY.NOT_CONFIGURED());
  }

  try {
    const decryptedKey = await CryptoManager.decryptApiKey(encryptedKey);
    const apiKey = decryptedKey.getValue();
    const result = await reformulateText(apiKey, text, selectedTemplate);
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

async function setupContextMenus() {
  // Supprimer tous les menus existants d'abord
  await chrome.contextMenus.removeAll();
  
  const translations = await UITranslate.translateContextMenus();

  chrome.contextMenus.create({
    id: MENU_IDS.PARENT,
    title: translations.appName,
    contexts: ['editable']
  });

  Object.entries(translations.menuItems).forEach(([id, title]) => {
    chrome.contextMenus.create({
      id: MENU_IDS[id.toUpperCase()],
      title: title,
      parentId: MENU_IDS.PARENT,
      contexts: ['editable']
    });
  });
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
  },

  async updateLocale(request) {
    const { locale } = request;
    await I18nService.init();
    await I18nService.instance.setLocale(locale);
    await setupContextMenus();
    
    // Notifier tous les onglets du changement de langue
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(tab => 
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateLocale',
        locale
      }).catch(() => {/* Ignorer les erreurs */})
    ));
    
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

function handleContextMenuClick(info, tab) {
  chrome.tabs.sendMessage(tab.id, {
    action: 'contextMenuAction',
    command: info.menuItemId,
    targetElementId: info.targetElementId
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await initializeI18n();
  await setupContextMenus();
});
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

setInterval(rotateEncryption, SECURITY.KEY_ROTATION_INTERVAL);