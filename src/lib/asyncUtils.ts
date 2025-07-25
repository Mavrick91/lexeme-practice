export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError = "Operation timed out"
): Promise<T> => {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Race between the original promise and the abort signal
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new Error(timeoutError));
        });
      }),
    ]);

    return result;
  } finally {
    // Always clean up the timeout
    clearTimeout(timeoutId);
  }
};
