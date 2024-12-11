import { CryptoManager } from '../utils/crypto.js';
import { ApiKeyValidator } from '../utils/validation.js';
import { ERRORS } from '../utils/constants.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const togglePasswordButton = document.getElementById('togglePassword');
  const saveButton = document.getElementById('saveButton');
  const formGroup = document.querySelector('.form-group');
  const showOnFocusCheckbox = document.getElementById('showOnFocus');

  // Charger la clé API existante et les paramètres
  try {
    const [encryptedKey, { showOnFocus }] = await Promise.all([
      getEncryptedKey(),
      chrome.storage.local.get('showOnFocus')
    ]);

    if (encryptedKey) {
      const apiKeyValue = await chrome.runtime.sendMessage({ 
        action: 'getDecryptedApiKey' 
      });
      if (apiKeyValue) {
        apiKeyInput.value = apiKeyValue;
      }
    }

    showOnFocusCheckbox.checked = showOnFocus !== false;
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres:', error);
  }

  // Gestionnaire pour la checkbox
  showOnFocusCheckbox.addEventListener('change', async () => {
    try {
      await chrome.storage.local.set({ showOnFocus: showOnFocusCheckbox.checked });
      
      // Notifier tous les onglets du changement
      const tabs = await chrome.tabs.query({});
      await Promise.all(tabs.map(tab => 
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateShowOnFocus',
          value: showOnFocusCheckbox.checked
        }).catch(() => {/* Ignorer les erreurs pour les onglets qui n'ont pas le content script */})
      ));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du paramètre:', error);
    }
  });

  // Gestionnaire de sauvegarde
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    try {
      await ApiKeyValidator.validate(apiKey);
      const encrypted = await CryptoManager.encryptApiKey(apiKey);
      await saveEncryptedKey(encrypted);
      
      showStatus("Clé API sauvegardée avec succès", 'success', formGroup);
      setTimeout(removeStatus, 2000);

    } catch (error) {
      showStatus(error.message, 'error', formGroup);
    }
  });

  // Gestionnaire de visibilité du mot de passe
  togglePasswordButton.addEventListener('click', () => {
    togglePasswordVisibility(apiKeyInput, togglePasswordButton);
  });
});

async function saveEncryptedKey(encryptedKey) {
  return chrome.storage.local.set({ encryptedApiKey: encryptedKey });
}

async function getEncryptedKey() {
  const { encryptedApiKey } = await chrome.storage.local.get('encryptedApiKey');
  return encryptedApiKey;
}

function togglePasswordVisibility(inputElement, buttonElement) {
  const isPassword = inputElement.type === 'password';
  inputElement.type = isPassword ? 'text' : 'password';
  
  const showPasswordIcon = buttonElement.querySelector('.show-password');
  const hidePasswordIcon = buttonElement.querySelector('.hide-password');
  
  showPasswordIcon.classList.toggle('hidden');
  hidePasswordIcon.classList.toggle('hidden');
}

function showStatus(message, type, parentElement) {
  // Supprimer tout message de statut existant
  removeStatus();
  
  // Créer le nouvel élément de statut
  const statusElement = document.createElement('div');
  statusElement.className = `status-message ${type}`;
  statusElement.textContent = message;
  
  // Ajouter après le parent
  parentElement.insertAdjacentElement('afterend', statusElement);
}

function removeStatus() {
  const existingStatus = document.querySelector('.status-message');
  if (existingStatus) {
    existingStatus.remove();
  }
} 