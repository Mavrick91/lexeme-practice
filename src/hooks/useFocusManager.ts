import { useRef, useCallback, useEffect } from "react";

export const useFocusManager = () => {
  const elementRef = useRef<HTMLTextAreaElement>(null);
  const shouldFocusRef = useRef(true);

  const focus = useCallback(() => {
    if (elementRef.current && shouldFocusRef.current) {
      elementRef.current.focus();
    }
  }, []);

  const maintainFocus = useCallback(() => {
    shouldFocusRef.current = true;
    // Use requestAnimationFrame for next-tick focusing
    requestAnimationFrame(focus);
  }, [focus]);

  const releaseFocus = useCallback(() => {
    shouldFocusRef.current = false;
  }, []);

  // Maintain focus on any blur event if shouldFocusRef is true
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleBlur = () => {
      if (shouldFocusRef.current) {
        // Re-focus if we should maintain focus
        requestAnimationFrame(() => {
          if (shouldFocusRef.current && document.activeElement !== element) {
            element.focus();
          }
        });
      }
    };

    element.addEventListener("blur", handleBlur);
    return () => {
      element.removeEventListener("blur", handleBlur);
    };
  }, []);

  return {
    ref: elementRef,
    focus,
    maintainFocus,
    releaseFocus,
  };
};
