const appURL = chrome.runtime.getURL('content/App.js');
let app = null;

async function initializeApp() {
  try {
    const { App } = await import(appURL);
    app = new App();
    await app.initialize();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Écouter les messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!app && request.action !== 'ping') return;

  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return;
  }

  if (request.action === 'updateShowOnFocus') {
    app.updateShowOnFocus(request.value);
  }
  
  // Gérer les actions du menu contextuel de manière asynchrone
  if (request.action === 'contextMenuAction') {
    (async () => {
      const activeElement = document.activeElement;
      if (!activeElement) return;

      switch (request.command) {
        case 'reformulate':
          await app.reformulator.reformulateText(activeElement, app.inputHistories, app.showOnFocus);
          break;
        case 'undo':
        case 'redo':
        case 'rollback':
          app.UIManager.handleHistoryNavigation(activeElement, request.command, app);
          break;
        case 'professional':
        case 'casual':
        case 'formal':
          await app.UIManager.setStyle(request.command);
          await app.reformulator.reformulateText(activeElement, app.inputHistories, app.showOnFocus);
          break;
      }
    })().catch(console.error);
  }
});

initializeApp(); 