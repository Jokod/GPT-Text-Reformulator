import { API, ERRORS } from '../../utils/constants.js';

export async function validateApiKey(apiKey) {
  try {
    const response = await fetch(`${API.OPENAI.BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('API Key validation error:', error);
    return false;
  }
}

export async function reformulateText(apiKey, text, template) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      console.error('Invalid API key type:', typeof apiKey);
      throw new Error(ERRORS.API_KEY.INVALID());
    }

    const systemInstructions = template.system + (template.systemInstructions || '');
    const promptText = template.prompt + text;

    const response = await fetch(`${API.OPENAI.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: API.OPENAI.MODEL,
        messages: [
          { role: 'system', content: systemInstructions },
          { role: 'user', content: promptText }
        ],
        max_tokens: API.OPENAI.MAX_TOKENS,
        temperature: API.OPENAI.TEMPERATURE
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      if (response.status === 401) {
        throw new Error(ERRORS.API_KEY.INVALID());
      }
      if (response.status === 429) {
        throw new Error(ERRORS.RATE_LIMIT());
      }
      throw new Error(errorData.error?.message || ERRORS.UNKNOWN());
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}