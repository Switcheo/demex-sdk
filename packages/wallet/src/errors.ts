import { PackageError } from "@demex-sdk/core";

export class WalletError extends PackageError {
  constructor(msg: string) {
    super('wallet', msg);
  }
}
