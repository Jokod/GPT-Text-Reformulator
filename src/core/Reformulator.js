import { TEMPLATES, ERRORS } from '../utils/constants.js';
import { EditorFactory } from './editors/EditorFactory.js';
import { TinyMCEAdapter } from './editors/TinyMCEAdapter.js';

export class Reformulator {
  constructor() {
    this.#initializeDependencies();
    this.#initializeState();
  }

  #initializeDependencies() {
    this.dependencies = {
      templates: null,
      typeWriter: null,
      TextHistory: null,
      app: null
    };
  }

  #initializeState() {
    this.state = {
      currentEditor: null,
      currentWrapper: null,
      isReformulating: false
    };
  }

  init({ templates = TEMPLATES.reformulation, typeWriter, TextHistory, app }) {
    this.dependencies = { templates, typeWriter, TextHistory, app };
  }

  async reformulateText(element, inputHistories, showOnFocus) {
    if (this.state.isReformulating) {
      return;
    }
    
    let editor = null;
    try {
      editor = await EditorFactory.createAdapter(element);
      if (!editor) {
        return;
      }

      const wrapper = editor.getButtonsWrapper();
        
      const reformulateButton = wrapper?.querySelector('.gpt-reformulate-button');
      
      if (reformulateButton) {
        reformulateButton.disabled = true;
        reformulateButton.classList.add('loading');
      }
      
      this.state.isReformulating = true;
      editor.disable();

      const originalText = editor.getValue();
      if (!originalText.trim()) {
        editor.enable();
        return;
      }

      let history = inputHistories.get(editor.element);
      if (!history) {
        history = new this.dependencies.TextHistory(originalText);
        inputHistories.set(editor.element, history);
      }

      const reformulatedText = await this.reformulate(originalText);
      if (!reformulatedText) {
        editor.enable();
        return;
      }

      history.addText(reformulatedText);

      try {
        await this.dependencies.typeWriter.typeText(editor, reformulatedText);
      } catch (error) {
        await editor.setValue(reformulatedText);
      }

      if (wrapper?.classList.contains('gpt-buttons-wrapper')) {
        const buttons = {
          undo: wrapper.querySelector('.gpt-undo-button'),
          redo: wrapper.querySelector('.gpt-redo-button'),
          rollback: wrapper.querySelector('.gpt-rollback-button')
        };

        buttons.undo.style.display = history.canUndo() ? 'flex' : 'none';
        buttons.undo.disabled = !history.canUndo();
        buttons.undo.style.opacity = history.canUndo() ? '1' : '0.5';

        buttons.redo.style.display = history.canRedo() ? 'flex' : 'none';
        buttons.redo.disabled = !history.canRedo();
        buttons.redo.style.opacity = history.canRedo() ? '1' : '0.5';

        buttons.rollback.style.display = history.currentIndex > 0 ? 'flex' : 'none';
        buttons.rollback.disabled = history.currentIndex === 0;
        buttons.rollback.style.opacity = history.currentIndex > 0 ? '1' : '0.5';
      }
    } catch (error) {
      this.showError(element, error.message || 'Erreur lors de la reformulation');
    } finally {
      if (editor) {
        editor.enable();
      }
      
      this.state.isReformulating = false;
      
      const wrapper = editor.getButtonsWrapper();
      const reformulateButton = wrapper?.querySelector('.gpt-reformulate-button');
      
      if (reformulateButton) {
        reformulateButton.disabled = false;
        reformulateButton.classList.remove('loading');
      }
    }
  }

  // Validation et initialisation
  validateInput(editor) {
    return editor.getValue().trim().length > 0 && editor.isEditable();
  }

  initializeHistory(editor, inputHistories) {
    if (!this.dependencies.app.hasHistory(editor)) {
      const initialText = editor.getValue().trim();
      this.dependencies.app.setHistory(
        editor, 
        new this.dependencies.TextHistory(initialText)
      );
    }
  }

  // Gestion de l'UI
  #updateUIForReformulation(editor, wrapper) {
    editor.disable();
    if (wrapper) {
      wrapper.style.display = 'flex';
      this.disableUI(wrapper);
    }
  }

  #restoreUIAfterReformulation(editor, wrapper) {
    editor.enable();
    if (wrapper) {
      this.enableUI(editor, wrapper);
    }
  }

  disableUI(wrapper) {
    const elements = {
      reformulateButton: wrapper.querySelector('.gpt-reformulate-button'),
      historyButtons: wrapper.querySelectorAll('.gpt-undo-button, .gpt-redo-button, .gpt-rollback-button')
    };

    elements.historyButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    elements.reformulateButton.disabled = true;
    elements.reformulateButton.classList.add('loading');
  }

  enableUI(editor, wrapper, inputHistories) {
    const elements = {
      reformulateButton: wrapper.querySelector('.gpt-reformulate-button'),
      buttons: {
        undo: wrapper.querySelector('.gpt-undo-button'),
        redo: wrapper.querySelector('.gpt-redo-button'),
        rollback: wrapper.querySelector('.gpt-rollback-button')
      }
    };

    elements.reformulateButton.disabled = false;
    elements.reformulateButton.classList.remove('loading');

    const history = this.dependencies.app.getHistory(editor);
    if (!history) return;

    Object.values(elements.buttons).forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });

    this.updateButtonVisibility(elements.buttons, history);
  }

  updateButtonVisibility(buttons, history) {
    buttons.undo.style.display = history.canUndo() ? 'flex' : 'none';
    buttons.redo.style.display = history.canRedo() ? 'flex' : 'none';
    buttons.rollback.style.display = history.currentIndex > 0 ? 'flex' : 'none';

    buttons.undo.disabled = !history.canUndo();
    buttons.redo.disabled = !history.canRedo();
    buttons.rollback.disabled = history.currentIndex === 0;
  }

  // Communication avec l'API
  async sendReformulationRequest(text) {
    const template = this.getTemplate();
    return chrome.runtime.sendMessage({
      action: 'reformulateText',
      text,
      template
    });
  }

  getTemplate() {
    const style = this.dependencies.app?.selectedStyle || 'professional';
    return this.dependencies.templates[style] || 
           this.dependencies.templates.professional;
  }

  // Gestion des réponses et erreurs
  async handleReformulationResponse(response, editor, inputHistories) {
    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la reformulation');
    }

    const history = this.dependencies.app.getHistory(editor);
    if (!history) {
      this.initializeHistory(editor, inputHistories);
    }
    
    const reformulatedText = response.reformulatedText.trim();
    history.addText(reformulatedText);
    await this.dependencies.typeWriter.typeText(editor, reformulatedText);
    editor.dispatchInputEvent();
  }

  handleReformulationError(error, editor, inputHistories) {
    this.showError(
      editor.getContainer(), 
      error.message || 'Erreur lors de la reformulation'
    );
    const history = this.dependencies.app.getHistory(editor);
    if (history) {
      editor.setValue(history.getOriginalText());
    }
  }

  showError(container, message) {
    if (!container) {
      console.error('Container not found for error notification');
      return;
    }

    const existingNotification = document.querySelector('.gpt-error-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'gpt-error-notification';
    notification.textContent = message;
    container.appendChild(notification);

    this.scheduleNotificationRemoval(notification);
  }

  scheduleNotificationRemoval(notification) {
    setTimeout(() => {
      notification.style.transition = 'opacity 0.5s ease';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  restoreUI(editor, inputHistories, showOnFocus) {
    editor.enable();
    
    if (showOnFocus && !editor.isEditable()) {
      this.state.currentWrapper.style.display = 'none';
    }
    
    this.enableUI(editor, this.state.currentWrapper, inputHistories);
  }

  async reformulate(text) {
    try {
        const template = this.getTemplate();
        const response = await chrome.runtime.sendMessage({
            action: 'reformulateText',
            text,
            template
        });

        if (!response.success) {
            throw new Error(response.error || 'Erreur lors de la reformulation');
        }

        const reformulatedText = response.reformulatedText.trim();
        if (!reformulatedText) {
            throw new Error('Le texte reformulé est vide');
        }

        return reformulatedText;
    } catch (error) {
        throw error;
    }
  }
}
