import { UI } from '../utils/constants.js';

export class TypeWriter {
  static PUNCTUATION_REGEX = /[.,!?]/;
  static PUNCTUATION_PAUSE = 100;
  static RANDOM_VARIATION = 5;

  constructor(
    baseDelay = UI.ANIMATION.TYPING_DELAY.BASE, 
    minDelay = UI.ANIMATION.TYPING_DELAY.MIN
  ) {
    this.config = {
      baseDelay,
      minDelay
    };
  }

  async typeText(editor, text) {
    if (!this._validateInput(editor, text)) return;

    const state = {
      speedFactor: this._calculateSpeedFactor(text),
      chunks: this._splitTextIntoChunks(text)
    };

    await this._performTyping(editor, state);
  }

  // Méthodes privées pour la validation et les calculs
  _validateInput(editor, text) {
    return (
      editor && 
      typeof text === 'string' && 
      text.length > 0
    );
  }

  _calculateSpeedFactor(text) {
    return Math.max(1, Math.floor(text.length / 100));
  }

  _getTypingDelay(speedFactor) {
    const baseDelay = Math.max(
      this.config.minDelay,
      this.config.baseDelay - speedFactor
    );
    return baseDelay + (Math.random() * TypeWriter.RANDOM_VARIATION);
  }

  _getPunctuationDelay(speedFactor) {
    return Math.max(
      20, 
      TypeWriter.PUNCTUATION_PAUSE - speedFactor * 5
    );
  }

  // Méthodes de traitement du texte
  _splitTextIntoChunks(text) {
    return text.split(new RegExp(`(${TypeWriter.PUNCTUATION_REGEX.source})`))
      .filter(chunk => chunk.length > 0);
  }

  _isPunctuation(chunk) {
    return TypeWriter.PUNCTUATION_REGEX.test(chunk);
  }

  // Méthodes pour l'animation
  async _performTyping(editor, state) {
    editor.setValue('');

    for (const chunk of state.chunks) {
      await this._typeChunk(editor, chunk, state.speedFactor);
      
      if (this._isPunctuation(chunk)) {
        await this._pauseForPunctuation(state.speedFactor);
      }
    }
  }

  async _typeChunk(editor, chunk, speedFactor) {
    let currentText = editor.getValue();
    for (const char of chunk) {
      currentText += char;
      editor.setValue(currentText);
      await this._delay(this._getTypingDelay(speedFactor));
    }
  }

  async _pauseForPunctuation(speedFactor) {
    await this._delay(Math.max(
      20, 
      UI.ANIMATION.PUNCTUATION_PAUSE - speedFactor * 5
    ));
  }

  // Utilitaire pour les délais
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
