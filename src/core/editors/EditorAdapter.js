// Classe abstraite de base pour tous les adaptateurs d'éditeurs
export class EditorAdapter {
  constructor(element) {
    if (new.target === EditorAdapter) {
      throw new Error('EditorAdapter is an abstract class');
    }
    this.element = element;
  }

  setupButtons(buttonsWrapper) {
    if (!this.element) return;

    // Insérer et configurer le wrapper
    this.element.parentNode.insertBefore(buttonsWrapper, this.element.nextSibling);
    
    // Cacher le wrapper par défaut
    buttonsWrapper.style.display = 'none';

    // Configurer les événements de focus
    this.#setupFocusHandling(buttonsWrapper);
  }

  #setupFocusHandling(buttonsWrapper) {
    let isInteractingWithButtons = false;

    const handleFocus = () => {
      const hasFocus = document.activeElement === this.element || isInteractingWithButtons;
      buttonsWrapper.style.display = hasFocus ? 'flex' : 'none';
    };

    // Focus sur l'élément
    this.element.addEventListener('focus', () => {
      handleFocus();
    });

    // Blur sur l'élément
    this.element.addEventListener('blur', (event) => {
      const isClickInButtons = buttonsWrapper.contains(event.relatedTarget);
      
      if (!isClickInButtons && !isInteractingWithButtons) {
        handleFocus();
      }
    });

    // Gestion des interactions avec les boutons
    buttonsWrapper.addEventListener('mouseenter', () => {
      isInteractingWithButtons = true;
      handleFocus();
    });

    buttonsWrapper.addEventListener('mouseleave', () => {
      isInteractingWithButtons = false;
      const isFocusInEditor = document.activeElement === this.element;
      if (!isFocusInEditor) {
        handleFocus();
      }
    });

    // Empêcher la perte de focus lors du clic sur les boutons
    buttonsWrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  getValue() {
    throw new Error('getValue() must be implemented');
  }

  setValue(text) {
    throw new Error('setValue() must be implemented');
  }

  getContainer() {
    throw new Error('getContainer() must be implemented');
  }

  dispatchInputEvent() {
    throw new Error('dispatchInputEvent() must be implemented');
  }

  // Nouvelles méthodes pour la gestion de l'UI
  disable() {
    this.element.disabled = true;
    this.element.style.opacity = '0.7';
    this.element.style.pointerEvents = 'none';
  }

  enable() {
    this.element.disabled = false;
    this.element.style.opacity = '1';
    this.element.style.pointerEvents = 'auto';
  }

  isEditable() {
    return !this.element.disabled;
  }

  getButtonsWrapper() {
    return this.element.nextElementSibling;
  }

  // Méthodes utilitaires
  static matches(element) {
    throw new Error('matches() must be implemented');
  }

  updateHistoryButtons(wrapper, history) {
    if (!wrapper?.classList.contains('gpt-buttons-wrapper')) return;

    const buttons = {
      undo: { 
        element: wrapper.querySelector('.gpt-undo-button'),
        condition: history.canUndo()
      },
      redo: {
        element: wrapper.querySelector('.gpt-redo-button'),
        condition: history.canRedo()
      },
      rollback: {
        element: wrapper.querySelector('.gpt-rollback-button'),
        condition: history.currentIndex > 0
      }
    };

    // Mise à jour de l'état des boutons
    Object.values(buttons).forEach(({ element, condition }) => {
      if (element) {
        element.style.display = condition ? 'flex' : 'none';
        element.disabled = !condition;
        element.style.opacity = condition ? '1' : '0.5';
      }
    });
  }
} 