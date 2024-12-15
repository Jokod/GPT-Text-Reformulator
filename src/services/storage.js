import { STORAGE_KEYS } from '../utils/constants.js';

export async function saveEncryptedKey(encryptedKey) {
  return chrome.storage.local.set({ 
    [STORAGE_KEYS.API_KEY]: encryptedKey 
  });
}

export async function getEncryptedKey() {
  const { [STORAGE_KEYS.API_KEY]: encryptedKey } = 
    await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  return encryptedKey;
}