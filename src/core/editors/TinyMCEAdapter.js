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
      this.#injectStyles();
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
        const isModernVersion = tinyMCEDiv?.classList.contains('tox-tinymce');
        const iframe = document.getElementById(`${this.textarea.id}_ifr`);
        const isLegacyVersion = !isModernVersion && 
                               this.textarea.style.display === 'none' && 
                               this.textarea.id && 
                               iframe?.closest('.mce-tinymce');

        let iframeToCheck;
        if (isModernVersion) {
          iframeToCheck = tinyMCEDiv.querySelector('.tox-edit-area__iframe');
        } else if (isLegacyVersion) {
          iframeToCheck = iframe;
        } else {
          return null;
        }

        if (!iframeToCheck?.contentWindow) {
          return null;
        }

        const iframeDoc = iframeToCheck.contentDocument || iframeToCheck.contentWindow.document;
        if (!iframeDoc?.body) {
          return null;
        }

        const isInitialized = isModernVersion ? 
          (iframeDoc.body.getAttribute('contenteditable') === 'true' &&
           iframeDoc.body.getAttribute('data-id') === this.textarea.id) :
          (iframeDoc.body.classList.contains('mceContentBody') || 
           iframeDoc.body.getAttribute('contenteditable') === 'true');

        if (!isInitialized) return null;

        return {
          isModernVersion,
          isLegacyVersion,
          iframe: iframeToCheck,
          get: () => ({
            getContent: () => iframeDoc.body.innerHTML,
            setContent: content => { 
              if (isLegacyVersion) {
                setTimeout(() => {
                  iframeDoc.body.innerHTML = content;
                  const event = new Event('input', { bubbles: true });
                  iframeDoc.body.dispatchEvent(event);
                }, 0);
              } else {
                iframeDoc.body.innerHTML = content;
              }
            },
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

      let attempts = 0;
      const maxAttempts = 50;
      const interval = 100;
      
      const checkInterval = setInterval(() => {
        const tinymce = checkTinyMCE();
        if (tinymce) {
          clearInterval(checkInterval);
          resolve(tinymce);
        } else if (attempts++ > maxAttempts) {
          clearInterval(checkInterval);
          console.warn('TinyMCE initialization timeout');
          resolve(null);
        }
      }, interval);
    });
  }

  #setupEditor() {
    const tinyMCEDiv = this.textarea.nextElementSibling;
    const isModernVersion = tinyMCEDiv?.classList.contains('tox-tinymce');
    const iframe = document.getElementById(`${this.textarea.id}_ifr`);
    const isLegacyVersion = !isModernVersion && 
                           this.textarea.style.display === 'none' && 
                           this.textarea.id && 
                           iframe && 
                           !!iframe.closest('.mce-tinymce');
    
    if (isModernVersion) {
      this.iframe = tinyMCEDiv.querySelector('.tox-edit-area__iframe');
      this.element = tinyMCEDiv;
    } else if (isLegacyVersion) {
      this.iframe = iframe;
      this.element = iframe.closest('.mce-tinymce');
    }

    if (!this.iframe || !this.element) {
      throw new Error('TinyMCE initialization failed');
    }
  }

  setupButtons(buttonsWrapper) {
    if (!this.initialized) {
      this.initialize().then(() => this.setupButtons(buttonsWrapper));
      return;
    }

    if (!this.iframe || !this.element) {
      console.warn('TinyMCE: not properly initialized during setupButtons');
      return;
    }

    this.element.parentNode.insertBefore(buttonsWrapper, this.element.nextSibling);
    buttonsWrapper.classList.add('gpt-buttons-wrapper');
    buttonsWrapper.classList.add('tinymce-buttons');
    buttonsWrapper.style.display = 'none';

    this.#setupFocusHandling(buttonsWrapper);
  }

  #setupFocusHandling(buttonsWrapper) {
    let isInteractingWithButtons = false;

    const handleFocus = () => {
      const hasFocus = (this.element.classList.contains('tox-edit-focus') || 
                       this.iframe.contentDocument.body.classList.contains('mce-edit-focus')) || 
                       isInteractingWithButtons;
      buttonsWrapper.style.display = hasFocus ? 'flex' : 'none';
    };

    if (this.element.classList.contains('tox-tinymce')) {
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
    } else {
      this.iframe.contentDocument.addEventListener('focus', () => {
        this.iframe.contentDocument.body.classList.add('mce-edit-focus');
        handleFocus();
      }, true);

      this.iframe.contentDocument.addEventListener('blur', (event) => {
        const isClickInButtons = buttonsWrapper.contains(event.relatedTarget);
        
        if (!isClickInButtons && !isInteractingWithButtons) {
          this.iframe.contentDocument.body.classList.remove('mce-edit-focus');
          handleFocus();
        }
      }, true);
    }

    buttonsWrapper.addEventListener('mouseenter', () => {
      isInteractingWithButtons = true;
      handleFocus();
    });

    buttonsWrapper.addEventListener('mouseleave', (event) => {
      isInteractingWithButtons = false;
      const isFocusInEditor = this.iframe.contentDocument.activeElement === this.iframe.contentDocument.body;
      
      if (!isFocusInEditor) {
        if (this.element.classList.contains('tox-tinymce')) {
          this.element.classList.remove('tox-edit-focus');
        } else {
          this.iframe.contentDocument.body.classList.remove('mce-edit-focus');
        }
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
      
      const firstChild = body.firstElementChild || body;
      return firstChild.innerHTML.trim();
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

      let firstChild = body.firstElementChild;
      if (!firstChild) {
        firstChild = this.iframe.contentDocument.createElement('p');
        body.appendChild(firstChild);
      }

      firstChild.innerHTML = cleanContent;
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
    if (element.closest('.tox-edit-area__iframe') || element.closest('iframe[id$="_ifr"]')) {
      const textarea = TinyMCEAdapter.getTextareaFromIframe(element);
      if (!textarea) return false;
      element = textarea;
    }

    try {
      const modernTinyMCE = element.nextElementSibling?.classList.contains('tox-tinymce');
      const iframe = document.getElementById(`${element.id}_ifr`);

      const legacyTinyMCE = !modernTinyMCE && 
                           element.tagName === 'TEXTAREA' &&
                           element.style.display === 'none' && 
                           element.id && 
                           iframe && 
                           !!iframe.closest('.mce-tinymce');

      if (!modernTinyMCE && !legacyTinyMCE) {
        return false;
      }

      let iframeToCheck;
      if (modernTinyMCE) {
        iframeToCheck = element.nextElementSibling.querySelector('.tox-edit-area__iframe');
      } else if (legacyTinyMCE) {
        iframeToCheck = iframe;
      }

      if (!iframeToCheck?.contentWindow) {
        return false;
      }

      const iframeDoc = iframeToCheck.contentDocument || iframeToCheck.contentWindow.document;
      if (!iframeDoc?.body) {
        return false;
      }

      if (modernTinyMCE) {
        return iframeDoc.body.getAttribute('contenteditable') === 'true' &&
               iframeDoc.body.getAttribute('data-id') === element.id;
      } else if (legacyTinyMCE) {
        return iframeDoc.body.classList.contains('mceContentBody') || 
               iframeDoc.body.getAttribute('contenteditable') === 'true' ||
               iframeDoc.designMode.toLowerCase() === 'on';
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  static getTextareaFromIframe(element) {
    // Version moderne
    const modernIframe = element.closest('.tox-edit-area__iframe');
    if (modernIframe) {
      return modernIframe.closest('.tox-tinymce')?.previousElementSibling;
    }

    // Version legacy (TinyMCE 4 ou mceEditor)
    const legacyIframe = element.closest('iframe[id$="_ifr"]') || 
                        element.closest('#tinymce,iframe.mceEditorIframe');
    if (legacyIframe) {
      const parentId = legacyIframe.id?.replace('_ifr', '') || 
                      legacyIframe.closest('[id$="_parent"]')?.id.replace('_parent', '');
      return document.getElementById(parentId);
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
    // Pour la version moderne
    if (this.element?.classList.contains('tox-tinymce')) {
      return this.element.nextElementSibling?.classList.contains('gpt-buttons-wrapper') ? 
        this.element.nextElementSibling : null;
    }
    
    // Pour la version legacy
    if (this.element?.classList.contains('mce-tinymce')) {
      return this.element.nextElementSibling?.classList.contains('gpt-buttons-wrapper') ? 
        this.element.nextElementSibling : null;
    }

    // Fallback
    return this.textarea.nextElementSibling?.nextElementSibling;
  }
} 