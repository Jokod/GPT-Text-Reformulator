export async function generateKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function getExtensionKey() {
  const extensionId = chrome.runtime.id;
  const encoder = new TextEncoder();
  const data = encoder.encode(extensionId);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

export async function encryptApiKey(apiKey) {
  const masterKey = await generateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedApiKey = new TextEncoder().encode(apiKey);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    encodedApiKey
  );

  const extensionKey = await getExtensionKey();
  const doubleEncrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await crypto.subtle.importKey(
      "raw",
      extensionKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    ),
    new Uint8Array(encrypted)
  );

  const exportedKey = await crypto.subtle.exportKey("raw", masterKey);
  
  return {
    encrypted: Array.from(new Uint8Array(doubleEncrypted)),
    iv: Array.from(iv),
    key: Array.from(new Uint8Array(exportedKey))
  };
}

export async function decryptApiKey(encryptedData, iv) {
  try {
    const extensionKey = await getExtensionKey();
    const firstDecryption = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      await crypto.subtle.importKey(
        "raw",
        extensionKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      ),
      new Uint8Array(encryptedData.encrypted)
    );

    const key = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(encryptedData.key),
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      firstDecryption
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Erreur lors du déchiffrement:', error);
    throw new Error('Impossible de récupérer la clé API. Veuillez la reconfigurer.');
  }
} 