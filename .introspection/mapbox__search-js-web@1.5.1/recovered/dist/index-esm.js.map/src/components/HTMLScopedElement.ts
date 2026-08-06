/* eslint-disable custom-elements/expose-class-on-global */
/* eslint-disable custom-elements/define-tag-after-class-definition */
import {
  transformClassSelectors,
  transformCSSClassRules,
  transformDOMClassAttributes
} from '../utils/class_name_transformers';

import { randomValidID } from '../utils';

/**
 * Custom HTML element that uses the "Scoped DOM" approach,
 * which is not really Shadow DOM, but a way to encapsulate CSS classes
 * without Shadow DOM.
 *
 * This is a workaround for the fact that ARIA attributes are identified by
 * IDs, and cannot be shared between Shadow DOM and non-Shadow DOM (Light DOM)
 * elements due to encapsulation.
 *
 * Examples are an <input> element and its corresponding popover.
 *
 * The "Scoped DOM" approach is to encapsulate CSS classes by transforming
 * the class attribute of each element, prefixing each class with a
 * random UUID.
 *
 * Goals of the "Scoped DOM":
 *
 * - Once the [Accessibility Object Model (AOM)](https://wicg.github.io/aom/explainer.html) is finalized,
 *   replace all uses of {@link MapboxHTMLScopedElement} with {@link MapboxHTMLShadowElement}, and use
 *   AOM instead of IDREFs for ARIA attributes.
 *
 * - The Scoped DOM should be self-contained and work well enough that we don't
 *   need to constantly work around it.
 *
 * - The Scoped DOM should have extensive testing.
 */
export class HTMLScopedElement<
  Events extends { [key: number | string | symbol]: Event } = Record<
    string,
    Event
  >
> extends HTMLElement {
  // Seed to use for class name prefixing.
  #seed = randomValidID();

  protected get template(): HTMLTemplateElement {
    return null;
  }

  protected get templateStyle(): string {
    return null;
  }

  protected get templateUserStyle(): string {
    return null;
  }

  #templateUserStyleElement: HTMLStyleElement;

  /**
   * `clonedCallback` should be a part of the Web Components spec, but sadly
   * it is not.
   *
   * This is detected in {@link connectedCallback} below if the seed has changed.
   */
  clonedCallback(oldSeed: string, newSeed: string): void {
    // New transform function that replaces any instances of the old
    // seed with the new one.
    const seedTransform = (className: string) =>
      className.replace(oldSeed, newSeed);

    transformDOMClassAttributes(this, seedTransform);

    const styles = Array.from(this.querySelectorAll<HTMLStyleElement>('style'));
    for (const style of styles) {
      style.textContent = transformClassSelectors(
        style.textContent,
        seedTransform
      );
    }

    // Find and repopulate #templateUserStyleElement.
    if (styles.length) {
      this.#templateUserStyleElement = styles[styles.length - 1];
    }

    // Replace id prefix for all sub-nodes
    const nodesWithId = Array.from(this.querySelectorAll(`[id^="${oldSeed}"]`));
    for (const node of nodesWithId) {
      node.id = node.id.replace(oldSeed, newSeed);
    }
  }

  connectedCallback(): void {
    // Return if we already have children.
    if (this.childElementCount > 0) {
      const oldSeed = this.dataset.seed;
      const newSeed = this.#seed;

      // If we have a different seed than before, say from a clone,
      // then we need to update any templates and styles.
      if (oldSeed && oldSeed !== newSeed) {
        this.clonedCallback(oldSeed, newSeed);

        // Finally, make sure the dataset has the new seed.
        this.dataset.seed = newSeed;
      }

      return;
    }

    this.dataset.seed = this.#seed;

    // Use the Light DOM to contain our inner elements,
    // and do CSS class obfuscation in the "Scoped DOM."
    const template = this.template;
    if (template) {
      const element = this.prepareTemplate(template);
      this.appendChild(element);
    }

    const templateStyle = this.templateStyle;
    if (templateStyle) {
      const style = document.createElement('style');
      style.textContent = this.prepareCSS(templateStyle);
      this.appendChild(style);
    }

    const userStyle = document.createElement('style');
    if (this.templateUserStyle) {
      userStyle.textContent = this.prepareCSS(this.templateUserStyle);
    }
    this.appendChild(userStyle);
    this.#templateUserStyleElement = userStyle;
  }

  /**
   * Transform function for {@link transformCSSClassRules} and
   * {@link transformDOMClassAttributes}.
   */
  #transform = (className: string): string => {
    return `${this.#seed}--${className}`;
  };

  prepareTemplate(template: HTMLTemplateElement): HTMLElement {
    const element = template.content.firstElementChild;
    return transformDOMClassAttributes(
      element.cloneNode(true) as HTMLElement,
      this.#transform
    );
  }

  prepareCSS(css: string): string {
    return transformCSSClassRules(css, this.#transform);
  }

  updateTemplateUserStyle(style: string): void {
    if (!this.#templateUserStyleElement) {
      return;
    }
    this.#templateUserStyleElement.textContent = this.prepareCSS(style);
  }

  querySelector<E extends Element = Element>(selectors: string): E {
    return super.querySelector(
      transformClassSelectors(selectors, this.#transform)
    );
  }

  querySelectorAll<E extends Element = Element>(
    selectors: string
  ): NodeListOf<E> {
    return super.querySelectorAll(
      transformClassSelectors(selectors, this.#transform)
    );
  }

  addEventListener<K extends keyof Events>(
    type: K,
    listener: (this: HTMLFormElement, ev: Events[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener, options);
  }

  removeEventListener<K extends keyof Events>(
    type: K,
    listener: (this: HTMLFormElement, ev: Events[K]) => unknown,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener, options);
  }

  dispatchEvent<K extends keyof Events>(event: Events[K]): boolean {
    return super.dispatchEvent(event);
  }
}
