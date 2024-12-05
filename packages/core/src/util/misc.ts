export const callIgnoreError = <T = any>(runnable: () => T) => {
  try {
    return runnable();
  } catch (error) {}
};

export type MaybePromise<T> = T | PromiseLike<T>
export type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T
