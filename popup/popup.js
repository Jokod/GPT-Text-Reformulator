document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const togglePasswordButton = document.getElementById('togglePassword');
  const saveButton = document.getElementById('saveButton');
  const formGroup = document.querySelector('.form-group');

  // Charger la clé API existante
  try {
    const encryptedKey = await getEncryptedKey();
    if (encryptedKey) {
      const apiKey = await chrome.runtime.sendMessage({ 
        action: 'getDecryptedApiKey' 
      });
      if (apiKey) {
        apiKeyInput.value = apiKey;
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la clé API:', error);
  }

  // Gestionnaire de sauvegarde
  saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    try {
      // Validation du format
      if (!apiKey) {
        throw new Error(window.ERRORS.API_KEY.EMPTY());
      }
      if (!apiKey.startsWith('sk-')) {
        throw new Error(window.ERRORS.API_KEY.INVALID_FORMAT());
      }
      if (apiKey.length < window.API.MIN_KEY_LENGTH) {
        throw new Error(window.ERRORS.API_KEY.TOO_SHORT());
      }

      // Test de la clé API
      const isValid = await validateApiKey(apiKey);
      if (!isValid) {
        throw new Error(window.ERRORS.API_KEY.INVALID());
      }

      // Chiffrement et sauvegarde
      const encrypted = await chrome.runtime.sendMessage({
        action: 'encryptApiKey',
        apiKey
      });
      
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

async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

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