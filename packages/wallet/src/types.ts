import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, SignerData, StdFee } from "@cosmjs/stargate";
import { Cosmos } from "@demex-sdk/core/src";
import { DemexSigner } from "./signer";

export interface WalletAccount extends Account {
  isMerged?: boolean
}


export interface TxOverrides {
  fee?: StdFee
  feeDenom?: string
  feeGranter?: string
  timeoutHeight?: number
  memo?: string
}

export interface SignTxOpts {
  tx?: TxOverrides
  signer?: Partial<SignerData>
}

export interface SignTxRequest {
  messages: readonly EncodeObject[]
  signOpts?: SignTxOpts
  skipSequenceIncrement?: boolean
}
export interface SignTxResult {
  signedTx: Cosmos.Tx.TxRaw
  signerAddress: string
  sequence: number
}
