import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, DeliverTxResponse, SignerData, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse, Method } from "@cosmjs/tendermint-rpc";
import { Tx } from "@demex-sdk/codecs";
import { DemexSigner } from "./signer";
import { WalletError } from "./constant";

export type BroadcastTxMode = Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit;

export type BroadcastTxResult = DeliverTxResponse | BroadcastTxSyncResponse | BroadcastTxAsyncResponse;

export interface PromiseHandler<T> {
  requestId?: string;
  resolve: (result: T) => void;
  reject: (reason?: any) => void;
}

export interface WalletAccount extends Account {
  sequenceInvalidated: boolean
}

export interface SigningData extends SignTxRequest {
  signer: DemexSigner
  signingClient: SigningStargateClient,
}

export interface SignTxRequest {
  reattempts?: number;
  messages: readonly EncodeObject[];
  broadcastOpts?: BroadcastTxOpts;
  signOpts?: SignTxOpts;
  handler: PromiseHandler<BroadcastTxResult>;
}

export interface BroadcastTxRequest extends SignTxRequest {
  signerAddress: string;
  signedTx: Tx.TxRaw;
}


export interface TxOverrides {
  fee?: StdFee;
  feeDenom?: string;
  feeGranter?: string;
  timeoutHeight?: number;
  memo?: string;
}
export interface SignTxOpts {
  tx?: TxOverrides;
  signer?: Partial<SignerData>;
  bypassGrantee?: boolean;
}

export interface BroadcastTxOpts {
  mode?: BroadcastTxMode;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export type SignAndBroadcastOpts = Partial<SignTxOpts & BroadcastTxOpts>;

export enum ErrorType {
  SignatureRejection = "signature_rejection",
  BroadcastFail = "broadcast_fail",
  BlockFail = "block_fail",
}
export class DemexBroadcastError extends WalletError {
  readonly type?: ErrorType
  readonly data?: any
  constructor(msg: string, type?: ErrorType, data?: any) {
    super(msg);
    this.type = type
    this.data = data
  }
}

