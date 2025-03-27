/**
 * Usage example:
 * ```javascript
 * 
 * // this should lock and every call to syncWork()
 * // should wait, and only one "thread" will execute
 * // doSynchronousThings at any one time.
 * 
 * const mutex = new Mutex();
 * function syncWork() {
 *   const release = await mutex.lock();
 * 
 *   try {
 *     doSynchronousThings();
 *   } finally {
 *     release();
 *   }
 * }
 * ```
 * 
 */
export class Mutex {
  private locks: number = 0;
  waiters: (() => boolean)[] = [];

  constructor() { }

  /**
   * begins a synchronised process.
   * 
   * @returns a release function to undo the lock. can only be 
   * used once.
   */
  async lock() {
    // if locks exist, we'll add existing call to waiters queue.
    if (this.locks > 0)
      await this._wait(true);
    else {
      this.locks++;
    }


    // return release function for caller to release lock
    // when job is down. `used` variable keeps track of call
    // so that it will not result in unlocking twice from the
    // same caller.
    let used = false;
    return () => {
      if (used)
        throw new Error("Mutex: release function already utilized, cannot release again.");
      used = true;
      this.unlock();
    }
  }

  /**
   * wait for one lock to resolve without adding to lock queue
   */
  async wait() {
    return this._wait(false);
  }

  /**
   * internal function for releasing locks and resolves the
   * next waiter in line.
   */
  private unlock() {
    this.locks--;

    while (this.locks === 0 && this.waiters.length > 0) {
      const [resolveWaiter] = this.waiters.splice(0, 1);
      const lock = resolveWaiter!();
      if (lock) this.locks++;
    }
  }

  /**
   * waits for a lock to resolve without causing more locks.
   */
  private async _wait(lock: boolean) {
    return new Promise<void>((resolve, reject) => {
      this.waiters.push(() => {
        resolve();
        return lock;
      });
    });
  }
};
