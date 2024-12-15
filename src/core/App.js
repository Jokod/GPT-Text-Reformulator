import { STORAGE_KEYS } from '../utils/constants.js';
import { UIManager } from '../ui/UIManager.js';
import { EditorFactory } from './editors/EditorFactory.js';

export class App {
  constructor() {
    this.#initializeState();
    this.#initializeModules();
  }

  #initializeState() {
    this.state = {
      showOnFocus: false,
      inputHistories: new WeakMap(),
      selectedStyle: 'professional'
    };
  }

  #initializeModules() {
    this.modules = {
      constants: {
        TEMPLATES: null,
        ERRORS: null
      },
      classes: {
        TextHistory: null,
        TypeWriter: null,
        UIManager: null,
        Reformulator: null
      }
    };

    this.instances = {
      typeWriter: null,
      reformulator: null
    };
  }

  async initialize() {
    try {
      await this.loadModules();
      await this.loadUserPreferences();
      
      if (this.state.showOnFocus) {
        this.setupInputHandling();
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  async loadModules() {
    const moduleLoaderURL = chrome.runtime.getURL('src/core/moduleLoader.js');
    const { loadModules } = await import(moduleLoaderURL);
    const { constants, classes } = await loadModules();

    // Charger les constantes
    this.modules.constants = constants;
    
    // Charger les classes
    this.modules.classes = classes;

    // Initialiser les instances
    this.instances.typeWriter = new classes.TypeWriter();
    this.instances.reformulator = new classes.Reformulator();
    
    // Configurer le reformulateur
    this.instances.reformulator.init({
      templates: constants.TEMPLATES.reformulation,
      typeWriter: this.instances.typeWriter,
      TextHistory: classes.TextHistory,
      app: this
    });
  }

  async loadUserPreferences() {
    const { 
      [STORAGE_KEYS.SHOW_ON_FOCUS]: showOnFocus, 
      [STORAGE_KEYS.STYLE]: style 
    } = await chrome.storage.local.get([
      STORAGE_KEYS.SHOW_ON_FOCUS, 
      STORAGE_KEYS.STYLE
    ]);
    
    this.state.showOnFocus = showOnFocus ?? false;
    this.state.selectedStyle = style || 'professional';
  }

  setupInputHandling() {
    this.initializeExistingInputs();
    this.observeNewInputs();
  }

  initializeExistingInputs() {
    const selector = this.getInputSelector();
    const inputs = document.querySelectorAll(selector);
    
    inputs.forEach(input => {
      this.modules.classes.UIManager.addReformulateButton(input, this);
    });
  }

  observeNewInputs() {
    const selector = this.getInputSelector();
    new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            node.querySelectorAll(selector)
              .forEach(input => this.modules.classes.UIManager.addReformulateButton(input, this));
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  getInputSelector() {
    return `
      input[type="text"],
      input[type="search"],
      input:not([type]),
      textarea,
      [contenteditable="true"],
      .tox-tinymce textarea,
      .mce-tinymce textarea
    `;
  }

  // Méthodes de gestion de l'historique
  getHistory(editor) {
    return this.state.inputHistories.get(editor.element);
  }

  setHistory(editor, history) {
    this.state.inputHistories.set(editor.element, history);
  }

  hasHistory(editor) {
    return this.state.inputHistories.has(editor.element);
  }

  // Gestionnaires d'événements
  handleFocus(event) {
    const input = event.target;
    const wrapper = input.nextElementSibling;
    
    if (this.state.showOnFocus && wrapper?.classList.contains('gpt-buttons-wrapper')) {
      const reformulator = this.instances.reformulator;
      // Ne pas cacher si une reformulation est en cours
      if (!reformulator.state.isReformulating) {
        wrapper.style.display = 'flex';
      }
    }
  }

  handleBlur(event) {
    const input = event.target;
    const wrapper = input.nextElementSibling;
    
    if (this.state.showOnFocus && wrapper?.classList.contains('gpt-buttons-wrapper')) {
      const reformulator = this.instances.reformulator;
      // Ne pas cacher si une reformulation est en cours
      if (!reformulator.state.isReformulating) {
        wrapper.style.display = 'none';
      }
    }
  }

  updateShowOnFocus(value) {
    this.state.showOnFocus = value;

    if (this.state.showOnFocus) {
      this.initializeExistingInputs();
    } else {
      document.querySelectorAll('.gpt-buttons-wrapper').forEach(wrapper => wrapper.remove());
    }
  }

  get reformulator() {
    return this.instances.reformulator;
  }

  get UIManager() {
    return this.modules.classes.UIManager;
  }

  get inputHistories() {
    return this.state.inputHistories;
  }

  get showOnFocus() {
    return this.state.showOnFocus;
  }

  initializeInputs() {
    const selector = this.getInputSelector();
    document.querySelectorAll(selector).forEach(input => {
      this.modules.classes.UIManager.addReformulateButton(input, this);
      input.addEventListener('focus', (e) => this.handleFocus(e));
    });
  }

  observeDOM() {
    const selector = this.getInputSelector();
    new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            node.querySelectorAll(selector).forEach(input => {
              this.modules.classes.UIManager.addReformulateButton(input, this);
              input.addEventListener('focus', (e) => this.handleFocus(e));
            });
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  get selectedStyle() {
    return this.state.selectedStyle;
  }

  updateStyle(style) {
    this.state.selectedStyle = style;
  }

  async handleHistoryAction(action, element) {
    const editor = await EditorFactory.createAdapter(element);
    if (!editor) {
        return;
    }

    const history = this.getHistory(editor);
    if (!history) {
        return;
    }

    let text;
    switch (action) {
        case 'undo':
            text = history.undo();
            break;
        case 'redo':
            text = history.redo();
            break;
        case 'rollback':
            text = history.getOriginalText();
            history.currentIndex = 0;
            break;
        default:
            return;
    }

    if (text !== null) {
        await editor.setValue(text);
        editor.dispatchInputEvent();
        
        const wrapper = editor.getButtonsWrapper();
        editor.updateHistoryButtons(wrapper, history);
    }
  }
} 