export interface TypedDataField {
  name: string;
  type: string;
}

export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId: string;
  verifyingContract?: string;
  salt?: string;
}

export interface EIP712Tx {
  readonly types: Record<string, TypedDataField[]>;
  readonly primaryType: string;
  readonly domain: TypedDataDomain;
  readonly message: any;
}