import { AminoMsg, StdSignDoc } from "@cosmjs/amino";
import { StdFee } from "@cosmjs/stargate";

type MsgSignData = {
  // cosmos bech32
  signer: string
  // base64 encoded
  data: string
}
export const constructAdr36SignDoc = (address: string, message: string): StdSignDoc => {
  const msgSignData: MsgSignData = constructMsgSignData(address, message)
  const msgs: AminoMsg[] = [{ type: 'sign/MsgSignData', value: msgSignData }]
  const fee: StdFee = {
    gas: '0',
    amount: [],
  }
  const signDoc: StdSignDoc = {
    chain_id: '',
    account_number: '0',
    sequence: '0',
    fee,
    msgs,
    memo: '',
  }
  return signDoc
}

const constructMsgSignData = (address: string, message: string): MsgSignData => {
  return { signer: address, data: Buffer.from(message).toString('base64') }
}

export class QueueManager<T = void, V = void> {
  triggerDelay: number;
  maxDelayThreshold: number;

  currTriggerThreshold: number = 0;
  currQueueTrigger: NodeJS.Timeout | null = null;

  isProcessingQueue: boolean = false;

  private queue: T[] = [];

  constructor(private readonly processor: (input: T) => V, options: QueueManager.Options = {}) {
    this.triggerDelay = options.triggerDelay ?? 300;
    this.maxDelayThreshold = options.maxDelayThreshold ?? 1000;
  }

  public enqueue(task: T, skipTrigger = false) {
    this.queue.unshift(task);
    if (!skipTrigger) this.trigger();
  }

  public trigger() {
    const currentTimeMillis = new Date().getTime();

    // do not shift delay later if next schedule
    if (this.currTriggerThreshold && currentTimeMillis + this.triggerDelay > this.currTriggerThreshold) {
      return;
    }

    if (!this.currTriggerThreshold && this.maxDelayThreshold > 0) {
      this.currTriggerThreshold = currentTimeMillis + this.maxDelayThreshold; // max wait for 1s before dispatching queue
    }

    clearTimeout(this.currQueueTrigger as unknown as number);

    this.currQueueTrigger = setTimeout(this.process.bind(this), this.triggerDelay);
  }

  private async process() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true; // activate sync lock
    this.currTriggerThreshold = 0; // reset to 0

    try {
      while (this.queue.length) {
        const item = this.queue.pop()!;
        try {
          await this.processor(item);
        } catch (error) {
          console.error("queue manager process item failed");
          console.error(error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
}
export namespace QueueManager {
  export interface Options {
    triggerDelay?: number;
    maxDelayThreshold?: number;
  }
}
