export async function saveEncryptedKey(encrypted) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ encryptedApiKey: encrypted }, resolve);
  });
}

export async function getEncryptedKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['encryptedApiKey'], (result) => {
      resolve(result.encryptedApiKey);
    });
  });
}