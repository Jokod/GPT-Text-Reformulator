import { EditorFactory } from '../core/editors/EditorFactory.js';
import { UITranslate } from './UITranslate.js';

export class UIManager {
  static #BUTTON_CONFIGS = {
    undo: {
      titleKey: 'undoButton',
      path: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
      defaultDisplay: 'none'
    },
    redo: {
      titleKey: 'redoButton',
      path: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
      defaultDisplay: 'none'
    },
    rollback: {
      titleKey: 'rollbackButton',
      path: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
      defaultDisplay: 'none'
    },
    reformulate: {
      titleKey: 'reformulateButton',
      path: 'M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z',
      defaultDisplay: 'flex'
    }
  };

  static KEYBOARD_SHORTCUTS = {
    'r': 'reformulate',
    'z': 'undo',
    'y': 'redo',
    'o': 'rollback'
  };

  static async addReformulateButton(input, app) {
    if (!await this.#canAddButtons(input)) return;

    const wrapper = this.#createButtonsWrapper();
    const buttons = this.#createButtons();
    
    this.#setupButtonHandlers(buttons, input, app);
    this.#appendButtons(wrapper, buttons);
    
    const adapter = await EditorFactory.createAdapter(input);
    if (adapter) {
      adapter.setupButtons(wrapper);
    }

    this.#setupInputListeners(input, app);
    this.insertWrapperAfterInput(input, wrapper);
    
    UITranslate.translateButtons(wrapper, app);
  }

  static async #canAddButtons(element) {
    return EditorFactory.isSupported(element) && !this.hasExistingWrapper(element);
  }

  static hasExistingWrapper(input) {
    return input.nextElementSibling?.classList.contains('gpt-buttons-wrapper');
  }

  static #createButtonsWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'gpt-buttons-wrapper';
    wrapper.style.display = 'none';
    return wrapper;
  }

  static #createButtons() {
    return Object.entries(this.#BUTTON_CONFIGS).reduce((buttons, [type, config]) => {
      buttons[type] = this.#createButton(type, config);
      return buttons;
    }, {});
  }

  static #createButton(type, { titleKey, path, defaultDisplay }) {
    const button = document.createElement('button');
    button.className = `gpt-${type}-button`;
    button.setAttribute('type', 'button');
    button.setAttribute('data-tooltip-key', titleKey);
    button.style.display = defaultDisplay;
    button.innerHTML = this.#createButtonSVG(path);
    return button;
  }

  static #createButtonSVG(pathD) {
    return `<svg viewBox="0 0 24 24" fill="none"><path d="${pathD}" fill="currentColor"/></svg>`;
  }

  static #setupInputListeners(input, app) {
    input.addEventListener('focus', (e) => app.handleFocus(e));
    input.addEventListener('blur', (e) => app.handleBlur(e));
  }

  static #setupButtonHandlers(buttons, input, app) {
    const actions = {
      reformulate: async () => await app.reformulator.reformulateText(input, app.inputHistories, app.showOnFocus),
      undo: async () => await app.handleHistoryAction('undo', input),
      redo: async () => await app.handleHistoryAction('redo', input),
      rollback: async () => await app.handleHistoryAction('rollback', input)
    };

    Object.entries(buttons).forEach(([type, button]) => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await actions[type]();
      });
    });
  }

  static insertWrapperAfterInput(input, wrapper) {
    input.parentNode.insertBefore(wrapper, input.nextSibling);
  }

  static updateHistoryButtons(input, inputHistories) {
    const history = inputHistories.get(input);
    if (!history) return;

    const wrapper = input.nextElementSibling;
    if (!this.hasExistingWrapper(input)) return;

    const buttonStates = {
      undo: history.canUndo(),
      redo: history.canRedo(),
      rollback: history.currentIndex > 0
    };

    Object.entries(buttonStates).forEach(([type, shouldShow]) => {
      const button = wrapper.querySelector(`.gpt-${type}-button`);
      button.style.display = shouldShow ? 'flex' : 'none';
    });
  }

  static #appendButtons(wrapper, buttons) {
    wrapper.append(...Object.values(buttons));
  }
} 