export const callIgnoreError = <T = any>(runnable: () => T) => {
  try {
    return runnable();
  } catch (error) {}
};
