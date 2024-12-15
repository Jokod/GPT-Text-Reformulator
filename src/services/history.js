export class TextHistory {
  constructor(initialText) {
    this.history = [initialText];
    this.currentIndex = 0;
  }

  addText(text) {
    this.history.splice(this.currentIndex + 1);
    this.history.push(text);
    this.currentIndex = this.history.length - 1;
  }

  canUndo() { return this.currentIndex > 0; }
  canRedo() { return this.currentIndex < this.history.length - 1; }
  getCurrentText() { return this.history[this.currentIndex]; }
  getOriginalText() { return this.history[0]; }

  undo() { return this.canUndo() ? this.history[--this.currentIndex] : null; }
  redo() { return this.canRedo() ? this.history[++this.currentIndex] : null; }
} 