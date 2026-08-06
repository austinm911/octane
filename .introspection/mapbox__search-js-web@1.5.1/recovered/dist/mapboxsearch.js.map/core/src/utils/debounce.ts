/**
 * Version of the classic `debounce` function that accepts a `signalFn`
 * argument, which can return an {@link AbortSignal}.
 */
export function debounce<F extends (...args: unknown[]) => unknown>(
  func: F,
  wait: number,
  signalFn?: () => AbortSignal
): F {
  let timeout = null;

  return ((...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    const signal = signalFn && signalFn();
    timeout = setTimeout(() => {
      timeout = null;
      if (signal?.aborted) {
        return;
      }
      func(...args);
    }, wait);
  }) as F;
}
