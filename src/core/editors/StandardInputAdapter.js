import { EditorAdapter } from './EditorAdapter.js';

export class StandardInputAdapter extends EditorAdapter {
  constructor(element) {
    super(element);
    this.element = element;
    this.initialized = true;
  }

  setupButtons(buttonsWrapper) {
    this.element.insertAdjacentElement('afterend', buttonsWrapper);
    buttonsWrapper.style.display = 'none';

    this.element.addEventListener('focus', () => {
      buttonsWrapper.style.display = 'flex';
    });

    this.element.addEventListener('blur', (e) => {
      if (!buttonsWrapper.contains(e.relatedTarget)) {
        buttonsWrapper.style.display = 'none';
      }
    });

    buttonsWrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  getValue() {
    return this.element.value;
  }

  setValue(text) {
    if (!this.element) {
        return;
    }
    
    try {
        this.element.value = text;
        this.element.dispatchEvent(new Event('input', { bubbles: true }));
        this.element.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (error) {
        // Silently fail
    }
  }

  dispatchInputEvent() {
    const event = new Event('input', { bubbles: true });
    this.element.dispatchEvent(event);
  }

  static matches(element) {
    return (element instanceof HTMLInputElement && 
      ['text', 'search', ''].includes(element.type)) ||
      (element instanceof HTMLTextAreaElement && 
       !element.nextElementSibling?.classList.contains('tox-tinymce'));
  }

  getContainer() {
    return this.element;
  }
} 