export class Reformulator {
  constructor() {
    this.templates = null;
    this.typeWriter = null;
    this.TextHistory = null;
  }

  init({ templates, typeWriter, TextHistory }) {
    this.templates = templates;
    this.typeWriter = typeWriter;
    this.TextHistory = TextHistory;
  }

  async reformulateText(input, inputHistories) {
    const wrapper = input.nextElementSibling;
    const reformulateButton = wrapper.querySelector('.gpt-reformulate-button');
    const configButton = wrapper.querySelector('.gpt-config-button');
    const configMenu = wrapper.querySelector('.gpt-config-menu');
    
    if (!input.value.trim()) return;
    if (!inputHistories.has(input)) {
      inputHistories.set(input, new this.TextHistory(input.value));
    }

    input.disabled = true;
    
    wrapper.querySelectorAll('.gpt-undo-button, .gpt-redo-button, .gpt-rollback-button').forEach(btn => {
      btn.style.display = 'none';
      btn.disabled = true;
    });

    reformulateButton.disabled = true;
    configMenu.classList.remove('visible');
    configButton.classList.remove('active');
    configButton.style.display = 'none';
    configButton.disabled = true;

    reformulateButton.classList.add('loading');

    const style = localStorage.getItem('gpt-reformulation-style') || 'professional';
    const template = this.templates[style];

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'reformulateText',
        text: input.value,
        template: template || this.templates.professional
      });
      
      if (response.success) {
        const newText = response.reformulatedText;
        const history = inputHistories.get(input);
        history.addText(newText);
        await this.typeWriter.typeText(input, newText);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        this.showError(wrapper, response.error || 'Erreur lors de la reformulation');
        input.value = inputHistories.get(input).getOriginalText();
      }
    } catch (error) {
      this.showError(wrapper, 'Erreur lors de la reformulation');
      input.value = inputHistories.get(input).getOriginalText();
    } finally {
      this.resetUI(input, wrapper, reformulateButton, configButton, inputHistories);
    }
  }

  showError(wrapper, message) {
    const existingNotification = document.querySelector('.gpt-error-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'gpt-error-notification';
    notification.textContent = message;
    wrapper.appendChild(notification);

    setTimeout(() => {
      notification.style.transition = 'opacity 0.5s ease';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  resetUI(input, wrapper, reformulateButton, configButton, inputHistories) {
    input.disabled = false;
    reformulateButton.disabled = false;
    reformulateButton.classList.remove('loading');

    const history = inputHistories.get(input);
    if (history) {
      const buttons = {
        undo: wrapper.querySelector('.gpt-undo-button'),
        redo: wrapper.querySelector('.gpt-redo-button'),
        rollback: wrapper.querySelector('.gpt-rollback-button')
      };
  
      Object.values(buttons).forEach(btn => btn.disabled = false);
      configButton.disabled = false;

      buttons.undo.style.display = history.canUndo() ? 'flex' : 'none';
      buttons.redo.style.display = history.canRedo() ? 'flex' : 'none';
      buttons.rollback.style.display = history.currentIndex > 0 ? 'flex' : 'none';
      configButton.style.display = 'flex';
    }
  }
}
