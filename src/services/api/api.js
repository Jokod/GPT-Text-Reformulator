import { API, ERRORS } from '../../utils/constants.js';
import { ApiError } from '../../utils/errors.js';

export async function callOpenAI(endpoint, options) {
  try {
    const response = await fetch(`${API.BASE_URL}/${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      if (data.error?.message?.includes('rate limit')) {
        throw new ApiError(ERRORS.RATE_LIMIT, 'RATE_LIMIT');
      }
      throw new ApiError(data.error?.message || ERRORS.REFORMULATION, response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(ERRORS.REFORMULATION, 500);
  }
} 