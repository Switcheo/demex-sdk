export class PackageError extends Error {
  constructor(name: string, msg: string) {
    super(`[@demex-sdk/${name}]: ${msg}`);
  }
}
