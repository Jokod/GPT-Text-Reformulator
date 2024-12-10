const moduleURLs = {
  constants: chrome.runtime.getURL('utils/constants.js'),
  textHistory: chrome.runtime.getURL('content/TextHistory.js'),
  typeWriter: chrome.runtime.getURL('content/TypeWriter.js'),
  uiManager: chrome.runtime.getURL('content/UIManager.js'),
  reformulator: chrome.runtime.getURL('content/Reformulator.js'),
};

export async function loadModules() {
  try {
    // Importer tous les modules en parallèle
    const [
      constantsModule,
      textHistoryModule,
      typeWriterModule,
      uiManagerModule,
      reformulatorModule,
    ] = await Promise.all([
      import(moduleURLs.constants),
      import(moduleURLs.textHistory),
      import(moduleURLs.typeWriter),
      import(moduleURLs.uiManager),
      import(moduleURLs.reformulator),
    ]);

    return {
      constants: {
        TEMPLATES: constantsModule.TEMPLATES,
        ERRORS: constantsModule.ERRORS
      },
      classes: {
        TextHistory: textHistoryModule.TextHistory,
        TypeWriter: typeWriterModule.TypeWriter,
        UIManager: uiManagerModule.UIManager,
        Reformulator: reformulatorModule.Reformulator,
      }
    };
  } catch (error) {
    console.error('Erreur lors du chargement des modules:', error);
    throw error;
  }
} 