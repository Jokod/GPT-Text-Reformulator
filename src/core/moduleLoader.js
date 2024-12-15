const MODULE_TYPES = {
  CONSTANTS: 'constants',
  CORE: 'core',
  UI: 'ui'
};

// Configuration des modules
const MODULE_CONFIG = {
  [MODULE_TYPES.CONSTANTS]: {
    path: 'src/utils/constants.js',
    exports: ['TEMPLATES', 'ERRORS']
  },
  [MODULE_TYPES.CORE]: {
    modules: {
      TextHistory: 'src/core/TextHistory.js',
      TypeWriter: 'src/core/TypeWriter.js',
      Reformulator: 'src/core/Reformulator.js'
    }
  },
  [MODULE_TYPES.UI]: {
    modules: {
      UIManager: 'src/ui/UIManager.js'
    }
  }
};

class ModuleLoader {
  constructor() {
    this.moduleCache = new Map();
  }

  getModuleURL(path) {
    return chrome.runtime.getURL(path);
  }

  async importModule(path) {
    const url = this.getModuleURL(path);
    
    try {
      if (this.moduleCache.has(url)) {
        return this.moduleCache.get(url);
      }
      
      const module = await import(url);
      this.moduleCache.set(url, module);
      return module;
    } catch (error) {
      throw new Error(`Échec du chargement du module ${path}: ${error.message}`);
    }
  }

  async loadConstants() {
    const config = MODULE_CONFIG[MODULE_TYPES.CONSTANTS];
    const module = await this.importModule(config.path);
    
    return config.exports.reduce((acc, exportName) => {
      if (!(exportName in module)) {
        throw new Error(`Export manquant ${exportName} dans ${config.path}`);
      }
      acc[exportName] = module[exportName];
      return acc;
    }, {});
  }

  async loadClasses() {
    const coreModules = MODULE_CONFIG[MODULE_TYPES.CORE].modules;
    const uiModules = MODULE_CONFIG[MODULE_TYPES.UI].modules;
    const allModules = { ...coreModules, ...uiModules };

    const classes = {};
    
    await Promise.all(
      Object.entries(allModules).map(async ([className, path]) => {
        const module = await this.importModule(path);
        if (!(className in module)) {
          throw new Error(`Classe ${className} non trouvée dans ${path}`);
        }
        classes[className] = module[className];
      })
    );

    return classes;
  }

  async loadAll() {
    try {
      const [constants, classes] = await Promise.all([
        this.loadConstants(),
        this.loadClasses()
      ]);

      return { constants, classes };
    } catch (error) {
      console.error('Erreur lors du chargement des modules:', error);
      throw error;
    }
  }
}

// Instance unique du ModuleLoader
const moduleLoader = new ModuleLoader();

export async function loadModules() {
  return moduleLoader.loadAll();
} 