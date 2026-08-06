import closeIcon from './icons/close.svg';
import questionIcon from './icons/question.svg';
import markerIcon from './icons/marker.svg';
import streetIcon from './icons/street.svg';
import addressMarkerIcon from './icons/addressMarker.svg';
import searchIcon from './icons/search.svg';

import { version } from '../package.json';
const styleToggleSatelliteImg = `https://api.mapbox.com/search-js/v${version}/img/style-toggle-satellite.jpg`;
const styleToggleDefaultImg = `https://api.mapbox.com/search-js/v${version}/img/style-toggle-default.jpg`;

/**
 * Reference:
 * https://getbootstrap.com/docs/5.0/layout/breakpoints/
 */
export const MOBILE_BREAKPOINT = 768 - 1;
const MOBILE_MEDIA_QUERY = `@media only screen and (max-width: ${MOBILE_BREAKPOINT}px)`;

/**
 * Currently, the only expression supported is
 * `['mobile', mobile_value, tablet_and_desktop_value]`.
 *
 * @typedef Expression
 */
type Expression = ['mobile', string, string];

/**
 * `ThemeVariables` are a collection of CSS variables that style Control Theme API
 * elements.
 *
 * @typedef ThemeVariables
 */
export interface ThemeVariables {
  /** @section {Sizing} */

  /**
   * Unit is the base font size and can be referenced in other variables as multiples of `1em`.
   *
   * Analogous to [`font-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size).
   */
  unit?: string | Expression;
  /**
   * Unit header is a derivative of `unit` and is used for modal headers.
   *
   * Analogous to [`font-size`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-size).
   */
  unitHeader?: string | Expression;

  /**
   * Minimum width of elements such as modals and listboxes.
   *
   * Analogous to CSS [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length).
   */
  minWidth?: string;
  /**
   * Spacing between items in an element.
   *
   * Analogous to CSS [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length).
   */
  spacing?: string;
  /**
   * Padding of items in an element.
   *
   * Analogous to CSS [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length).
   */
  padding?: string;
  /**
   * Padding of powered by mapbox label in footer of search listbox.
   *
   * Analogous to CSS [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length).
   */
  paddingFooterLabel?: string;
  /**
   * Padding for contents of modal elements.
   *
   * Analogous to CSS [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length).
   */
  paddingModal?: string;

  /** @section {Colors} */

  /**
   * Color of the primary text.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: dark gray
   */
  colorText?: string;
  /**
   * Color of the primary accent color.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: variant of blue
   */
  colorPrimary?: string;
  /**
   * Color of the secondary accent color.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: blue-gray
   */
  colorSecondary?: string;

  /**
   * Background color for elements such as modals and listboxes.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: white
   */
  colorBackground?: string;
  /**
   * Background color for items on hover.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: light gray
   */
  colorBackgroundHover?: string;
  /**
   * Background color for items on press.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: dark gray
   */
  colorBackgroundActive?: string;

  /**
   * Backdrop color of body content behind modals.
   *
   * Analogous to CSS [`color`](https://developer.mozilla.org/en-US/docs/Web/CSS/color).
   * **Default**: black with alpha value
   */
  colorBackdrop?: string;

  /** @section {Borders and box shadows} */

  /**
   * Border color of elements such as modals and listboxes.
   *
   * Analogous to CSS [`border`](https://developer.mozilla.org/en-US/docs/Web/CSS/border).
   */
  border?: string;
  /**
   * Border radius of elements such as modals and listboxes.
   *
   * Analogous to CSS [`border-radius`](https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius).
   */
  borderRadius?: string;
  /**
   * Box shadow of elements such as modals and listboxes.
   *
   * Analogous to CSS [`box-shadow`](https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow).
   */
  boxShadow?: string;

  /** @section {Typography} */

  /**
   * Line height.
   *
   * Analogous to CSS [`line-height`](https://developer.mozilla.org/en-US/docs/Web/CSS/line-height).
   * **Default**: 1.2
   */
  lineHeight?: string;
  /**
   * Font family.
   *
   * Analogous to CSS [`font-family`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family).
   * **Default**: Sans-serif [system font stack](https://systemfontstack.com/)
   */
  fontFamily?: string;
  /**
   * Font weight for body text.
   *
   * Analogous to CSS [`font-weight`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight).
   * **Default**: normal
   */
  fontWeight?: string;
  /**
   * Font weight for subheadings.
   *
   * Analogous to CSS [`font-weight`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight).
   * **Default**: 600
   */
  fontWeightSemibold?: string;
  /**
   * Font weight for headings and item titles.
   *
   * Analogous to CSS [`font-weight`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight).
   * **Default**: bold
   */
  fontWeightBold?: string;

  /** @section {Transitions} */

  /**
   * The duration to use for listbox animations.
   *
   * Analogous to CSS [`<time>`](https://developer.mozilla.org/en-US/docs/Web/CSS/time).
   * **Default**: `150ms`
   */
  duration?: string;
  /**
   * The timing function to use for listbox animations.
   *
   * Analogous to CSS [`<easing-function>`](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function).
   * **Default**: `ease-out`
   */
  curve?: string;
}

/**
 * `ThemeIcons` are [SVG icons](https://developer.mozilla.org/en-US/docs/Web/SVG)
 * that are used in Control Theme API elements.
 *
 * Roughly, icon names and their defaults are the same as
 * [Mapbox's Assembly](https://labs.mapbox.com/assembly/icons/).
 *
 * Values must be valid SVG plain-text. Unless otherwise noted,
 * icons should be 18px in size and have appropriate dimensions set.
 *
 * Icons can also be filled with 'currentColor'.
 *
 * @typedef ThemeIcons
 * @example
 * ```typescript
 * const icons = {
 *   close: `
 * <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
 * <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
 *   <path fill-rule="evenodd" clip-rule="evenodd" d="M3.79289 3.79289C4.18342 3.40237 4.81658 3.40237 5.20711 3.79289L9 7.58579L12.7929 3.79289C13.1834 3.40237 13.8166 3.40237 14.2071 3.79289C14.5976 4.18342 14.5976 4.81658 14.2071 5.20711L10.4142 9L14.2071 12.7929C14.5976 13.1834 14.5976 13.8166 14.2071 14.2071C13.8166 14.5976 13.1834 14.5976 12.7929 14.2071L9 10.4142L5.20711 14.2071C4.81658 14.5976 4.18342 14.5976 3.79289 14.2071C3.40237 13.8166 3.40237 13.1834 3.79289 12.7929L7.58579 9L3.79289 5.20711C3.40237 4.81658 3.40237 4.18342 3.79289 3.79289Z" fill="currentColor"/>
 * </svg>
 * `
 * }
 * ```
 */
export interface ThemeIcons {
  /**
   * Close icon.
   */
  close?: string;
  /**
   * Question mark icon.
   */
  question?: string;

  /**
   * Icon for map markers. Can be any size.
   */
  marker?: string;

  /**
   * Icon for streets results in search list box.
   */
  street?: string;

  /**
   * Icon for address results in search list box.
   */
  addressMarker?: string;

  /**
   * Icon for Search Box input.
   */
  search?: string;
}

/**
 * `ThemeImages` are raster images that are used in Control Theme API elements.
 *
 * There are currently only two images, "toggle default" and "toggle satellite,"
 * which specify images for a Map/Satellite toggle button.
 *
 * Values must be valid URLs accessible by the expected browser environment. [Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs)
 * and [Blob URLs](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL) are also supported.
 *
 * @typedef ThemeImages
 */
export interface ThemeImages {
  /**
   * Image for the "Map" of the Map/Satellite toggle button.
   */
  styleToggleDefault?: string;
  /**
   * Image for the "Satellite" of the Map/Satellite toggle button.
   */
  styleToggleSatellite?: string;
}

/**
 * The Control Theme API is a way to apply your own design system to
 * Mapbox Search JS Web elements.
 *
 * Control themes use a combination of CSS variables, custom scoped CSS, and
 * SVG icons.
 *
 * @typedef Theme
 * @example
 * ```typescript
 * const theme = {
 *   variables: {
 *     fontFamily: 'Avenir, sans-serif',
 *     unit: '14px',
 *     padding: '0.5em',
 *     borderRadius: '0',
 *     boxShadow: '0 0 0 1px silver',
 *   }
 * };
 *
 * autofill({ theme });
 * ```
 */
export interface Theme {
  /**
   * CSS variables to be applied to the control.
   */
  variables?: ThemeVariables;
  /**
   * SVG icon overrides to be applied to the control.
   */
  icons?: ThemeIcons;
  /**
   * Raster image URLs to be applied to the control.
   */
  images?: ThemeImages;
  /**
   * Optional CSS text to be inserted into Scoped CSS elements. As such, any
   * CSS will not interact with the rest of the page.
   *
   * TODO: Class names are element-specific and have yet to be standardized. Breaking
   * changes are likely and will be flagged in CHANGELOG.md.
   */
  cssText?: string;
}

const DEFAULT_THEME: Theme = {
  variables: {
    // Added as font size on container, so em references this value.
    unit: ['mobile', '16px', '14px'],
    unitHeader: ['mobile', '24px', '18px'],

    minWidth: 'min(300px, 100vw)',
    spacing: '0.75em',
    padding: '0.5em 0.75em',
    paddingFooterLabel: '0.5em 0.75em',
    paddingModal: '1.25em',

    colorText: 'rgba(0, 0, 0, 0.75)',
    colorPrimary: '#4264FB',
    colorSecondary: '#667F91',

    colorBackground: '#fff',
    colorBackgroundHover: '#f5f5f5',
    colorBackgroundActive: '#f0f0f0',

    colorBackdrop: 'rgba(102, 127, 145, 0.3)',

    border: 'none',

    borderRadius: '4px',
    boxShadow: `
      0 0 10px 2px rgba(0, 0, 0, 0.05),
      0 0 6px 1px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(0, 0, 0, 0.1)
    `,

    lineHeight: '1.2em',
    /**
     * Reference:
     * https://systemfontstack.com/
     */
    fontFamily: `
      -apple-system, BlinkMacSystemFont,
      avenir next, avenir,
      segoe ui,
      helvetica neue, helvetica,
      Ubuntu, roboto, noto, arial, sans-serif
    `,
    fontWeight: 'normal',
    fontWeightSemibold: '600',
    fontWeightBold: 'bold',

    duration: '150ms',
    curve: 'ease-out'
  },
  icons: {
    close: closeIcon,
    question: questionIcon,
    marker: markerIcon,
    street: streetIcon,
    addressMarker: addressMarkerIcon,
    search: searchIcon
  },
  images: {
    styleToggleDefault: styleToggleDefaultImg,
    styleToggleSatellite: styleToggleSatelliteImg
  }
};

type CSSText = string;

/**
 * Applies {@link Theme} to the given HTML element as CSS variables
 * in the style attribute.
 */
export function getThemeCSS(rootSelector: string, theme: Theme = {}): CSSText {
  const variables = {
    // Make sure to shallow apply default variables.
    ...DEFAULT_THEME.variables,
    ...(theme.variables || {})
  };

  let cssText = theme.cssText || '';
  let rootVariables = '';

  for (const [key, value] of Object.entries(variables)) {
    // Is a literal, not an expression.
    if (!Array.isArray(value)) {
      rootVariables += `--${key}: ${value};`;
      continue;
    }

    // Is an expression; only support "mobile" for now.
    if (value[0] !== 'mobile') {
      const valueStr = JSON.stringify(value);
      throw new Error(
        `Unsupported expression in theme variables: ${key} ${valueStr}`
      );
    }

    const [, mobileValue, desktopValue] = value;

    // On mobile, force the mobile value.
    cssText += `${MOBILE_MEDIA_QUERY} { ${rootSelector} { --${key}: ${mobileValue} !important; } }`;
    // Our default is still the desktop value.
    rootVariables += `--${key}: ${desktopValue};`;
  }

  return cssText + `${rootSelector} { ${rootVariables} }`;
}

export function getIcon<I extends keyof Theme['icons']>(
  iconName: I,
  theme: Theme = {}
): string | undefined {
  const icons = {
    ...DEFAULT_THEME.icons,
    ...(theme.icons || {})
  };

  const svgString = icons[iconName];
  return svgString;
}

export function getImage<I extends keyof Theme['images']>(
  imageName: I,
  theme: Theme = {}
): string | undefined {
  const images = {
    ...DEFAULT_THEME.images,
    ...(theme.images || {})
  };

  const imgString = images[imageName];
  return imgString;
}
