export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export class CryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CryptoError';
  }
} 