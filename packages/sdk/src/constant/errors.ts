import { PackageError } from "@demex-sdk/core";

export class SdkError extends PackageError {
  constructor(msg: string) {
    super('sdk', msg);
  }
}
