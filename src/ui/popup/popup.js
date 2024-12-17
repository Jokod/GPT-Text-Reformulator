import { ApiKeyValidator } from '../../utils/validation.js';
import { showStatus, removeStatus, togglePasswordVisibility } from '../ui.js';
import { STORAGE_KEYS } from '../../utils/constants.js';

document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    apiKeyInput: document.getElementById('apiKey'),
    togglePasswordButton: document.getElementById('togglePassword'),
    saveButton: document.getElementById('saveButton'),
    formGroup: document.querySelector('.form-group'),
    showOnFocusCheckbox: document.getElementById('showOnFocus'),
    styleSelect: document.getElementById('styleSelect')
  };

  document.body.classList.add('loading');

  try {
    const [{ showOnFocus, [STORAGE_KEYS.STYLE]: style }, decryptedKey] = await Promise.all([
      chrome.storage.local.get([STORAGE_KEYS.SHOW_ON_FOCUS, STORAGE_KEYS.STYLE]),
      chrome.runtime.sendMessage({ action: 'getDecryptedApiKey' })
    ]);

    elements.showOnFocusCheckbox.checked = showOnFocus ?? false;
    if (style) {
      elements.styleSelect.value = style;
    }

    if (decryptedKey) {
      elements.apiKeyInput.value = decryptedKey;
    }

  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
    showStatus("Erreur lors du chargement des paramètres", 'error', elements.formGroup);
  } finally {
    document.body.classList.remove('loading');
  }

  // Gestionnaire pour la checkbox
  elements.showOnFocusCheckbox.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ 
        [STORAGE_KEYS.SHOW_ON_FOCUS]: elements.showOnFocusCheckbox.checked 
      });
      await notifyAllTabs('updateShowOnFocus', { value: elements.showOnFocusCheckbox.checked });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du paramètre:', error);
    }
  });

  // Gestionnaire de sauvegarde
  elements.saveButton.addEventListener('click', async () => {
    const apiKey = elements.apiKeyInput.value.trim();
    
    try {
      await ApiKeyValidator.validate(apiKey);
      await chrome.runtime.sendMessage({ 
        action: 'encryptApiKey', 
        apiKey: apiKey
      });
      
      showStatus("Clé API sauvegardée avec succès", 'success', elements.formGroup);
      setTimeout(removeStatus, 2000);
    } catch (error) {
      showStatus(error.message, 'error', elements.formGroup);
    }
  });

  // Gestionnaire de visibilité du mot de passe
  elements.togglePasswordButton.addEventListener('click', () => {
    togglePasswordVisibility(elements.apiKeyInput, elements.togglePasswordButton);
  });

  // Gestionnaire pour le select de style
  elements.styleSelect.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ 
        [STORAGE_KEYS.STYLE]: elements.styleSelect.value 
      });
      await notifyAllTabs('updateStyle', { style: elements.styleSelect.value });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du style:', error);
      showStatus("Erreur lors de la mise à jour du style", 'error', elements.styleSelect.parentElement);
    }
  });
});

// Fonction utilitaire pour notifier tous les onglets
async function notifyAllTabs(action, data) {
  const tabs = await chrome.tabs.query({});
  return Promise.all(tabs.map(tab => 
    chrome.tabs.sendMessage(tab.id, {
      action,
      ...data
    }).catch(() => {/* Ignorer les erreurs pour les onglets qui n'ont pas le content script */})
  ));
} 