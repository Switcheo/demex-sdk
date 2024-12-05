export const callIgnoreError = <T = any>(runnable: () => T) => {
  try {
    return runnable();
  } catch (error) {}
};

export type MaybePromise<T> = T | PromiseLike<T>
export type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T
export type CastAny<T, CastTo> = IsAny<T, CastTo, T>
export type IsAny<T, True, False = never> = true | false extends (
  T extends never ? true : false
) ? True : False
