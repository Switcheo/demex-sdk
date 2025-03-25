import { EncodeObject } from "@cosmjs/proto-signing";
import { DeliverTxResponse, isDeliverTxFailure, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, Method, Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BroadcastTxSyncResponse, broadcastTxSyncSuccess } from "@cosmjs/tendermint-rpc/build/tendermint37";
import { MsgExec } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { BN_ZERO, bnOrZero, callIgnoreError, ClientProvider, Cosmos, DefaultGas, Demex, DemexQueryClient, isNonceMismatchError, Network, NetworkConfig, overrideConfig, PGN_1K, QueueManager, SHIFT_DEC_DECIMALS, TxDefaultGasDenom, TxGasCostTypeDefaultKey, TxTypes } from "@demex-sdk/core";
import { DemexWallet, GranteeWallet, SignTxOpts } from "@demex-sdk/wallet";
import BigNumber from "bignumber.js";
import { SdkError } from "./constant";
import { BroadcastTxMode, BroadcastTxOpts, BroadcastTxRequest, BroadcastTxResult, DemexBroadcastError, EnqueueSignTxOpts, ErrorType, OnBroadcastTxFailCallback, OnBroadcastTxSuccessCallback, OnRequestSignCallback, OnSignCompleteCallback, SigningData, SignTxRequest } from "./types";
import { containsMergeWalletAccountMessage } from "./utils";

export const DEFAULT_TX_TIMEOUT_BLOCKS = 35; // ~1min at 1.7s/blk

export enum WalletRole {
  Main = "main",
  Grantee = "grantee",
}

export interface RecommendSigningWalletOpts {
  signerAddress?: string
  bypassGrantee?: boolean
}

export interface BaseDemexSDKInitOpts {
  /**
   * agent tag provided by caller to serve as identifier or differentiator
   * of different signer providers. this should not be used by DemexWallet
   * as identifier for connection type.
   */
  providerAgent?: string

  triggerMerge?: boolean

  tmClient?: Tendermint37Client
  queryClient?: DemexQueryClient

  network?: Network
  networkConfig?: Partial<NetworkConfig>

  txDefaultBroadCastMode?: BroadcastTxMode
  disableRetryOnSequenceError?: boolean
  defaultTimeoutBlocks?: number

  /** Optional callback that will be called before signing is requested/executed. */
  onRequestSign?: OnRequestSignCallback;
  /** Optional callback that will be called when signing is complete. */
  onSignComplete?: OnSignCompleteCallback;
  /** Optional callback that will be called after tx is broadcast successful. */
  onBroadcastTxSuccess?: OnBroadcastTxSuccessCallback;
  /** Optional callback that will be called if tx broadcast fails. */
  onBroadcastTxFail?: OnBroadcastTxFailCallback;
}

export interface DemexSDKInitOpts extends BaseDemexSDKInitOpts {

}

export class DemexSDK extends ClientProvider {
  public readonly initOpts: DemexSDKInitOpts

  public get network() { return this.networkConfig.network }
  public get wallet() { return this.getWallet() }

  public wallets: Record<string, DemexWallet> = {}

  // tx dispatch configurations
  public triggerMerge: boolean;
  public txDefaultBroadCastMode?: BroadcastTxMode
  public disableRetryOnSequenceError: boolean

  // tx queue management
  private txSignManager: QueueManager<SignTxRequest>
  private txDispatchManager: QueueManager<BroadcastTxRequest>
  private defaultTimeoutBlocks: number

  private txGasCosts: Record<string, BigNumber> | null = null
  private txGasPrices: Record<string, BigNumber> | null = null

  private onRequestSign?: OnRequestSignCallback;
  private onSignComplete?: OnSignCompleteCallback;
  private onBroadcastTxSuccess?: OnBroadcastTxSuccessCallback;
  private onBroadcastTxFail?: OnBroadcastTxFailCallback;

  constructor(opts: DemexSDKInitOpts = {}) {
    const network = opts.network ?? Network.MainNet;
    const networkConfig = overrideConfig(network, opts.networkConfig);
    super({
      networkConfig,
      tmClient: opts.tmClient,
      queryClient: opts.queryClient,
    });

    this.initOpts = opts;

    this.txDefaultBroadCastMode = opts.txDefaultBroadCastMode;
    this.disableRetryOnSequenceError = opts.disableRetryOnSequenceError ?? false;
    this.defaultTimeoutBlocks = opts.defaultTimeoutBlocks ?? DEFAULT_TX_TIMEOUT_BLOCKS;

    this.triggerMerge = opts.triggerMerge ?? false;

    this.onRequestSign = opts.onRequestSign;
    this.onSignComplete = opts.onSignComplete;
    this.onBroadcastTxSuccess = opts.onBroadcastTxSuccess;
    this.onBroadcastTxFail = opts.onBroadcastTxFail;

    this.txDispatchManager = new QueueManager(this.dispatchTx.bind(this));
    this.txSignManager = new QueueManager(this.signTx.bind(this));
  }

  async signAndBroadcast(
    messages: EncodeObject[],
    signOpts?: SignTxOpts & { signerAddress: string, triggerMerge?: boolean },
    broadcastOpts?: BroadcastTxOpts
  ): Promise<BroadcastTxResult> {
    const signerAddress = signOpts?.signerAddress;
    const wallet = this.getSigningWallet(signerAddress);
    const checkAccMergedStatus = !!this.triggerMerge || !!signOpts?.triggerMerge;
    if (checkAccMergedStatus) await this.triggerWalletAccMergeIfRequired(messages, wallet);
    return await this.queueTx(messages, signOpts, broadcastOpts);
  }

  public async setGrantee(wallet: GranteeWallet) {
    this.wallets[WalletRole.Grantee] = wallet;
  }

  public isGranteeEligible(messages: readonly EncodeObject[]) {
    const wallet = this.getWallet(WalletRole.Grantee);
    if (!wallet) return false;
    const granteeWallet = wallet as GranteeWallet;
    const typeUrls = new Set(messages.map(m => m.typeUrl));
    return granteeWallet.isAuthorised(typeUrls);
  }

  public async getTimeoutHeight() {
    try {
      const cacheBuster = ~~(new Date().getTime() / 1000);
      const response = await fetch(`${this.networkConfig.tmRpcUrl}/blockchain?cache=${cacheBuster}`);
      const body: any = await response.json();
      if (!body?.result?.last_height) return undefined;
      return bnOrZero(body?.result?.last_height).plus(this.defaultTimeoutBlocks).toNumber();
    } catch (error) {
      return undefined;
    }
  }

  private getWallet(roleOrAddress: string = WalletRole.Main): DemexWallet | undefined {
    if (this.wallets[roleOrAddress]) return this.wallets[roleOrAddress];
    return Object.values(this.wallets).find(w => w.role === roleOrAddress);
  }
  private getSigningWallet(roleOrAddress: string = WalletRole.Main): DemexWallet {
    const wallet = this.getWallet(roleOrAddress);
    if (!wallet) throw new SdkError("wallet for signer not found");
    return wallet;
  }
  private recommendSigningWallet(messages: readonly EncodeObject[], opts: RecommendSigningWalletOpts = {}): DemexWallet {
    // use selected signer if signer address provided explicitly
    if (opts.signerAddress) return this.getSigningWallet(opts.signerAddress);
    // otherwise check if grantee can be used
    if (!opts.bypassGrantee && this.isGranteeEligible(messages)) return this.getSigningWallet(WalletRole.Grantee);
    // otherwise use main wallet
    return this.getSigningWallet();
  }

  private async triggerWalletAccMergeIfRequired(messages: readonly EncodeObject[], wallet: DemexWallet | undefined = this.wallet) {
    if (!wallet || wallet.isMerged) return;

    const mergeOwnAccountMessage = containsMergeWalletAccountMessage(wallet, messages);
    if (mergeOwnAccountMessage) return;

    const hexPublicKey = wallet.publicKey.toString("hex");

    const message: EncodeObject = {
      typeUrl: TxTypes.MsgMergeAccount,
      value: Demex.Evmmerge.MsgMergeAccount.fromPartial({
        // get address via mapping as account may exist only as evm bech32
        creator: wallet.bech32Address,
        pubKey: hexPublicKey,
      }),
    }
    await this.queueTx([message]);
    await wallet.reloadAccount()
  }

  private queueTx(
    messages: EncodeObject[],
    signTxOpts?: EnqueueSignTxOpts,
    broadcastOpts?: BroadcastTxOpts
  ): Promise<BroadcastTxResult> {
    const promise = new Promise<BroadcastTxResult>((resolve, reject) => {
      const { triggerMerge, bypassGrantee, signerAddress, ...signOpts } = signTxOpts ?? {}
      this.txSignManager.enqueue({
        triggerMerge,
        bypassGrantee,
        signerAddress,
        messages,
        broadcastOpts,
        signOpts,
        handler: { resolve, reject },
      });
    });
    return promise;
  }

  private async signTx(txRequest: SignTxRequest) {
    const { bypassGrantee, triggerMerge, signOpts = {}, messages, handler, signerAddress } = txRequest;
    const { memo = "", fee, feeDenom, feeGranter, timeoutHeight } = signOpts.tx ?? {};
    try {
      const wallet = this.recommendSigningWallet(messages, { bypassGrantee, signerAddress });
      const signingData: SigningData = { signer: wallet.signer, ...txRequest };
      if (wallet.role === WalletRole.Grantee) {
        const grantee = wallet as GranteeWallet;
        const granter = this.getSigningWallet(WalletRole.Main);
        signingData.messages = [grantee.constructExecMessage(txRequest.messages)];
        signingData.signOpts = {
          ...txRequest.signOpts,
          tx: {
            ...txRequest.signOpts?.tx,
            feeGranter: feeGranter ?? granter.bech32Address,
          },
        };
      } else if (triggerMerge) {
        this.triggerWalletAccMergeIfRequired(signingData.messages, wallet);
      }

      const txFee = fee ?? await this.estimateTxFee(signingData.messages, feeDenom ?? TxDefaultGasDenom, feeGranter);
      const txTimeoutHeight = timeoutHeight ?? await this.getTimeoutHeight();

      signOpts.tx = {
        fee: txFee,
        memo, feeDenom, feeGranter, timeoutHeight: txTimeoutHeight,
      };

      let signature: Uint8Array | null = null;
      try {
        await callIgnoreError(() => this.onRequestSign?.(signingData.messages));
        const signResult = await wallet.signTx({ signOpts, messages });

        this.txDispatchManager.enqueue({
          ...signingData,
          signerAddress: wallet.bech32Address,
          signedTx: signResult.signedTx,
          handler: { ...handler, requestId: signResult.toString() },
        });
        signature = signResult.signedTx.signatures[0]!;
      } finally {
        await callIgnoreError(() => this.onSignComplete?.(signature));
      }

    } catch (error) {
      txRequest.handler.reject(error);
    }
  }

  private async dispatchTx(txRequest: BroadcastTxRequest) {
    const {
      signerAddress,
      messages,
      broadcastOpts,
      signedTx,
      handler: { resolve, reject },
    } = txRequest;
    const broadcastMode = broadcastOpts?.mode ?? this.txDefaultBroadCastMode;
    const broadcastFunc = this.getBroadcastFunc(broadcastMode);
    const wallet = this.getSigningWallet(signerAddress);

    try {
      const result = await broadcastFunc(signedTx, broadcastOpts);
      await callIgnoreError(() => this.onBroadcastTxSuccess?.(messages));
      if (containsMergeWalletAccountMessage(wallet, messages)) await wallet.reloadMergedWalletAccount();
      resolve(result);
    } catch (error) {
      const reattempts = txRequest.reattempts ?? 0;
      // retry sendTx if nonce error once.
      if (!this.disableRetryOnSequenceError && reattempts < 1 && isNonceMismatchError(error)) {
        await wallet.reloadAccount();
        // requeue transaction for signTx
        this.txSignManager.enqueue({
          reattempts: reattempts + 1,
          messages: txRequest.messages,
          broadcastOpts,
          signOpts: txRequest.signOpts,
          handler: { resolve, reject },
        });
      } else {
        await callIgnoreError(() => this.onBroadcastTxFail?.(messages));
        reject(error);
      }
    }
  }

  private getBroadcastFunc(broadcastMode?: BroadcastTxMode) {
    switch (broadcastMode) {
      case Method.BroadcastTxSync: return this.broadcastTxToMempoolWithoutConfirm.bind(this);
      case Method.BroadcastTxAsync: return this.broadcastTxWithoutConfirm.bind(this);
    }
    return this.broadcastTx.bind(this)
  }


  /**
   * broadcast TX and wait for block confirmation
   *
   */
  async broadcastTx(txRaw: Cosmos.Tx.TxRaw, opts: BroadcastTxOpts = {}): Promise<DeliverTxResponse> {
    const { pollIntervalMs = 3_000, timeoutMs = 60_000 } = opts;
    const tx = Cosmos.Tx.TxRaw.encode(txRaw).finish();
    const stargateClient = await this.getStargateClient();
    const response = await stargateClient.broadcastTx(tx, timeoutMs, pollIntervalMs);
    if (isDeliverTxFailure(response)) throw new DemexBroadcastError(`[${response.code}] ${response.rawLog}`, ErrorType.BlockFail, response)
    return response;
  }

  /**
   * broadcast TX to mempool but doesnt wait for block confirmation
   *
   */
  async broadcastTxToMempoolWithoutConfirm(txRaw: Cosmos.Tx.TxRaw): Promise<BroadcastTxSyncResponse> {
    const tx = Cosmos.Tx.TxRaw.encode(txRaw).finish();
    const tmClient = await this.getTmClient();
    const response = await tmClient.broadcastTxSync({ tx });
    if (!broadcastTxSyncSuccess(response)) throw new DemexBroadcastError(`[${response.code}] ${response.log}`, ErrorType.BroadcastFail, response);
    return response
  }

  /**
   * broadcast TX but doesnt wait for block confirmation nor submission to mempool
   *
   */
  async broadcastTxWithoutConfirm(txRaw: Cosmos.Tx.TxRaw): Promise<BroadcastTxAsyncResponse> {
    const tx = Cosmos.Tx.TxRaw.encode(txRaw).finish();
    const tmClient = await this.getTmClient();
    return tmClient.broadcastTxAsync({ tx });
  }

  public async reloadAccount(roleOrAddress: string = WalletRole.Main) {
    const wallet = this.getWallet(roleOrAddress);
    if (!wallet) return; // invalid input, should warn?

    return await wallet.reloadAccount();
  }

  public async getGasCost(msgTypeUrl: string): Promise<BigNumber> {
    if (!this.txGasCosts) {
      const queryClient = await this.getQueryClient();
      const { msgGasCosts } = await queryClient.fee.MsgGasCostAll({ pagination: PGN_1K });
      this.txGasCosts = Object.fromEntries(msgGasCosts.map(cost => [cost.msgType, bnOrZero(cost.gasCost)]));
    }
    const gasCost = this.txGasCosts[msgTypeUrl] ?? this.txGasCosts[TxGasCostTypeDefaultKey];
    if (!gasCost) {
      throw new SdkError(`unable to obtain gas cost for message type: ${msgTypeUrl} and default key: ${TxGasCostTypeDefaultKey}`);
    }
    return gasCost;
  }
  public async getGasPrice(denom: string): Promise<BigNumber | null> {
    if (!this.txGasPrices) {
      const queryClient = await this.getQueryClient();
      const { minGasPrices } = await queryClient.fee.MinGasPriceAll({ pagination: PGN_1K });
      this.txGasPrices = Object.fromEntries(minGasPrices.map(cost => [cost.denom, bnOrZero(cost.gasPrice).shiftedBy(-SHIFT_DEC_DECIMALS)]));
    }
    return this.txGasPrices[denom] ?? null;
  }

  private async getTotalGasCost(messages: readonly EncodeObject[]) {
    let totalGasCost = BN_ZERO;
    for (const message of messages) {
      const gasCost = await this.getGasCost(message.typeUrl);
      const additionalGasCost = await this.addAdditionalGasCost(message);
      totalGasCost = totalGasCost.plus(gasCost).plus(additionalGasCost);
    }
    return totalGasCost;
  }


  public async estimateTxFee(
    messages: readonly EncodeObject[],
    denom: string,
    granter?: string,
  ): Promise<StdFee> {
    const denomGasPrice = await this.getGasPrice(denom);
    const totalGasCost = await this.getTotalGasCost(messages);

    let totalFees = totalGasCost.times(denomGasPrice ?? BN_ZERO);
    // override zero gas cost tx with some gas for tx execution
    // set overall fee to zero, implying 0 gas price.
    if (totalGasCost.isZero()) {
      totalFees = BN_ZERO;
    }

    return {
      amount: [
        {
          amount: totalFees.toString(10),
          denom,
        },
      ],
      gas: DefaultGas.toString(10),
      granter,
    };
  }

  private async addAdditionalGasCost(message: EncodeObject) {
    switch (message.typeUrl) {
      case TxTypes.MsgExec: return await this.getExecGasCost(message.value as MsgExec);
    }
    return BN_ZERO;
  }

  private async getExecGasCost(message: MsgExec) {
    const { msgs } = message;
    return await this.getTotalGasCost(msgs);
  }

  public static instance(opts: DemexSDKInitOpts = {}) {
    return new DemexSDK(opts);
  }
}
