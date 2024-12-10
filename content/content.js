const appURL = chrome.runtime.getURL('content/App.js');

(async () => {
  try {
    const { App } = await import(appURL);
    const app = new App();
    await app.initialize();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
})(); 