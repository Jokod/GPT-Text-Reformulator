import { EditorFactory } from '../core/editors/EditorFactory.js';

export class UIManager {
  static #BUTTON_CONFIGS = {
    undo: {
      title: 'Précédente version (Alt+←)',
      path: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
      defaultDisplay: 'none'
    },
    redo: {
      title: 'Version suivante (Alt+→)',
      path: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
      defaultDisplay: 'none'
    },
    rollback: {
      title: 'Revenir au texte original (Alt+Z)',
      path: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
      defaultDisplay: 'none'
    },
    reformulate: {
      title: 'Reformuler (Alt+R)',
      path: 'M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z',
      defaultDisplay: 'flex'
    },
  };

  static KEYBOARD_SHORTCUTS = {
    'r': 'reformulate',
    'z': 'undo',
    'y': 'redo',
    'o': 'rollback'
  };

  static async addReformulateButton(element, app) {
    if (!await this.#canAddButtons(element)) return;

    const wrapper = this.#createButtonsWrapper();
    const buttons = this.#createButtons();
    
    this.#setupButtonHandlers(buttons, element, app);
    this.#appendButtons(wrapper, buttons);
    
    const adapter = await EditorFactory.createAdapter(element);
    if (adapter) {
      adapter.setupButtons(wrapper);
    }
  }

  static async #canAddButtons(element) {
    return EditorFactory.isSupported(element) && !this.hasExistingWrapper(element);
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

  static #createButton(type, { title, path, defaultDisplay }) {
    const button = document.createElement('button');
    button.className = `gpt-${type}-button`;
    button.setAttribute('type', 'button');
    button.setAttribute('title', title);
    button.style.display = defaultDisplay;
    button.innerHTML = this.#createButtonSVG(path);
    return button;
  }

  static #createButtonSVG(pathD) {
    return `<svg viewBox="0 0 24 24" fill="none"><path d="${pathD}" fill="currentColor"/></svg>`;
  }

  static #appendButtons(wrapper, buttons) {
    wrapper.append(...Object.values(buttons));
  }

  static #setupButtonHandlers(buttons, element, app) {
    buttons.reformulate.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const editor = await EditorFactory.createAdapter(element);
      if (!editor) {
        return;
      }
      
      try {
        await app.reformulator.reformulateText(element, app.inputHistories, app.showOnFocus);
      } catch (error) {
        // Silently fail
      }
    });

    buttons.undo.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await app.handleHistoryAction('undo', element);
    });

    buttons.redo.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await app.handleHistoryAction('redo', element);
    });

    buttons.rollback.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await app.handleHistoryAction('rollback', element);
    });
  }

  static hasExistingWrapper(input) {
    return input.nextElementSibling?.classList.contains('gpt-buttons-wrapper');
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

  static setupEventListeners(input, buttons, app) {
    const buttonActions = this.#createButtonActions(input, app);
    this.#attachButtonListeners(buttons, buttonActions);
    this.#setupKeyboardShortcuts(input, app);
  }

  static #createButtonActions(input, app) {
    return {
      reformulate: () => app.reformulator.reformulateText(input, app.inputHistories, app.showOnFocus),
      undo: () => this.#handleHistoryNavigation(input, 'undo', app),
      redo: () => this.#handleHistoryNavigation(input, 'redo', app),
      rollback: () => this.#handleHistoryNavigation(input, 'rollback', app)
    };
  }

  static #attachButtonListeners(buttons, actions) {
    Object.entries(actions).forEach(([key, action]) => {
      buttons[key].addEventListener('click', this.#wrapAction(action));
    });
  }

  static #setupKeyboardShortcuts(input, app) {
    const actions = this.#createButtonActions(input, app);
    
    input.addEventListener('keydown', (e) => {
      if (e.altKey && this.KEYBOARD_SHORTCUTS[e.key]) {
        e.preventDefault();
        const actionType = this.KEYBOARD_SHORTCUTS[e.key];
        this.#wrapAction(actions[actionType])();
      }
    });
  }

  static #wrapAction(action) {
    return async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      try {
        await action();
      } catch (error) {
        this.#handleError(error);
      }
    };
  }

  static #handleError(error) {
    if (error.message.includes('Extension context invalidated')) {
      window.location.reload();
      return;
    }
    console.error('Erreur:', error);
  }

  static #handleHistoryNavigation(input, action, app) {
    const history = app.inputHistories.get(input);
    if (!history) return;

    const newText = this.#getNewText(action, history);
    if (newText !== null) {
      this.#updateInputValue(input, newText);
      if (app.showOnFocus) {
        this.updateHistoryButtons(input, app.inputHistories);
      }
    }
  }

  static #getNewText(action, history) {
    switch (action) {
      case 'undo': return history.undo();
      case 'redo': return history.redo();
      case 'rollback':
        history.currentIndex = 0;
        return history.getOriginalText();
      default: return null;
    }
  }

  static #updateInputValue(input, newText) {
    input.value = newText;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  static async setStyle(style) {
    await chrome.storage.local.set({ 'gpt-reformulation-style': style });
    this.#updateStyleButtons(style);
  }

  static #updateStyleButtons(style) {
    if (this.showOnFocus) {
      document.querySelectorAll('.gpt-style-button')
        .forEach(button => {
          button.classList.toggle('active', button.dataset.style === style);
        });
    }
  }
} 