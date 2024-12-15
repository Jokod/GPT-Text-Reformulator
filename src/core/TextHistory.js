import { UI } from '../utils/constants.js';

export class TextHistory {
  constructor(initialText = '') {
    this._history = initialText ? [initialText] : [];
    this._currentIndex = initialText ? 0 : -1;
    this.maxSize = UI.HISTORY.MAX_SIZE;
  }

  // Méthodes publiques principales
  addText(text) {
    if (!this._isValidText(text)) return;
    if (this._isDuplicateEntry(text)) return;

    // Si c'est la première entrée
    if (this._history.length === 0) {
      this._history.push(text);
      this._currentIndex = 0;
      return;
    }

    this._truncateForwardHistory();
    this._addNewEntry(text);
    this._maintainHistorySize();
  }

  // Navigation dans l'historique
  undo() {
    if (!this.canUndo()) return null;
    return this._history[--this._currentIndex];
  }

  redo() {
    if (!this.canRedo()) return null;
    return this._history[++this._currentIndex];
  }

  // Getters d'état
  canUndo() {
    return this._currentIndex > 0;
  }

  canRedo() {
    return this._currentIndex < this._history.length - 1;
  }

  getCurrentText() {
    if (this._currentIndex === -1 || !this._history.length) return '';
    return this._history[this._currentIndex];
  }

  getOriginalText() {
    return this._history[0] || '';
  }

  // Méthodes privées
  _isValidText(text) {
    return typeof text === 'string' && text.trim().length > 0;
  }

  _isDuplicateEntry(text) {
    return this.getCurrentText() === text;
  }

  _truncateForwardHistory() {
    this._history.splice(this._currentIndex + 1);
  }

  _addNewEntry(text) {
    this._history.push(text);
    this._currentIndex = this._history.length - 1;
  }

  _maintainHistorySize() {
    if (this._history.length > this.maxSize) {
      const entriesToKeep = [
        this._history[0],
        ...this._history.slice(-this.maxSize + 1)
      ];
      this._history = entriesToKeep;
      this._currentIndex = Math.min(
        this._currentIndex,
        this._history.length - 1
      );
    }
  }

  // Getters/Setters publics
  get size() {
    return this._history.length;
  }

  get currentIndex() {
    return this._currentIndex;
  }

  set currentIndex(value) {
    if (value >= 0 && value < this._history.length) {
      this._currentIndex = value;
    }
  }

  // Méthodes utilitaires
  clear() {
    const originalText = this.getOriginalText();
    this._history = [originalText];
    this._currentIndex = 0;
  }

  toJSON() {
    return {
      entries: [...this._history],
      currentIndex: this._currentIndex
    };
  }

  static fromJSON(json) {
    const history = new TextHistory();
    history._history = [...json.entries];
    history._currentIndex = json.currentIndex;
    return history;
  }
} 