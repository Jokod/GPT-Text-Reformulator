export async function validateApiKey(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  return response.ok;
}

export async function reformulateText(apiKey, text, template) {
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Erreur lors de la reformulation');
  }
  return data.choices[0].message.content;
} 