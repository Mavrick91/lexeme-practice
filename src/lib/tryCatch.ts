type Success<T> = [T, null];
type Failure<E> = [null, E];

type Result<T, E = Error> = Success<T> | Failure<E>;

export const tryCatch = async <T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> => {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    // It's generally good practice to know *what* failed.
    // Consider adding more specific error handling or logging here if needed.
    return [null, error as E];
  }
};
