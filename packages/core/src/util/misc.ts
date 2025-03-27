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

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}


export const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string")
    return error.message;
  return String(error);
}

export const isAccountNotFoundError = (error: unknown, address: string) => {
  return getErrorMessage(error)?.includes(`account ${address} not found`);
}
export const isNonceMismatchError = (error: unknown) => {
  const matchMessage = "account sequence mismatch";
  const includes = getErrorMessage(error).includes(matchMessage);
  if (includes)
    return error as Error;

  return false
}
