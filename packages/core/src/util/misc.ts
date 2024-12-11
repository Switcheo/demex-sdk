export const callIgnoreError = <T = any>(runnable: () => T) => {
  try {
    return runnable();
  } catch (error) { }
};

export const capitalize = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export type MaybePromise<T> = T | PromiseLike<T>;
export type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T;

