<<<<<<< HEAD
import * as BIP39 from "bip39";
import * as wif from "wif";

=======
>>>>>>> staging
/**
 * Convenience function to coalesce a string/buffer into a buffer
 *
 * @param stringOrBuffer a string or buffer type
 * @param encoding BufferEncoding from Buffer
 * @param force option to return an empty buffer regardless of input
 */
export const stringOrBufferToBuffer = (
  stringOrBuffer?: string | Buffer,
  encoding: BufferEncoding = "hex",
  force: boolean = false
): Buffer | null => {
  if (typeof stringOrBuffer === "string") {
    return Buffer.from(stringOrBuffer, encoding);
  }

  if (stringOrBuffer instanceof Buffer) {
    return stringOrBuffer as Buffer;
  }

  // not a string nor buffer
  // e.g. null/undefined
  if (force) {
    return Buffer.alloc(0);
  }

  // if not forcing to return an empty buffer, return null
  return null;
};

export class BIP44Path {
  constructor(
    public purpose: number = 44,
    public coinType: number = 118, // cosmos
    public account: number = 0,
    public change: number = 0,
    public index: number = 0
  ) {
    this.update();
  }

  static generateBIP44String(index: number = 0, change: number = 0, account: number = 0, coinType: number = 118, purpose: number = 44) {
    return `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;
  }

  update(
    index: number = this.index,
    change: number = this.change,
    account: number = this.account,
    coinType: number = this.coinType,
    purpose: number = this.purpose
  ): BIP44Path {
    this.index = index;
    this.change = change;
    this.account = account;
    this.coinType = coinType;
    this.purpose = purpose;

    return this;
  }

  toArray(): number[] {
    return [this.purpose, this.coinType, this.account, this.change, this.index];
  }

  generate(): string {
    return BIP44Path.generateBIP44String(this.index, this.change, this.account, this.coinType, this.purpose);
  }
}

export const randomMnemonic = () => {
  return BIP39.generateMnemonic();
};

export const wifEncodePrivateKey = (privateKey: string | Buffer, iter: number = 128) => {
  const privateKeyBuf = stringOrBufferToBuffer(privateKey)!;
  return wif.encode(iter, privateKeyBuf, true);
};

export const stripHexPrefix = (input: string) => {
  return input?.slice(0, 2) === "0x" ? input.slice(2) : input;
};

export const appendHexPrefix = (input: string) => {
  return input?.slice(0, 2) === "0x" ? input : `0x${input}`;
};