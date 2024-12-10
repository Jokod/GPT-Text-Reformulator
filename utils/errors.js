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

export class ExtensionError extends Error {
  constructor(type, message, code = null) {
    super(message);
    this.name = 'ExtensionError';
    this.type = type;
    this.code = code;
  }
}