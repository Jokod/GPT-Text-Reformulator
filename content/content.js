const inputHistories = new WeakMap();

const reformulationTemplates = {
  professional: 'Reformule ce texte de manière professionnelle',
  casual: 'Reformule ce texte de manière plus décontractée',
  formal: 'Reformule ce texte de manière formelle et soutenue',
  custom: text => `Reformule ce texte: ${text}`
};

class TextHistory {
  constructor(initialText) {
    this.history = [initialText];
    this.currentIndex = 0;
  }

  addText(text) {
    this.history.splice(this.currentIndex + 1);
    this.history.push(text);
    this.currentIndex = this.history.length - 1;
  }

  canUndo() { return this.currentIndex > 0; }
  canRedo() { return this.currentIndex < this.history.length - 1; }
  getCurrentText() { return this.history[this.currentIndex]; }
  getOriginalText() { return this.history[0]; }

  undo() { return this.canUndo() ? this.history[--this.currentIndex] : null; }
  redo() { return this.canRedo() ? this.history[++this.currentIndex] : null; }
}

async function reformulateText(input) {
  const wrapper = input.nextElementSibling;
  const reformulateButton = wrapper.querySelector('.gpt-reformulate-button');
  const configButton = wrapper.querySelector('.gpt-config-button');
  const configMenu = wrapper.querySelector('.gpt-config-menu');
  
  if (!input.value.trim()) return;
  if (!inputHistories.has(input)) inputHistories.set(input, new TextHistory(input.value));

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
  const template = reformulationTemplates[style];

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'reformulateText',
      text: input.value,
      template: template || reformulationTemplates.professional
    });
    
    if (response.success) {
      const newText = response.reformulatedText;
      const history = inputHistories.get(input);
      history.addText(newText);
      await typeText(input, newText);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      input.value = inputHistories.get(input).getOriginalText();
    }
  } catch (error) {
    const existingNotification = wrapper.querySelector('.gpt-error-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.className = 'gpt-error-notification';
    notification.textContent = 'Erreur lors de la reformulation';
    wrapper.appendChild(notification);

    setTimeout(() => {
      notification.style.transition = 'opacity 0.5s ease';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
    
    input.value = inputHistories.get(input).getOriginalText();
  } finally {
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

async function typeText(input, text) {
  input.value = '';
  const chunks = text.split(/([.,!?])/);
  
  for (const chunk of chunks) {
    if (!chunk) continue;
    for (const char of chunk) {
      input.value += char;
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
    }
    if (/[.,!?]/.test(chunk)) await new Promise(resolve => setTimeout(resolve, 100));
  }
}

function createHistoryButton(type, title, pathD) {
  const button = document.createElement('button');
  button.className = `gpt-${type}-button`;
  button.setAttribute('type', 'button');
  button.setAttribute('title', title);
  button.style.display = (type === 'reformulate' || type === 'config') ? 'flex' : 'none';
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="${pathD}" fill="currentColor"/></svg>`;
  return button;
}

function updateHistoryButtons(input) {
  const history = inputHistories.get(input);
  if (!history) return;

  const wrapper = input.nextElementSibling;
  const undoButton = wrapper.querySelector('.gpt-undo-button');
  const redoButton = wrapper.querySelector('.gpt-redo-button');
  const rollbackButton = wrapper.querySelector('.gpt-rollback-button');

  undoButton.style.display = history.canUndo() ? 'flex' : 'none';
  redoButton.style.display = history.canRedo() ? 'flex' : 'none';
  rollbackButton.style.display = history.currentIndex > 0 ? 'flex' : 'none';
}

function addReformulateButton(input) {
  if (input.nextElementSibling?.classList.contains('gpt-buttons-wrapper')) return;

  const buttonsWrapper = document.createElement('div');
  buttonsWrapper.className = 'gpt-buttons-wrapper';
  
  const undoButton = createHistoryButton('undo', 'Précédente version (Alt+←)', 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z');
  const redoButton = createHistoryButton('redo', 'Version suivante (Alt+→)', 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z');
  const reformulateButton = createHistoryButton('reformulate', 'Reformuler (Alt+R)', 'M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z');
  const rollbackButton = createHistoryButton('rollback', 'Revenir au texte original (Alt+Z)', 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z');
  const configButton = createHistoryButton('config', 'Options', 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z');

  buttonsWrapper.append(undoButton, reformulateButton, redoButton, rollbackButton, configButton);
  input.parentNode.insertBefore(buttonsWrapper, input.nextSibling);

  const configMenu = document.createElement('div');
  configMenu.className = 'gpt-config-menu';
  configMenu.innerHTML = `
    <div class="gpt-config-item">
      <div class="gpt-style-buttons">
        <button class="gpt-style-button" data-style="professional" title="Style professionnel">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8-2h4v2h-4V4zM5 18V9h14v9H5z" fill="currentColor"/>
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
  buttonsWrapper.appendChild(configMenu);

  // Gestion des boutons de style
  const styleButtons = configMenu.querySelectorAll('.gpt-style-button');
  const currentStyle = localStorage.getItem('gpt-reformulation-style') || 'professional';
  
  styleButtons.forEach(button => {
    if (button.dataset.style === currentStyle) {
      button.classList.add('active');
    }
    
    button.addEventListener('click', () => {
      styleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      localStorage.setItem('gpt-reformulation-style', button.dataset.style);
    });
  });

  undoButton.addEventListener('click', () => handleHistoryNavigation(input, 'undo'));
  redoButton.addEventListener('click', () => handleHistoryNavigation(input, 'redo'));
  reformulateButton.addEventListener('click', () => reformulateText(input));
  rollbackButton.addEventListener('click', () => handleHistoryNavigation(input, 'rollback'));
  configButton.addEventListener('click', () => {
    configMenu.classList.toggle('visible');
    configButton.classList.toggle('active');
  });

  // Modifier la gestion du clic en dehors
  document.addEventListener('click', (e) => {
    const isConfigButton = e.target.closest('.gpt-config-button');
    const isConfigMenu = e.target.closest('.gpt-config-menu');
    const isStyleButton = e.target.closest('.gpt-style-button');

    // Ne fermer que si on clique en dehors du menu ET que ce n'est pas un bouton de style
    if (!isConfigButton && !isConfigMenu && !isStyleButton) {
      configMenu.classList.remove('visible');
      configButton.classList.remove('active');
    }
  });

  input.addEventListener('focus', () => {
    buttonsWrapper.style.display = 'flex';
    updateHistoryButtons(input);
  });

  input.addEventListener('blur', (e) => {
    if (!e.relatedTarget?.closest('.gpt-buttons-wrapper')) {
      buttonsWrapper.style.display = 'none';
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.altKey) {
      switch (e.key) {
        case 'r': 
          e.preventDefault();
          reformulateText(input);
          break;
        case 'z':
          e.preventDefault();
          handleHistoryNavigation(input, 'undo');
          break;
        case 'y':
          e.preventDefault();
          handleHistoryNavigation(input, 'redo');
          break;
        case 'o':
          e.preventDefault();
          handleHistoryNavigation(input, 'rollback');
          break;
      }
    }
  });
}

function handleHistoryNavigation(input, action) {
  const history = inputHistories.get(input);
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
    updateHistoryButtons(input);
  }
}

function initializeInputs() {
  document.querySelectorAll(`
    input[type="text"],
    input[type="search"],
    input:not([type]),
    textarea,
    [contenteditable="true"]
  `).forEach(input => addReformulateButton(input));
}

initializeInputs();

new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === 1) {
        node.querySelectorAll(`
          input[type="text"],
          input[type="search"],
          input:not([type]),
          textarea,
          [contenteditable="true"]
        `).forEach(input => addReformulateButton(input));
      }
    });
  });
}).observe(document.body, { childList: true, subtree: true }); 

function addToFavorites(text) {
  const favorites = JSON.parse(localStorage.getItem('gpt-favorites') || '[]');
  favorites.push({
    text,
    date: new Date().toISOString(),
    context: window.location.href
  });
  localStorage.setItem('gpt-favorites', JSON.stringify(favorites));
} 