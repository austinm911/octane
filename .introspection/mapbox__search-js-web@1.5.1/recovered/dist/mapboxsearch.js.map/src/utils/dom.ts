/**
 * Used below in {@link createCSSStyleSheet}.
 */
const subdoc = document.implementation.createHTMLDocument();

export function bindElements<
  Binding extends { [key: string | symbol | number]: Element }
>(root: Element, elements: { [key in keyof Binding]: string }): Binding {
  const binding: Binding = {} as Binding;
  for (const [key, selector] of Object.entries(elements)) {
    binding[key as keyof Binding] = root.querySelector(selector);
  }

  return binding;
}

/**
 * Gets all child elements for a given node.
 */
export function getChildElements(node: Node): HTMLElement[] {
  return Array.from(node.childNodes || []).filter(
    (el) => el.nodeType === Node.ELEMENT_NODE
  ) as HTMLElement[];
}

/**
 * Creates an HTML element from a string and returns it.
 */
export function createElementFromString<T extends Element>(
  innerHTML: string
): T {
  const template = document.createElement('template');
  template.innerHTML = innerHTML;
  return template.content.firstElementChild as T;
}

/**
 * Returns a {@link CSSStyleSheet} that can be used to traverse a
 * CSS file.
 *
 * NOTE: We need to use a sub-document to avoid the styles being
 * applied to the current page.
 */
export function createCSSStyleSheet(text: string): CSSStyleSheet {
  const style = subdoc.createElement('style');
  style.textContent = text;
  subdoc.head.appendChild(style);
  return style.sheet;
}

/**
 * Returns if the property has "display: none" set on itself.
 *
 * Reference: https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
 */
export function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none';
}

export type InputFormElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

type ReactInputEvent = Event & {
  simulated: boolean;
};

type ReactInputWrapperState = InputFormElement & {
  _valueTracker?: {
    getValue: () => string;
    setValue: (value: string) => void;
    stopTracking: () => void;
  };
};

/**
 * Sets the value of the given input element and triggers an `input` event.
 *
 * This should also work for React, which overrides the `value` setter with
 * a custom tracker. Due to this, a naive `input.value = value` will not
 * work correctly in React.
 *
 * Reference: https://github.com/facebook/react/blob/c88fb49d37fd01024e0a254a37b7810d107bdd1d/packages/react-dom/src/client/inputValueTracking.js#L53
 * Reference: https://github.com/facebook/react/issues/11488
 */
export function setValue(
  input: InputFormElement | undefined,
  value: string
): void {
  if (!input) {
    return;
  }

  const set = Object.getOwnPropertyDescriptor(
    input.constructor.prototype,
    'value'
  ).set;
  set.call(input, value);

  // Make this work in React 16+.
  const wrapperState = input as ReactInputWrapperState;
  if (wrapperState._valueTracker) {
    wrapperState._valueTracker.setValue('');
  }

  const onInputEvent = new Event('input', {
    bubbles: true
  }) as ReactInputEvent;
  onInputEvent.simulated = true;

  input.dispatchEvent(onInputEvent);

  const onChangeEvent = new Event('change', {
    bubbles: true
  }) as ReactInputEvent;
  onChangeEvent.simulated = true;

  input.dispatchEvent(onChangeEvent);
}

/**
 * Pre-calculate the size of an element, handling cases where the element is not yet rendered
 * @param element - The element to measure
 * @param deep - If true, include node's descendents in calculation. Defaults to false.
 * @returns Object with height and width properties as numbers
 */
export function getElementSize(
  element: HTMLElement,
  deep = false
): {
  height: number;
  width: number;
} {
  let width: number;
  let height: number;
  const elementRect = element.getBoundingClientRect();
  if (
    element.style.display === 'none' ||
    (elementRect.height === 0 && elementRect.width === 0)
  ) {
    const clone = element.cloneNode(deep) as HTMLElement;
    element.parentElement.appendChild(clone);
    clone.style.setProperty('display', 'block', 'important');
    const cloneRect = clone.getBoundingClientRect();
    width = cloneRect.width;
    height = cloneRect.height;
    clone.style.setProperty('display', 'none');
    clone.remove();
  } else {
    width = elementRect.width;
    height = elementRect.height;
  }
  return {
    height: Math.floor(height),
    width: Math.floor(width)
  };
}

/**
 * Adds a style to the current page document for the root CSS from the Mapbox search-js-web package.
 */
export function addDocumentStyle(css: string): void {
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);
}
