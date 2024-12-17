import { I18nService } from '../core/i18n.js';

export class UITranslate {
  static async translateElement(element) {
    // Traduire le texte principal
    if (element.hasAttribute('data-i18n')) {
      const key = element.getAttribute('data-i18n');
      element.textContent = I18nService.getInstance().t(key);
    }

    // Traduire le placeholder
    if (element.hasAttribute('data-i18n-placeholder')) {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = I18nService.getInstance().t(key);
    }

    // Traduire le titre
    if (element.hasAttribute('data-i18n-title')) {
      const key = element.getAttribute('data-i18n-title');
      element.title = I18nService.getInstance().t(key);
    }
  }

  static async translatePage() {
    const i18n = I18nService.getInstance();
    await i18n.loadTranslations(i18n.getCurrentLocale());

    // Traduire tous les éléments avec des attributs de traduction
    document.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title]')
      .forEach(element => this.translateElement(element));
  }

  static async translateContextMenus() {
    const i18n = I18nService.getInstance();
    return {
      appName: i18n.t('appName'),
      menuItems: {
        reformulate: i18n.t('reformulateButton'),
        undo: i18n.t('undoButton'),
        redo: i18n.t('redoButton'),
        rollback: i18n.t('rollbackButton')
      }
    };
  }

  static async translateButtons(wrapper, app) {
    if (!wrapper) return;

    const i18n = app.instances.i18n;
    if (!i18n) return;

    // Traduire les tooltips des boutons
    const buttons = wrapper.querySelectorAll('button');
    buttons.forEach(button => {
      const tooltipKey = button.getAttribute('data-tooltip-key');
      if (tooltipKey) {
        button.title = i18n.t(tooltipKey);
      }
    });
  }
} 