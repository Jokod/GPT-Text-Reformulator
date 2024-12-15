const appURL = chrome.runtime.getURL('src/core/App.js');

class ContentScript {
  constructor() {
    this.app = null;
  }

  async initialize() {
    try {
      const { App } = await import(appURL);
      this.app = new App();
      await this.app.initialize();
      this.setupMessageListeners();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!this.app && request.action !== 'ping') return;

      const handlers = {
        ping: () => {
          sendResponse({ status: 'ok' });
          return true;
        },
        updateShowOnFocus: () => {
          this.app.updateShowOnFocus(request.value);
          return false;
        },
        contextMenuAction: async () => {
          await this.handleContextMenuAction(request);
          return false;
        },
        updateStyle: () => {
          this.app.updateStyle(request.style);
          return false;
        }
      };

      const handler = handlers[request.action];
      if (handler) {
        return handler();
      }
      return false;
    });
  }

  async handleContextMenuAction(request) {
    const activeElement = document.activeElement;
    if (!activeElement) return;

    try {
      switch (request.command) {
        case 'reformulate':
          await this.handleReformulation(activeElement);
          break;
        case 'undo':
        case 'redo':
        case 'rollback':
          await this.app.handleHistoryAction(request.command, activeElement);
          break;
      }
    } catch (error) {
      console.error('Error handling context menu action:', error);
    }
  }

  async handleReformulation(element) {
    await this.app.reformulator.reformulateText(
      element, 
      this.app.inputHistories, 
      this.app.showOnFocus
    );
  }
}

// Initialiser le script de contenu
const contentScript = new ContentScript();
contentScript.initialize(); 