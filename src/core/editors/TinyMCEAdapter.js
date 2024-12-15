import { EditorAdapter } from './EditorAdapter.js';

export class TinyMCEAdapter extends EditorAdapter {
  constructor(element) {
    super(element);
    
    if (element.tagName !== 'TEXTAREA') {
      const textarea = TinyMCEAdapter.getTextareaFromIframe(element);
      if (!textarea) {
        throw new Error('TinyMCE editor must be initialized with a textarea element');
      }
      element = textarea;
    }

    if (element.tagName !== 'TEXTAREA') {
      throw new Error('TinyMCE editor must be initialized with a textarea element');
    }

    this.textarea = element;
    this.initialized = false;
    this.initializationPromise = null;
    
    // Ajouter les styles dans l'iframe
    this.disabledStyles = `
      .gpt-editor-disabled {
        background-color: #f5f5f5 !important;
        cursor: not-allowed !important;
        opacity: 0.7 !important;
        user-select: none !important;
        pointer-events: none !important;
      }
    `;
  }

  #injectStyles() {
    if (!this.iframe?.contentDocument) return;
    
    const styleId = 'gpt-editor-styles';
    if (this.iframe.contentDocument.getElementById(styleId)) return;

    const styleSheet = this.iframe.contentDocument.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = this.disabledStyles;
    this.iframe.contentDocument.head.appendChild(styleSheet);
  }

  async initialize() {
    if (this.initialized) return this;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.#waitForTinyMCE().then(() => {
      this.#setupEditor();
      this.#injectStyles(); // Injecter les styles après l'initialisation
      this.initialized = true;
      return this;
    }).catch(error => {
      throw error;
    });

    return this.initializationPromise;
  }

  #waitForTinyMCE() {
    return new Promise((resolve) => {
      const checkTinyMCE = () => {
        const tinyMCEDiv = this.textarea.nextElementSibling;
        if (!tinyMCEDiv?.classList.contains('tox-tinymce')) return null;

        const iframe = tinyMCEDiv.querySelector('.tox-edit-area__iframe');
        if (!iframe?.contentWindow) return null;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc?.body) return null;

        const isInitialized = iframeDoc.body.getAttribute('contenteditable') === 'true' &&
                             iframeDoc.body.getAttribute('data-id') === this.textarea.id;

        if (!isInitialized) return null;

        return {
          get: () => ({
            getContent: () => iframeDoc.body.innerHTML,
            setContent: content => { iframeDoc.body.innerHTML = content; },
            on: (event, callback) => {
              if (event === 'click keyup') {
                ['click', 'keyup'].forEach(e => 
                  iframeDoc.body.addEventListener(e, callback)
                );
              } else {
                iframeDoc.body.addEventListener(event, callback);
              }
            },
            off: (event) => {
              if (event === 'click keyup') {
                ['click', 'keyup'].forEach(e => 
                  iframeDoc.body.removeEventListener(e)
                );
              } else {
                iframeDoc.body.removeEventListener(event);
              }
            }
          })
        };
      };

      if (checkTinyMCE()) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        const tinymce = checkTinyMCE();
        if (tinymce) {
          observer.disconnect();
          resolve(tinymce);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });
  }

  #setupEditor() {
    const tinyMCEDiv = this.textarea.nextElementSibling;
    if (!tinyMCEDiv?.classList.contains('tox-tinymce')) {
      throw new Error('TinyMCE container not found');
    }

    this.iframe = tinyMCEDiv.querySelector('.tox-edit-area__iframe');
    if (!this.iframe) {
      throw new Error('TinyMCE iframe not found');
    }

    this.element = tinyMCEDiv;
  }

  setupButtons(buttonsWrapper) {
    if (!this.initialized) {
      this.initialize().then(() => this.setupButtons(buttonsWrapper));
      return;
    }

    if (!this.iframe) return;

    this.element.parentNode.insertBefore(buttonsWrapper, this.element.nextSibling);
    buttonsWrapper.classList.add('gpt-buttons-wrapper');
    buttonsWrapper.classList.add('tinymce-buttons');
    buttonsWrapper.style.display = 'none';

    this.#setupFocusHandling(buttonsWrapper);
  }

  #setupFocusHandling(buttonsWrapper) {
    let isInteractingWithButtons = false;

    const handleFocus = () => {
      const hasFocus = this.element.classList.contains('tox-edit-focus') || isInteractingWithButtons;
      buttonsWrapper.style.display = hasFocus ? 'flex' : 'none';
    };

    this.iframe.contentDocument.addEventListener('focus', () => {
      this.element.classList.add('tox-edit-focus');
      handleFocus();
    }, true);

    this.iframe.contentDocument.addEventListener('blur', (event) => {
      const isClickInButtons = buttonsWrapper.contains(event.relatedTarget);
      
      if (!isClickInButtons && !isInteractingWithButtons) {
        this.element.classList.remove('tox-edit-focus');
        handleFocus();
      }
    }, true);

    buttonsWrapper.addEventListener('mouseenter', () => {
      isInteractingWithButtons = true;
      handleFocus();
    });

    buttonsWrapper.addEventListener('mouseleave', (event) => {
      isInteractingWithButtons = false;
      const isFocusInEditor = this.iframe.contentDocument.activeElement === this.iframe.contentDocument.body;
      
      if (!isFocusInEditor) {
        this.element.classList.remove('tox-edit-focus');
        handleFocus();
      }
    });

    this.observer = new MutationObserver(() => {
      handleFocus();
    });

    this.observer.observe(this.element, {
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true
    });

    buttonsWrapper.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });
  }

  getValue() {
    if (!this.initialized) {
      return '';
    }

    try {
      if (this.iframe?.contentDocument?.getSelection) {
        const selection = this.iframe.contentDocument.getSelection();
        if (selection && !selection.isCollapsed) {
          return selection.toString().trim();
        }
      }

      const body = this.iframe.contentDocument.body;
      if (!body) return '';
      
      const paragraph = body.querySelector('p');
      if (paragraph) {
        return paragraph.innerHTML.trim();
      }
      return body.innerHTML.trim();
    } catch (error) {
      return '';
    }
  }

  setValue(content) {
    if (!this.initialized) {
      this.initialize().then(() => this.setValue(content));
      return;
    }

    try {
      const body = this.iframe.contentDocument.body;
      if (!body) return;

      const cleanContent = content.trim();
      
      if (this.iframe.contentDocument.getSelection) {
        const selection = this.iframe.contentDocument.getSelection();
        if (selection && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = this.iframe.contentDocument.createTextNode(cleanContent);
          range.insertNode(textNode);
          selection.removeAllRanges();
          this.dispatchInputEvent();
          return;
        }
      }

      const paragraph = body.querySelector('p');
      if (paragraph) {
        paragraph.innerHTML = cleanContent;
      } else {
        body.innerHTML = `<p>${cleanContent}</p>`;
      }
      
      this.textarea.value = cleanContent;
      this.dispatchInputEvent();
    } catch (error) {
      // Silently fail
    }
  }

  dispatchInputEvent() {
    const event = new Event('input', { bubbles: true });
    this.textarea.dispatchEvent(event);
    
    if (this.iframe?.contentDocument?.body) {
      const iframeEvent = new Event('input', { bubbles: true });
      this.iframe.contentDocument.body.dispatchEvent(iframeEvent);
    }
  }

  disable() {
    if (this.iframe?.contentDocument?.body) {
      this.#injectStyles(); // S'assurer que les styles sont présents
      this.iframe.contentDocument.body.contentEditable = 'false';
      this.iframe.contentDocument.body.classList.add('gpt-editor-disabled');
    }
  }

  enable() {
    if (this.iframe?.contentDocument?.body) {
      this.iframe.contentDocument.body.contentEditable = 'true';
      this.iframe.contentDocument.body.classList.remove('gpt-editor-disabled');
    }
  }

  isEditable() {
    return this.iframe?.contentDocument?.body?.contentEditable === 'true';
  }

  static async matches(element) {
    if (element.closest('.tox-edit-area__iframe')) {
      const textarea = TinyMCEAdapter.getTextareaFromIframe(element);
      if (!textarea) return false;
      element = textarea;
    }

    if (element.tagName !== 'TEXTAREA') {
      return false;
    }

    try {
      const tinyMCEDiv = element.nextElementSibling;
      if (!tinyMCEDiv?.classList.contains('tox-tinymce')) {
        return false;
      }

      const iframe = tinyMCEDiv.querySelector('.tox-edit-area__iframe');
      if (!iframe?.contentWindow) {
        return false;
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc?.body) {
        return false;
      }

      return iframeDoc.body.getAttribute('contenteditable') === 'true' &&
             iframeDoc.body.getAttribute('data-id') === element.id;
    } catch (error) {
      return false;
    }
  }

  static getTextareaFromIframe(element) {
    const iframe = element.closest('.tox-edit-area__iframe');
    if (iframe) {
      return iframe.closest('.tox-tinymce')?.previousElementSibling;
    }
    return null;
  }

  getContainer() {
    return this.textarea;
  }

  destroy() {
    this.observer?.disconnect();
    
    if (this.iframe?.contentDocument?.body) {
      ['input', 'change', 'focus', 'blur'].forEach(event => {
        this.iframe.contentDocument.body.removeEventListener(event);
      });
    }
  }

  getButtonsWrapper() {
    return this.element?.nextElementSibling?.classList.contains('gpt-buttons-wrapper') ? 
        this.element.nextElementSibling : 
        this.textarea.nextElementSibling?.nextElementSibling;
  }
} 