export const run = <T = void>(runnable: () => T | Promise<T>) => {
  (async () => runnable())()
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
