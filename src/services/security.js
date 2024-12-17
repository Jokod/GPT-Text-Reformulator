export class SecurityChecker {
  static #devToolsOpened = false;

  // Détecter le mode développeur
  static isDeveloperMode() {
    return chrome.runtime.getManifest().update_url === undefined;
  }

  // Vérifier si on est en environnement de développement local
  static isLocalDevelopment() {
    const manifest = chrome.runtime.getManifest();
    return manifest.version_name?.includes('-dev') || false;
  }

  // Vérifier l'intégrité du navigateur
  static async checkBrowserIntegrity() {
    // Si on est en développement local, on skip certaines vérifications
    if (this.isLocalDevelopment()) {
      return true;
    }

    const checks = {
      // Vérifier si le navigateur est Chrome
      isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
      
      // Vérifier la présence de fonctions natives critiques
      hasNativeFunctions: (
        typeof crypto.subtle.encrypt === 'function' &&
        typeof crypto.getRandomValues === 'function' &&
        window.crypto === crypto
      ),

      // Vérifier si l'environnement est sécurisé
      isSecureContext: window.isSecureContext,

      // Vérifier si les API nécessaires sont disponibles
      hasRequiredAPIs: (
        'storage' in chrome &&
        'runtime' in chrome &&
        'Crypto' in window &&
        'TextEncoder' in window
      )
    };

    return Object.values(checks).every(check => check === true);
  }

  // Détecter les outils de débogage
  static detectDevTools() {
    // Si on est en développement local, on autorise les DevTools
    if (this.isLocalDevelopment()) {
      return async () => false;
    }

    const devToolsCheck = {
      // Vérifier la présence de debugger
      async checkDebugger() {
        const start = performance.now();
        debugger;
        return performance.now() - start > 100;
      },

      // Détecter les modifications de la console
      checkConsole() {
        const consoleProps = Object.getOwnPropertyDescriptor(window, 'console');
        return consoleProps && consoleProps.configurable;
      },

      // Vérifier le temps d'exécution (plus lent avec DevTools)
      async checkTiming() {
        const start = performance.now();
        for(let i = 0; i < 1000; i++) {
          crypto.getRandomValues(new Uint8Array(1));
        }
        return performance.now() - start > 100;
      }
    };

    // Écouter les changements de dimensions (ouverture DevTools)
    window.addEventListener('resize', () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      if (widthDiff > 200) {
        this.#devToolsOpened = true;
      }
    });

    return async () => {
      const checks = await Promise.all([
        devToolsCheck.checkDebugger(),
        devToolsCheck.checkConsole(),
        devToolsCheck.checkTiming()
      ]);

      return this.#devToolsOpened || checks.some(check => check);
    };
  }
} 