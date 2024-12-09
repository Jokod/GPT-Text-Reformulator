chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reformulateText') {
    reformulateWithGPT(request.text, request.template)
      .then(result => setTimeout(() => sendResponse({ 
        success: true, 
        reformulatedText: result 
      }), 500))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message 
      }));
    return true;
  }
});

async function reformulateWithGPT(text, template) {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (!apiKey) throw new Error('Clé API non configurée');

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