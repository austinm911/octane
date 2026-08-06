import { createCSSStyleSheet } from './dom';

/**
 * W3C spec:
 *
 * In CSS, identifiers (including element names, classes, and IDs in selectors)
 * can contain only the characters [a-z0-9] and ISO 10646 characters U+00A0 and
 * higher, plus the hyphen (-) and the underscore (_); they cannot start with a
 * digit, or a hyphen followed by a digit. Identifiers can also contain escaped
 * characters and any ISO 10646 character as a numeric code (see next item).
 *
 * For instance, the identifier "B&W?" may be written as "B&W?" or "B\26 W\3F".
 *
 * Reference: https://stackoverflow.com/questions/448981/which-characters-are-valid-in-css-class-names-selectors
 */
const IDENTIFIER_REGEX = new RegExp('[_a-zA-Z]+[_a-zA-Z0-9-]*', 'g');
const CLASS_NAME_REGEX = new RegExp(`\\.${IDENTIFIER_REGEX.source}`, 'g');

/**
 * Of the format @IDENFIFIER (RULE) { }
 *
 * Only catches the media and supports identifiers.
 *
 * Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
 */
const CONDITION_RULE_REGEX = new RegExp(
  `^\\s*(@(?:media|supports)[^{]*){(.*)}\\s*$`
);

export function transformClassSelectors(
  css: string,
  transform: (className: string) => string
): string {
  return css.replace(CLASS_NAME_REGEX, (className: string) => {
    return '.' + transform(className.slice(1));
  });
}

/**
 * Returns a version of the CSS string with each class name transformed
 * by {@link transform}.
 *
 * The main reason why this function exists is to allow for CSS class
 * encapsulation without Shadow DOM.
 */
export function transformCSSClassRules(
  text: string,
  transform: (className: string) => string
): string {
  // Create a CSSStyleSheet so we can traverse the CSS rules,
  // without having to parse ourselves.
  const sheet = createCSSStyleSheet(text);
  const rules = sheet.cssRules;

  /**
   * No guarantees of in-place mutation.
   */
  function transformCSSRule(rule: CSSRule): string {
    /**
     * [CSSStyleRule](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleRule)
     * represents a single CSS declaration block, like `h1 { color: red; }`.
     *
     * Make sure to transform the "selector", which in the example above is "h1".
     */
    if (rule instanceof CSSStyleRule) {
      const selector = transformClassSelectors(rule.selectorText, transform);
      return `${selector} { ${rule.style.cssText} }`;
    }

    /**
     * Condition-rules are like `@media print { ... }`, or `@supports (display: grid) { ... }`.
     *
     * This should be covered by [CSSConditionRule](https://developer.mozilla.org/en-US/docs/Web/API/CSSConditionRule)
     * however browser support for CSSConditionRule is not great: namely, Safari
     * versions earlier than 14.1 (early 2021) do not support it.
     *
     * Because of this, we need to traverse the text of the at-rule with
     * a regular expression.
     *
     * Useful helper: https://regexr.com/
     */
    const atRule = CONDITION_RULE_REGEX.exec(rule.cssText.split('\n').join(''));
    if (atRule && atRule.length > 2) {
      const rule = atRule[1];
      const contents = atRule[2];

      // Recursively transform the contents of the at-rule.
      return `${rule} { ${transformCSSClassRules(contents, transform)} }`;
    }

    /**
     * Otherwise, just pass through fonts, animations, etc...
     */
    return rule.cssText;
  }

  // Construct a new CSS string by traversing the rules and serializing
  // them to a string.
  let style = '';
  for (const rule of Array.from(rules)) {
    style += transformCSSRule(rule) + '\n\n';
  }

  return style.trim();
}

/**
 * Manipulates {@param content} in place, with each class attribute transformed
 * by {@link transform}.
 *
 * The main reason why this function exists is to allow for CSS class
 * encapsulation without Shadow DOM.
 */
export function transformDOMClassAttributes(
  content: HTMLElement,
  transform: (className: string) => string
): HTMLElement {
  // Perform the transformation on each class attribute in-place,
  // on the clone.
  const elements = Array.from(content.querySelectorAll('[class]'));
  // Add the current node!
  elements.push(content);

  for (const element of elements) {
    const { classList } = element;
    for (const className of Array.from(classList)) {
      classList.remove(className);
      classList.add(transform(className));
    }
  }

  // Return the element.
  return content;
}
