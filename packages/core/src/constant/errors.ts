export class PackageError extends Error {
  constructor(name: string, msg: string) {
    super(`[@demex-sdk/${name}]: ${msg}`);
  }
}

export class CoreError extends PackageError {
  constructor(msg: string) {
    super('core', msg);
  }
}
