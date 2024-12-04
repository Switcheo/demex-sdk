import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, DeliverTxResponse, SignerData, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, BroadcastTxSyncResponse, Method } from "@cosmjs/tendermint-rpc";
import { TxRequest } from "@cosmjs/tendermint-rpc/build/comet38";
import { Tx } from "@demex-sdk/codecs";
import { DemexSigner } from "./signer";

export type BroadcastTxMode = Method.BroadcastTxAsync | Method.BroadcastTxSync | Method.BroadcastTxCommit;

export type BroadcastTxResult = DeliverTxResponse | BroadcastTxSyncResponse | BroadcastTxAsyncResponse;

export interface PromiseHandler<T> {
  requestId?: string;
  resolve: (result: T) => void;
  reject: (reason?: any) => void;
}

export type AccountStates = Record<string, AccountState>

export interface AccountState extends Omit<Account, "pubkey"> {
  sequenceInvalidated: boolean
}

export interface ReloadAddresses {
  address: string
  evmBech32Address?: string
}
export interface SigningData extends SignTxRequest {
  address: string
  evmBech32Address?: string
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

export interface DemexSignerData extends SignerData {
  timeoutHeight?: number;
  evmChainId?: string;
  memo?: string;
}

export interface SignTxOpts {
  fee?: StdFee;
  feeDenom?: string;
  feeGranter?: string;
  explicitSignerData?: Partial<DemexSignerData>;
  triggerMerge?: boolean; // stack merge account tx if user account is unmerged
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
export class DemexBroadcastError extends Error {
  readonly type?: ErrorType
  readonly data?: any
  constructor(msg: string, type?: ErrorType, data?: any) {
    super(msg);
    this.type = type
    this.data = data
  }
}

