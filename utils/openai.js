export async function validateApiKey(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  return response.ok;
}

export async function reformulateText(secureApiKey, text, template) {
  try {
    const apiKey = secureApiKey.getValue();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `${template}: ${text}`
        }]
      })
    });

    // On détruit seulement l'instance SecureApiKey en mémoire
    secureApiKey.destroy();

    const data = await response.json();
    if (!response.ok) {
      // En cas d'erreur API, on ne veut pas perdre la clé
      if (data.error?.type === 'invalid_api_key') {
        throw new Error(ERRORS.API_KEY.INVALID());
      }
      throw new Error(data.error?.message || 'Erreur lors de la reformulation');
    }
    return data.choices[0].message.content;
  } catch (error) {
    // On détruit toujours l'instance en mémoire, mais pas la clé enregistrée
    secureApiKey.destroy();
    throw error;
  }
}