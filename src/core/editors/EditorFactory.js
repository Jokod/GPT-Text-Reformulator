import { StandardInputAdapter } from './StandardInputAdapter.js';
import { ContentEditableAdapter } from './ContentEditableAdapter.js';
import { TinyMCEAdapter } from './TinyMCEAdapter.js';

export class EditorFactory {
  static #adapters = [
    TinyMCEAdapter,
    StandardInputAdapter,
    ContentEditableAdapter
  ];

  static async createAdapter(element) {
    const matchingAdapter = await this.#findMatchingAdapter(element);
    if (!matchingAdapter) {
      return null;
    }

    return this.#instantiateAdapter(matchingAdapter, element);
  }

  static async #findMatchingAdapter(element) {
    for (const Adapter of this.#adapters) {
      try {
        const matches = await Adapter.matches(element);
        if (matches) {
          return Adapter;
        }
      } catch (error) {
        // Silently continue to next adapter
      }
    }
    return null;
  }

  static async #instantiateAdapter(Adapter, element) {
    try {
      const adapter = new Adapter(element);
      await adapter.initialize?.();
      return adapter;
    } catch (error) {
      return null;
    }
  }

  static async isSupported(element) {
    const adapter = await this.#findMatchingAdapter(element);
    return !!adapter;
  }
} 