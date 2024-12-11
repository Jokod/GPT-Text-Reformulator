const moduleURLs = {
  constants: chrome.runtime.getURL('src/utils/constants.js'),
  textHistory: chrome.runtime.getURL('src/core/TextHistory.js'),
  typeWriter: chrome.runtime.getURL('src/core/TypeWriter.js'),
  uiManager: chrome.runtime.getURL('src/ui/UIManager.js'),
  reformulator: chrome.runtime.getURL('src/core/Reformulator.js'),
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
    console.error(`Erreur lors du chargement du module ${modulePath}:`, error);
    throw error;
  }
} 