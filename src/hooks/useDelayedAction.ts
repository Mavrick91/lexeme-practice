import { useCallback, useRef, useEffect } from "react";

/**
 * A reusable hook for scheduling delayed actions with automatic cleanup and cancellation.
 *
 * @param delay - The delay in milliseconds before the action is executed
 * @returns A function that schedules an action to be executed after the specified delay
 *
 * @example
 * ```tsx
 * const ADVANCE_DELAY_MS = 2000;
 * const scheduleNext = useDelayedAction(ADVANCE_DELAY_MS);
 *
 * // Schedule an action
 * scheduleNext(() => onNext());
 *
 * // If called again before the delay, the previous action is cancelled
 * scheduleNext(() => onNext()); // This cancels the first and schedules a new one
 * ```
 */
export const useDelayedAction = (delay: number) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const scheduleAction = useCallback(
    (action: () => void) => {
      // Cancel any previously scheduled action
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule the new action
      timeoutRef.current = setTimeout(() => {
        action();
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );

  return scheduleAction;
};
