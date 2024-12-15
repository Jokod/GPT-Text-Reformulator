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
    if (!matchingAdapter) return null;

    return this.#instantiateAdapter(matchingAdapter, element);
  }

  static async #findMatchingAdapter(element) {
    for (const Adapter of this.#adapters) {
      if (await Adapter.matches(element)) {
        return Adapter;
      }
    }
    return null;
  }

  static async #instantiateAdapter(Adapter, element) {
    const adapter = new Adapter(element);
    await adapter.initialize?.();
    return adapter;
  }

  static async isSupported(element) {
    return await this.#adapters.some(adapter => adapter.matches(element));
  }
} 