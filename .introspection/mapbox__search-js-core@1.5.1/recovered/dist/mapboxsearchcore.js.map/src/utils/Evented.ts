/**
 * `Evented` mixes methods into other classes for event capabilities.
 *
 * If you are an end-user, you will most likely use these methods through
 * classes like {@link SearchSession}.
 *
 * For lists of events you can listen for, see API documentation for
 * specific classes.
 *
 * @class Evented
 */
export class Evented<T> {
  #listeners: Partial<{
    [key in keyof T]: ((arg0: T[key]) => void)[];
  }> = {};

  /**
   * Adds a listener to a specified event type.
   *
   * @param type - The event type to add a listen for.
   * @param listener - The function to be called when the event is fired.
   */
  addEventListener<K extends keyof T>(
    type: K,
    listener: (arg0: T[K]) => void
  ): void {
    const listenersArr = this.#listeners;

    // Create listener if doesn't already exist.
    if (!listenersArr[type]) {
      listenersArr[type] = [];
    }

    listenersArr[type].push(listener);
  }

  /**
   * Removes a previously registered event listener.
   *
   * @param type - The event type to remove listeners for.
   * @param listener - The listener function to remove.
   */
  removeEventListener<K extends keyof T>(
    type: K,
    listener: (arg0: T[K]) => void
  ): void {
    const listenersArr = this.#listeners;

    // If a type doesn't exist, return early.
    if (!listenersArr[type]) {
      return;
    }

    const listeners = listenersArr[type];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  fire<K extends keyof T>(type: K, arg0: T[K]): void {
    const listenersArr = this.#listeners;

    // If a type doesn't exist, return early.
    if (!listenersArr[type]) {
      return;
    }

    const listeners = listenersArr[type];
    for (const listener of listeners) {
      listener(arg0);
    }
  }
}
