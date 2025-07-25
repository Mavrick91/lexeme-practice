import { useLayoutEffect, type MutableRefObject, type DependencyList } from "react";
/**
 * Hook to reliably auto-focus an element when conditions are met.
 * Uses useLayoutEffect to ensure DOM is ready before focusing.
 *
 * @param ref - The ref of the element to focus
 * @param shouldFocus - Whether the element should be focused
 * @param deps - Additional dependencies that should trigger re-focus
 */
export const useAutoFocus = <T extends HTMLElement>(
  ref: MutableRefObject<T | null>,
  shouldFocus: boolean,
  deps: DependencyList = []
) => {
  useLayoutEffect(() => {
    if (!shouldFocus) return;

    const focusElement = () => {
      if (ref.current) {
        ref.current.focus();
      } else {
        // Fallback: try again on next frame if element not ready
        const rafId = requestAnimationFrame(() => {
          ref.current?.focus();
        });

        return () => cancelAnimationFrame(rafId);
      }
    };

    focusElement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFocus, ref, ...deps]);
};
