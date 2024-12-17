export class I18nService {
  static instance = null;

  constructor() {
    if (I18nService.instance) {
      return I18nService.instance;
    }
    I18nService.instance = this;
    
    this.supportedLocales = ['en', 'fr'];
    this.translations = new Map();
    this.currentLocale = null;
  }

  static getInstance() {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  static async init() {
    const instance = this.getInstance();
    await instance.initialize();
    return instance;
  }

  async initialize() {
    const { currentLocale } = await chrome.storage.local.get('currentLocale');
    await this.setLocale(currentLocale || chrome.i18n.getUILanguage().split('-')[0]);
  }

  // Méthode modifiée pour charger dynamiquement les traductions
  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      locale = 'en'; // Fallback to English
    }
    
    if (!this.translations.has(locale)) {
      await this.loadTranslations(locale);
    }
    
    this.currentLocale = locale;
    await chrome.storage.local.set({ currentLocale: locale });
    
    return true;
  }

  // Méthode pour obtenir une traduction
  t(key, substitutions = null) {
    const translation = this.translations.get(this.currentLocale)?.[key] 
      || chrome.i18n.getMessage(key);
      
    if (!translation) {
      console.warn(`Clé de traduction manquante: ${key}`);
      return key;
    }
    
    if (!substitutions) return translation;
    
    return Object.entries(substitutions).reduce(
      (msg, [key, value]) => msg.replace(`$${key}$`, value),
      translation
    );
  }

  // Obtenir la locale actuelle
  getCurrentLocale() {
    return this.currentLocale;
  }

  // Charger les traductions pour une locale
  async loadTranslations(locale) {
    if (!this.translations.has(locale)) {
      try {
        const response = await fetch(
          chrome.runtime.getURL(`_locales/${locale}/messages.json`)
        );
        const messages = await response.json();
        const translations = Object.entries(messages).reduce((acc, [key, value]) => {
          acc[key] = value.message;
          return acc;
        }, {});
        this.translations.set(locale, translations);
      } catch (error) {
        console.error(`Erreur lors du chargement des traductions pour ${locale}:`, error);
        return false;
      }
    }
    return true;
  }
}

// Export de la classe et de l'instance
export const i18n = I18nService.getInstance(); 