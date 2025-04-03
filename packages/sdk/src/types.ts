import { EncodeObject } from "@cosmjs/proto-signing";
import { DeliverTxResponse, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse, Method } from "@cosmjs/tendermint-rpc";
import { Cosmos } from "@demex-sdk/codecs";
import { DemexSigner, SignTxOpts } from "@demex-sdk/wallet";
import { SdkError } from "./constant";

export type BroadcastTxMode = Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit;
export type BroadcastTxResult = DeliverTxResponse | BroadcastTxSyncResponse | BroadcastTxAsyncResponse;

export interface PromiseHandler<T> {
  requestId?: string;
  resolve: (result: T) => void;
  reject: (reason?: any) => void;
}

export interface SendTxSignOpts extends SignTxOpts {
  signerAddress?: string
  triggerMerge?: boolean;
  bypassGrantee?: boolean;
}

export interface SignTxRequest {
  signerAddress?: string
  reattempts?: number;
  bypassGrantee?: boolean;
  triggerMerge?: boolean;
  messages: readonly EncodeObject[];
  broadcastOpts?: BroadcastTxOpts;
  signOpts?: SendTxSignOpts;
  handler: PromiseHandler<BroadcastTxResult>;
}
export interface SigningData extends SignTxRequest {
  signer: DemexSigner
}
export interface BroadcastTxRequest extends SigningData {
  signerAddress: string
  signedTx: Cosmos.Tx.TxRaw;
}

export interface BroadcastTxOpts {
  mode?: BroadcastTxMode;
  timeoutMs?: number;
  pollIntervalMs?: number;
}

export enum DemexSignerTypes {
  Ledger = 'Ledger',
  PrivateKey = 'PrivateKey',
  PublicKey = 'PublicKey',
  EIP712 = 'EIP712',
}

export interface TxOverrides {
  fee?: StdFee;
  feeDenom?: string;
  feeGranter?: string;
  timeoutHeight?: number;
  memo?: string;
}

export enum ErrorType {
  SignatureRejection = "signature_rejection",
  BroadcastFail = "broadcast_fail",
  BlockFail = "block_fail",
}
export class DemexBroadcastError extends SdkError {
  readonly type?: ErrorType
  readonly data?: any
  constructor(msg: string, type?: ErrorType, data?: any) {
    super(msg);
    this.type = type
    this.data = data
  }
}

export type OnRequestSignCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void> | void;
export type OnSignCompleteCallback = (signature: Uint8Array | null) => PromiseLike<void> | void;
export type OnBroadcastTxFailCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void> | void;
export type OnBroadcastTxSuccessCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void> | void;

export type SignAndBroadcastOpts = Partial<SignTxOpts & BroadcastTxOpts>;
