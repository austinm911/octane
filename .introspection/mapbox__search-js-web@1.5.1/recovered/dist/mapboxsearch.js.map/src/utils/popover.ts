import {
  computePosition,
  autoUpdate,
  ComputePositionConfig,
  flip,
  offset
} from '@floating-ui/dom';

/**
 * Options controlling the display of the Popover used in {@link AddressAutofill}, {@link MapboxSearchBox}, and {@link MapboxGeocoder}.
 * @typedef PopoverOptions
 */
export interface PopoverOptions {
  /**
   * Positions the popover above or below the reference element. Defaults to 'bottom-start'.
   */
  placement: 'top-start' | 'bottom-start';
  /**
   * If true, the popover will flip to the opposite side of the reference element to try to keep it in view when scrolling out of frame. Defaults to false.
   */
  flip: boolean;
  /**
   * The distance gap between the popover and the reference element. Defaults to 5px.
   */
  offset: number;
}

/**
 * Wrapper around floating-ui controls to manage popover positioning and lifecycle.
 */
export class Popover {
  /**
   * The element around which the popover is positioned, e.g. the `<input>` search box
   */
  referenceEl: HTMLElement;
  /**
   * The floating popover element, e.g. the results box
   */
  floatingEl: HTMLElement;

  #options: PopoverOptions;

  /**
   * Cleans up the popover instance and any side effects
   */
  destroy: () => void;

  #defaultOptions: PopoverOptions = {
    placement: 'bottom-start',
    flip: false,
    offset: 10
  };

  constructor(
    referenceEl: HTMLElement,
    floatingEl: HTMLElement,
    options?: Partial<PopoverOptions>
  ) {
    this.referenceEl = referenceEl;
    this.floatingEl = floatingEl;
    this.#options = { ...this.#defaultOptions, ...options };
    this.destroy = autoUpdate(this.referenceEl, this.floatingEl, this.update);
  }

  /**
   * Positioning options for the popover element.
   */
  get options(): PopoverOptions {
    return this.#options;
  }
  set options(newOptions: Partial<PopoverOptions>) {
    this.#options = { ...this.#options, ...newOptions };
  }

  /**
   * Recomputes the popover position one time
   */
  update = async (): Promise<void> => {
    const config: Partial<ComputePositionConfig> = {
      placement: this.options.placement,
      middleware: [
        offset(this.options.offset),
        this.options.flip && flip()
      ].filter(Boolean)
    };
    const { x, y } = await computePosition(
      this.referenceEl,
      this.floatingEl,
      config
    );
    Object.assign(this.floatingEl.style, {
      left: `${x}px`,
      top: `${y}px`
    });
  };
}
