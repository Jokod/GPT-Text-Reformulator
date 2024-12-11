export class App {
  constructor() {
    this.TEMPLATES = null;
    this.ERRORS = null;
    this.reformulationTemplates = null;
    this.TextHistory = null;
    this.TypeWriter = null;
    this.UIManager = null;
    this.Reformulator = null;
    this.reformulator = null;
    this.inputHistories = new WeakMap();
    this.showOnFocus = true;
  }

  async initialize() {
    try {
      await this.loadModules();
      const { showOnFocus } = await chrome.storage.local.get('showOnFocus');
      this.showOnFocus = showOnFocus !== false;
      
      if (this.showOnFocus) {
        this.initializeInputs();
        this.observeDOM();
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

    ({ TEMPLATES: this.TEMPLATES, ERRORS: this.ERRORS } = constants);
    this.reformulationTemplates = this.TEMPLATES.reformulation;

    ({ TextHistory: this.TextHistory, 
       TypeWriter: this.TypeWriter, 
       UIManager: this.UIManager, 
       Reformulator: this.Reformulator } = classes);

    this.typeWriter = new this.TypeWriter();
    this.reformulator = new this.Reformulator();
    this.reformulator.init({
      templates: this.reformulationTemplates,
      typeWriter: this.typeWriter,
      TextHistory: this.TextHistory
    });
  }

  initializeInputs() {
    document.querySelectorAll(`
      input[type="text"],
      input[type="search"],
      input:not([type]),
      textarea,
      [contenteditable="true"]
    `).forEach(input => this.UIManager.addReformulateButton(input, this));
  }

  observeDOM() {
    new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            node.querySelectorAll(`
              input[type="text"],
              input[type="search"],
              input:not([type]),
              textarea,
              [contenteditable="true"]
            `).forEach(input => this.UIManager.addReformulateButton(input, this));
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  getHistory(input) {
    return this.inputHistories.get(input);
  }

  setHistory(input, history) {
    this.inputHistories.set(input, history);
  }

  hasHistory(input) {
    return this.inputHistories.has(input);
  }

  handleFocus(event) {
    if (this.showOnFocus) {
      this.UIManager.addReformulateButton(event.target, this);
    }
  }

  updateShowOnFocus(value) {
    this.showOnFocus = value;

    if (this.showOnFocus) {
      document.querySelectorAll(`
        input[type="text"],
        input[type="search"],
        input:not([type]),
        textarea,
        [contenteditable="true"]
      `).forEach(input => this.UIManager.addReformulateButton(input, this));
    } else {
      document.querySelectorAll('.gpt-buttons-wrapper').forEach(wrapper => wrapper.remove());
    }
  }
} 