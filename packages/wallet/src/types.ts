import { EncodeObject } from "@cosmjs/proto-signing";
import { DeliverTxResponse, SignerData, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse, Method } from "@cosmjs/tendermint-rpc";
import { Tx } from "@demex-sdk/codecs";

export type BroadcastTxMode = Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit;

export interface PromiseHandler<T> {
  requestId?: string;
  resolve: (result: T) => void;
  reject: (reason?: any) => void;
}
export interface SignTxRequest {
  signerAddress: string;
  reattempts?: number;
  messages: readonly EncodeObject[];
  broadcastOpts?: BroadcastTxOpts;
  signOpts?: SignTxOpts;
  handler: PromiseHandler<DeliverTxResponse | BroadcastTxSyncResponse | BroadcastTxAsyncResponse>;
}

export interface BroadcastTxRequest extends SignTxRequest {
  signedTx: Tx.TxRaw;
}

export interface DemexSignerData extends SignerData {
  timeoutHeight?: number;
  evmChainId?: string;
}

export interface SignTxOpts {
  fee?: StdFee;
  feeDenom?: string;
  memo?: string;
  sequence?: number;
  accountNumber?: number;
  explicitSignerData?: Partial<DemexSignerData>;
  triggerMerge?: boolean; // stack merge account tx if user account is unmerged
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
export class DemexBroadcastError extends Error {
  readonly type?: ErrorType
  readonly data?: any
  constructor(msg: string, type?: ErrorType, data?: any) {
    super(msg);
    this.type = type
    this.data = data
  }
}

