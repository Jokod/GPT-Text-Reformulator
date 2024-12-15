import { EditorAdapter } from './EditorAdapter.js';

export class ContentEditableAdapter extends EditorAdapter {
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
    return this.element.innerHTML;
  }

  setValue(text) {
    this.element.innerHTML = text;
    this.dispatchInputEvent();
  }

  dispatchInputEvent() {
    const event = new Event('input', { bubbles: true });
    this.element.dispatchEvent(event);
  }

  static matches(element) {
    return element.getAttribute('contenteditable') === 'true';
  }

  getContainer() {
    return this.element;
  }
} 