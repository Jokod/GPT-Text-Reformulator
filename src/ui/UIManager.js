export class UIManager {
  static addReformulateButton(input, app) {
    if (input.nextElementSibling?.classList.contains('gpt-buttons-wrapper')) return;

    const buttonsWrapper = this.createButtonsWrapper();
    const buttons = this.createButtons();
    const configMenu = this.createConfigMenu();

    buttonsWrapper.append(...Object.values(buttons), configMenu);
    input.parentNode.insertBefore(buttonsWrapper, input.nextSibling);

    this.setupEventListeners(input, buttons, configMenu, app);
  }

  static createButtonsWrapper() {
    const wrapper = document.createElement('div');
    wrapper.className = 'gpt-buttons-wrapper';
    return wrapper;
  }

  static createButtons() {
    return {
      undo: this.createHistoryButton('undo', 'Précédente version (Alt+←)', 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z'),
      redo: this.createHistoryButton('redo', 'Version suivante (Alt+→)', 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z'),
      reformulate: this.createHistoryButton('reformulate', 'Reformuler (Alt+R)', 'M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z'),
      rollback: this.createHistoryButton('rollback', 'Revenir au texte original (Alt+Z)', 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z'),
      config: this.createHistoryButton('config', 'Options', 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z')
    };
  }

  static createHistoryButton(type, title, pathD) {
    const button = document.createElement('button');
    button.className = `gpt-${type}-button`;
    button.setAttribute('type', 'button');
    button.setAttribute('title', title);
    button.style.display = (type === 'reformulate' || type === 'config') ? 'flex' : 'none';
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="${pathD}" fill="currentColor"/></svg>`;
    return button;
  }

  static createConfigMenu() {
    const configMenu = document.createElement('div');
    configMenu.className = 'gpt-config-menu';
    configMenu.innerHTML = `
      <div class="gpt-config-item">
        <div class="gpt-style-buttons">
          <button class="gpt-style-button" data-style="professional" title="Style professionnel">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-1.41-1.42-6.59 6.59-2.58-2.57-1.42 1.41 4 3.99z" fill="currentColor"/>
            </svg>
            Pro
          </button>
          <button class="gpt-style-button" data-style="casual" title="Style décontracté">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"/>
            </svg>
            Décontracté
          </button>
          <button class="gpt-style-button" data-style="formal" title="Style formel">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z" fill="currentColor"/>
            </svg>
            Formel
          </button>
        </div>
      </div>
    `;
    return configMenu;
  }

  static updateHistoryButtons(input, inputHistories) {
    const history = inputHistories.get(input);
    if (!history) return;

    const wrapper = input.nextElementSibling;
    if (!wrapper?.classList.contains('gpt-buttons-wrapper')) return;

    const undoButton = wrapper.querySelector('.gpt-undo-button');
    const redoButton = wrapper.querySelector('.gpt-redo-button');
    const rollbackButton = wrapper.querySelector('.gpt-rollback-button');

    undoButton.style.display = history.canUndo() ? 'flex' : 'none';
    redoButton.style.display = history.canRedo() ? 'flex' : 'none';
    rollbackButton.style.display = history.currentIndex > 0 ? 'flex' : 'none';
  }

  static setupEventListeners(input, buttons, configMenu, app) {
    const { undo, redo, reformulate, rollback, config } = buttons;
    const buttonsWrapper = configMenu.parentElement;
    
    const handleError = (error) => {
        if (error.message.includes('Extension context invalidated')) {
            window.location.reload();
            return;
        }
        console.error('Erreur:', error);
    };

    const wrapAction = (action) => async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await action();
        } catch (error) {
            handleError(error);
        }
    };

    // Configuration des boutons principaux
    const buttonActions = {
        reformulate: () => app.reformulator.reformulateText(input, app.inputHistories, app.showOnFocus),
        undo: () => this.handleHistoryNavigation(input, 'undo', app),
        redo: () => this.handleHistoryNavigation(input, 'redo', app),
        rollback: () => this.handleHistoryNavigation(input, 'rollback', app),
        config: () => {
            configMenu.classList.toggle('visible');
            config.classList.toggle('active');
        }
    };

    // Attacher les événements aux boutons principaux
    Object.entries(buttonActions).forEach(([key, action]) => {
        buttons[key].addEventListener('click', wrapAction(action));
    });

    // Configuration des boutons de style
    const styleButtons = configMenu.querySelectorAll('.gpt-style-button');
    styleButtons.forEach(button => {
        button.addEventListener('click', wrapAction(async () => {
            await this.setStyle(button.dataset.style);
        }));
    });

    // Gestion des styles
    const updateStyleButtons = async () => {
        const { 'gpt-reformulation-style': currentStyle } = await chrome.storage.local.get('gpt-reformulation-style');
        styleButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.style === (currentStyle || 'professional'));
        });
    };

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes['gpt-reformulation-style']) {
            updateStyleButtons();
        }
    });

    updateStyleButtons();

    // Gestion du focus et du blur
    input.addEventListener('focus', () => {
        buttonsWrapper.style.display = 'flex';
        this.updateHistoryButtons(input, app.inputHistories);
    });

    input.addEventListener('blur', (e) => {
        if (!e.relatedTarget?.closest('.gpt-buttons-wrapper')) {
            buttonsWrapper.style.display = 'none';
        }
    });

    // Raccourcis clavier
    const keyboardShortcuts = {
        'r': () => app.reformulator.reformulateText(input, app.inputHistories, app.showOnFocus),
        'z': () => this.handleHistoryNavigation(input, 'undo', app),
        'y': () => this.handleHistoryNavigation(input, 'redo', app),
        'o': () => this.handleHistoryNavigation(input, 'rollback', app)
    };

    input.addEventListener('keydown', (e) => {
        if (e.altKey && keyboardShortcuts[e.key]) {
            e.preventDefault();
            wrapAction(keyboardShortcuts[e.key])();
        }
    });

    // Fermeture du menu de configuration
    document.addEventListener('click', (e) => {
        const isConfigRelated = e.target.closest('.gpt-config-button, .gpt-config-menu, .gpt-style-button');
        if (!isConfigRelated) {
            configMenu.classList.remove('visible');
            config.classList.remove('active');
        }
    });
  }

  static handleHistoryNavigation(input, action, app) {
    const history = app.inputHistories.get(input);
    if (!history) return;

    let newText;
    switch (action) {
      case 'undo': newText = history.undo(); break;
      case 'redo': newText = history.redo(); break;
      case 'rollback':
        newText = history.getOriginalText();
        history.currentIndex = 0;
        break;
    }

    if (newText !== null) {
      input.value = newText;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      if (app.showOnFocus) {
        this.updateHistoryButtons(input, app.inputHistories);
      }
    }
  }

  static async setStyle(style) {
    await chrome.storage.local.set({ 'gpt-reformulation-style': style });

    if (this.showOnFocus) {
    const styleButtons = document.querySelectorAll('.gpt-style-button');
    styleButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.style === style);
      });
    }
  }
} 