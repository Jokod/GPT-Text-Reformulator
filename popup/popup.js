import { CryptoManager } from '../utils/crypto.js';
import { ApiKeyValidator } from '../utils/validation.js';
import { ERRORS } from '../utils/constants.js';

document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const togglePasswordButton = document.getElementById('togglePassword');
  const saveButton = document.getElementById('saveButton');
  const formGroup = document.querySelector('.form-group');

  // Charger la clé API existante
  try {
    const encryptedKey = await getEncryptedKey();
    if (encryptedKey) {
      const apiKeyValue = await chrome.runtime.sendMessage({ 
        action: 'getDecryptedApiKey' 
      });
      if (apiKeyValue) {
        // Afficher directement la valeur de la clé
        apiKeyInput.value = apiKeyValue;
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la clé API:', error);
  }

  // Gestionnaire de sauvegarde
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    try {
      // Validation avec la classe ApiKeyValidator
      await ApiKeyValidator.validate(apiKey);

      // Chiffrement avec la classe CryptoManager
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