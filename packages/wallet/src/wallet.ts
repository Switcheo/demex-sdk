import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
import { keccak256, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBech32, toBech32, toHex } from "@cosmjs/encoding";
import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, accountFromAny, DeliverTxResponse, isDeliverTxFailure, SignerData, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, Method, Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BroadcastTxSyncResponse, broadcastTxSyncSuccess } from "@cosmjs/tendermint-rpc/build/tendermint37";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { registry, Tx, TxTypes } from "@demex-sdk/codecs";
import { MsgExec } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { BIP44Path, BN_ZERO, bnOrZero, callIgnoreError, DefaultGas, defaultNetworkConfig, DemexQueryClient, Network, NetworkConfig, PGN_1K, QueueManager, SHIFT_DEC_DECIMALS, stringOrBufferToBuffer, TxDefaultGasDenom, TxGasCostTypeDefaultKey } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import * as Bip39 from "bip39";
import elliptic from "elliptic";
import { WalletError } from "./constant";
import { Grantee } from "./grantee";
import { DemexEIP712Signer, DemexNonSigner, DemexPrivateKeySigner, DemexSigner } from "./signer";
import { DemexEIP712SigningClient } from "./signingClient/eip712";
import { BroadcastTxMode, BroadcastTxOpts, BroadcastTxRequest, BroadcastTxResult, DemexBroadcastError, ErrorType, SigningData, SignTxOpts, SignTxRequest, WalletAccount } from "./types";
import { getDefaultSignerAddress, getDefaultSignerEvmAddress, getEvmHexAddress, isDemexEIP712Signer } from "./utils";


export const DEFAULT_TX_TIMEOUT_BLOCKS = 35; // ~1min at 1.7s/blk

type RequireOnly<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;
export interface ConnectWalletParams {
  mnemonic: string
  hdPath: string

  privateKey: string | Buffer

  signer: DemexSigner
  publicKeyBase64: string

  bech32Address: string
}

export type ConnectWalletOpts = (
  // connect with mnemonic
  | RequireOnly<ConnectWalletParams, "mnemonic" | "hdPath">
  // connect with private key
  | RequireOnly<ConnectWalletParams, "privateKey">
  // connect with custom signer
  | RequireOnly<ConnectWalletParams, "signer" | "publicKeyBase64">
  // connect with address (view only)
  | RequireOnly<ConnectWalletParams, "bech32Address">
)

export interface BaseDemexWalletInitOpts {
  /**
   * agent tag provided by caller to serve as identifier or differentiator
   * of different signer providers. this should not be used by DemexWallet
   * as identifier for connection type.
   */
  providerAgent?: string

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
export type DemexWalletInitOpts = BaseDemexWalletInitOpts & ConnectWalletOpts;
export type DemexWalletConstructorOpts = Partial<DemexWalletInitOpts> & {
  signer: DemexSigner
}


export class DemexWallet {
  public readonly initOpts: DemexWalletConstructorOpts

  public readonly networkConfig: NetworkConfig

  public readonly publicKey: Buffer

  public readonly bech32Address: string
  public readonly hexAddress: string
  public readonly evmHexAddress: string
  public readonly evmBech32Address: string

  public readonly signer: DemexSigner
  public grantee: Grantee | null = null;

  public txDefaultBroadCastMode?: BroadcastTxMode
  public disableRetryOnSequenceError: boolean = false

  // tx queue management
  private txSignManager: QueueManager<SignTxRequest>
  private txDispatchManager: QueueManager<BroadcastTxRequest>
  private defaultTimeoutBlocks: number

  // network state caches
  private walletAccounts: Record<string, WalletAccount>
  private chainId: string | null = null
  private txGasCosts: Record<string, BigNumber> | null = null
  private txGasPrices: Record<string, BigNumber> | null = null

  // cosmjs rpc clients
  private _tmClient?: Tendermint37Client
  private _queryClient?: DemexQueryClient
  private _signingClient?: SigningStargateClient


  private onRequestSign?: OnRequestSignCallback;
  private onSignComplete?: OnSignCompleteCallback;
  private onBroadcastTxSuccess?: OnBroadcastTxSuccessCallback;
  private onBroadcastTxFail?: OnBroadcastTxFailCallback;

  public constructor(opts: DemexWalletConstructorOpts) {
    const network = opts.network ?? Network.MainNet;
    this.networkConfig = DemexWallet.overrideConfig(network, opts.networkConfig);

    this.initOpts = opts;
    this.signer = opts.signer;
    this.txDefaultBroadCastMode = opts.txDefaultBroadCastMode;
    this.defaultTimeoutBlocks = opts.defaultTimeoutBlocks ?? DEFAULT_TX_TIMEOUT_BLOCKS;
    this._tmClient = opts.tmClient;
    this._queryClient = opts.queryClient;
    this.walletAccounts = {};

    this.onRequestSign = opts.onRequestSign;
    this.onSignComplete = opts.onSignComplete;
    this.onBroadcastTxSuccess = opts.onBroadcastTxSuccess;
    this.onBroadcastTxFail = opts.onBroadcastTxFail;

    this.txDispatchManager = new QueueManager(this.dispatchTx.bind(this));
    this.txSignManager = new QueueManager(this.signAndBroadcastTx.bind(this));

    const bech32Prefix = this.networkConfig.bech32Prefix;

    if (opts.bech32Address) {
      // address (view-only) connection
      if (opts.bech32Address.startsWith(bech32Prefix))
        throw new WalletError("invalid address, prefix does not match");

      this.publicKey = Buffer.from([]);
      this.bech32Address = opts.bech32Address;
    } else if (opts.privateKey) {
      // mnemonic or private key connection
      const keypair = new elliptic.ec("secp256k1").keyFromPrivate(opts.privateKey);
      const publicKey = Buffer.from(keypair.getPublic(true, "hex"), "hex");
      const rawAddress = rawSecp256k1PubkeyToRawAddress(publicKey);

      this.publicKey = publicKey;
      this.bech32Address = toBech32(bech32Prefix, rawAddress);
    } else if (opts.publicKeyBase64) {
      // custom signer connection
      const publicKey = stringOrBufferToBuffer(Buffer.from(opts.publicKeyBase64, 'base64'))!;
      const rawAddress = rawSecp256k1PubkeyToRawAddress(publicKey);

      this.bech32Address = toBech32(bech32Prefix, rawAddress);
      this.publicKey = publicKey;
    } else {
      throw new WalletError("cannot instantiate wallet address");
    }

    this.hexAddress = "0x".concat(toHex(fromBech32(this.bech32Address).data));
    if (this.publicKey.length) {
      const evmAddressBytes = keccak256(this.publicKey).slice(-20);
      this.evmHexAddress = getEvmHexAddress(this.publicKey);
      this.evmBech32Address = toBech32(bech32Prefix, evmAddressBytes);
    } else {
      this.evmHexAddress = "";
      this.evmBech32Address = "";
    }
  }

  public async setGrantee(grantee: Grantee) {
    this.grantee = grantee;
  }


  private useGrantee(messages: readonly EncodeObject[], bypass?: boolean) {
    const typeUrls = new Set(messages.map(m => m.typeUrl))
    return !!this.grantee && this.grantee.isAuthorised(typeUrls) && !bypass
  }

  private async getGranteeSigningData(txRequest: SignTxRequest): Promise<SigningData> {
    const { messages } = txRequest;
    return {
      ...txRequest,
      signOpts: { ...txRequest.signOpts, tx: { ...txRequest.signOpts?.tx, feeGranter: await getDefaultSignerAddress(this.signer) } },
      messages: [await this.grantee!.constructExecMessage(messages)],
      signer: this.grantee!.signer,
      signingClient: await this.grantee!.getSigningClient(await this.getTmClient()),
    }
  }

  private async getDefaultSigningData(txRequest: SignTxRequest): Promise<SigningData> {
    return {
      ...txRequest,
      signer: this.signer,
      signingClient: await this.getSigningStargateClient(),
    }
  }

  private async getSigningData(txRequest: SignTxRequest): Promise<SigningData> {
    const { messages, signOpts } = txRequest;
    if (this.useGrantee(messages, signOpts?.bypassGrantee)) return await this.getGranteeSigningData(txRequest);
    return await this.getDefaultSigningData(txRequest);
  }

  private async checkReloadAccountState(signer: DemexSigner) {
    const address = await getDefaultSignerAddress(signer);
    const state = this.walletAccounts?.[address]
    if (!state || state.sequenceInvalidated) return await this.reloadAccount(signer)
  }

  /**
  * Reloads primary account state as priority
  * Only tries to reload secondary account state if primary account state is not found 
  * and signer implements interface to get secondary account address
  */
  public async reloadAccount(signer: DemexSigner) {
    const info = await this.reloadAccountInfo(signer);
    const address = await getDefaultSignerAddress(signer);
    if (!info) return;
    this.walletAccounts[address] = { ...info, sequenceInvalidated: false };
  }

  private async reloadAccountInfo(signer: DemexSigner) {
    const address = await getDefaultSignerAddress(signer);
    const account: Account | undefined = await this.getAccount(address);
    if (account) return account;
    if (!signer) return;
    const evmHexAddress = await getDefaultSignerEvmAddress(signer);
    if (evmHexAddress) {
      const evmAddressBytes = Buffer.from(evmHexAddress.slice(2), 'hex');
      const evmBech32Address = toBech32(this.networkConfig.bech32Prefix, evmAddressBytes);
      const evmAccount: Account | undefined = await this.getAccount(evmBech32Address);
      if (evmAccount) return evmAccount
    }
  }


  private determineTimeoutHeight(signer: DemexSigner) {
    return isDemexEIP712Signer(signer) ? undefined : this.getTimeoutHeight();
  }

  private updateAccountSequence(address: string, sequence: number) {
    if (this.walletAccounts[address]) {
      this.walletAccounts[address] = {
        ...this.walletAccounts[address]!,
        sequence,
      };
    }
  }

  private async signAndConstructBroadcastTxRequest(txRequest: SignTxRequest): Promise<BroadcastTxRequest> {
    const signingData = await this.getSigningData(txRequest);
    const { messages, signer, signingClient, signOpts, handler } = signingData;

    const address = await getDefaultSignerAddress(signer);

    await this.checkReloadAccountState(signer);

    const accountState: WalletAccount | undefined = this.walletAccounts[address];

    if (!accountState) throw new WalletError(`on-chain account not found: ${address}`)

    const timeoutHeight = await this.determineTimeoutHeight(signer);

    const { sequence, accountNumber } = accountState;

    const _signOpts: SignTxOpts = {
      ...signOpts,
      tx: {
        timeoutHeight: signOpts?.tx?.timeoutHeight ?? timeoutHeight,
        ...signOpts?.tx,
      },
      signer: {
        accountNumber: signOpts?.signer?.accountNumber ?? accountNumber,
        sequence: signOpts?.signer?.sequence ?? sequence,
        ...signOpts?.signer,
      }
    };

    const signedTx = await this.getSignedTx(address, messages, signingClient, _signOpts);
    this.updateAccountSequence(address, sequence + 1);

    return {
      ...signingData,
      signerAddress: address,
      signedTx,
      signOpts: _signOpts,
      handler: { ...handler, requestId: sequence.toString() },
    }
  }

  async signAndBroadcast(
    messages: EncodeObject[],
    signOpts?: SignTxOpts,
    broadcastOpts?: BroadcastTxOpts
  ): Promise<BroadcastTxResult> {
    const promise = new Promise<BroadcastTxResult>((resolve, reject) => {
      this.txSignManager.enqueue({
        messages,
        broadcastOpts,
        signOpts,
        handler: { resolve, reject },
      });
    });

    return promise;
  }

  private async signAndBroadcastTx(txRequest: SignTxRequest) {
    try {
      const broadcastTx = await this.signAndConstructBroadcastTxRequest(txRequest);
      this.txDispatchManager.enqueue(broadcastTx);
    } catch (error) {
      txRequest.handler.reject(error);
    }
  }

  public async getSignedTx(
    signerAddress: string,
    messages: readonly EncodeObject[],
    signingClient: SigningStargateClient,
    opts: SignTxOpts,
  ): Promise<Tx.TxRaw> {
    const { signer, tx } = opts;
    const { memo = "", fee, feeDenom, feeGranter, timeoutHeight = 0 } = tx ?? {};
    const { sequence = 0, accountNumber = 0 } = signer ?? {};

    let signature: Uint8Array | null = null;
    try {
      const chainId = await this.getChainId();
      await callIgnoreError(() => this.onRequestSign?.(messages));
      const signerData: SignerData = {
        accountNumber,
        chainId,
        sequence,
      };
      const txFee = fee ?? await this.estimateTxFee(messages, feeDenom ?? TxDefaultGasDenom, feeGranter);
      const txRaw = await signingClient.sign(signerAddress, messages, txFee, memo, signerData, BigInt(timeoutHeight));
      signature = txRaw.signatures[0]!;
      return txRaw;
    } finally {
      await callIgnoreError(() => this.onSignComplete?.(signature));
    }
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

  private async getTotalGasCost(messages: readonly EncodeObject[]) {
    let totalGasCost = BN_ZERO;
    for (const message of messages) {
      const gasCost = await this.getGasCost(message.typeUrl);
      const additionalGasCost = await this.addAdditionalGasCost(message);
      totalGasCost = totalGasCost.plus(gasCost).plus(additionalGasCost);
    }
    return totalGasCost;
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



  public async getTimeoutHeight() {
    try {
      const cacheBuster = ~~(new Date().getTime() / 1000);
      const response = await fetch(`${this.networkConfig.tmRpcUrl}/blockchain?cache=${cacheBuster}`);
      const body: any = await response.json();
      if (!body?.result?.last_height) return undefined;
      return bnOrZero(body.result?.last_height).plus(this.defaultTimeoutBlocks).toNumber();
    } catch (error) {
      return undefined;
    }
  }



  private getBroadcastFunc(broadcastMode?: BroadcastTxMode) {
    switch (broadcastMode) {
      case Method.BroadcastTxSync: return this.broadcastTxToMempoolWithoutConfirm.bind(this);
      case Method.BroadcastTxAsync: return this.broadcastTxWithoutConfirm.bind(this);
    }
    return this.broadcastTx.bind(this)
  }

  private async getAccount(queryAddress: string): Promise<Account | undefined> {
    try {
      const queryClient = await this.getQueryClient();
      const result = await queryClient.auth.Account({ address: queryAddress });
      if (result.account) return accountFromAny(result.account);
    } catch (error) {
      if (!isAccountNotFoundError(error, queryAddress)) throw error
    }
  }

  private async dispatchTx(txRequest: BroadcastTxRequest) {
    const {
      broadcastOpts,
      signedTx,
      signerAddress,
      handler: { resolve, reject },
    } = txRequest;
    const broadcastMode = broadcastOpts?.mode ?? this.txDefaultBroadCastMode;
    const broadcastFunc = this.getBroadcastFunc(broadcastMode);
    try {
      const result = await broadcastFunc(signedTx, broadcastOpts);
      resolve(result);
    } catch (error) {
      const reattempts = txRequest.reattempts ?? 0;
      // retry sendTx if nonce error once.
      if (!this.disableRetryOnSequenceError && reattempts < 1 && isNonceMismatchError(error)) {
        // invalidate account sequence for reload on next signTx call
        if (this.walletAccounts?.[signerAddress]) {
          this.walletAccounts[signerAddress].sequenceInvalidated = true;
        }

        // requeue transaction for signTx
        this.txSignManager.enqueue({
          reattempts: reattempts + 1,
          messages: txRequest.messages,
          broadcastOpts,
          signOpts: txRequest.signOpts,
          handler: { resolve, reject },
        });
      } else {
        reject(error);
      }
    }
  }


  /**
   * broadcast TX and wait for block confirmation
   *
   */
  async broadcastTx(txRaw: Tx.TxRaw, opts: BroadcastTxOpts = {}): Promise<DeliverTxResponse> {
    const { pollIntervalMs = 3_000, timeoutMs = 60_000 } = opts;
    const tx = Tx.TxRaw.encode(txRaw).finish();
    const carbonClient = await this.getSigningStargateClient();
    const response = await carbonClient.broadcastTx(tx, timeoutMs, pollIntervalMs);
    if (isDeliverTxFailure(response)) throw new DemexBroadcastError(`[${response.code}] ${response.rawLog}`, ErrorType.BlockFail, response)
    return response;
  }

  /**
   * broadcast TX to mempool but doesnt wait for block confirmation
   *
   */
  async broadcastTxToMempoolWithoutConfirm(txRaw: Tx.TxRaw): Promise<BroadcastTxSyncResponse> {
    const tx = Tx.TxRaw.encode(txRaw).finish();
    const tmClient = await this.getTmClient();
    const response = await tmClient.broadcastTxSync({ tx });
    if (!broadcastTxSyncSuccess(response)) throw new DemexBroadcastError(`[${response.code}] ${response.log}`, ErrorType.BroadcastFail, response);
    return response
  }

  /**
   * broadcast TX but doesnt wait for block confirmation nor submission to mempool
   *
   */
  async broadcastTxWithoutConfirm(txRaw: Tx.TxRaw): Promise<BroadcastTxAsyncResponse> {
    const tx = Tx.TxRaw.encode(txRaw).finish();
    const tmClient = await this.getTmClient();
    return tmClient.broadcastTxAsync({ tx });
  }

  public async getTmClient(): Promise<Tendermint37Client> {
    if (!this._tmClient)
      this._tmClient = await Tendermint37Client.connect(this.networkConfig.tmRpcUrl);
    return this._tmClient
  }
  public async getQueryClient(): Promise<DemexQueryClient> {
    if (this._queryClient) return this._queryClient;
    const tmClient = await this.getTmClient();
    this._queryClient = await DemexQueryClient.instance({ tmClient });
    return this._queryClient;
  }
  public async getSigningStargateClient(): Promise<SigningStargateClient> {
    if (this._signingClient) return this._signingClient;
    const tmClient = await this.getTmClient();
    const signingClient = isDemexEIP712Signer(this.signer)
      ? await DemexEIP712SigningClient.createWithSigner(tmClient, this.signer as DemexEIP712Signer, { registry, aminoTypes: AminoTypesMap })
      : await SigningStargateClient.createWithSigner(tmClient, this.signer, { registry, aminoTypes: AminoTypesMap });
    this._signingClient = signingClient
    return this._signingClient;
  }
  public async getChainId(): Promise<string> {
    if (this.chainId) return this.chainId;
    const queryClient = await this.getQueryClient();
    this.chainId = await queryClient.chain.getChainId();
    return this.chainId;
  }
  public async getGasCost(msgTypeUrl: string): Promise<BigNumber> {
    if (!this.txGasCosts) {
      const queryClient = await this.getQueryClient();
      const { msgGasCosts } = await queryClient.fee.MsgGasCostAll({ pagination: PGN_1K });
      this.txGasCosts = Object.fromEntries(msgGasCosts.map(cost => [cost.msgType, bnOrZero(cost.gasCost)]));
    }
    const gasCost = this.txGasCosts[msgTypeUrl] ?? this.txGasCosts[TxGasCostTypeDefaultKey];
    if (!gasCost) {
      throw new WalletError(`unable to obtain gas cost for message type: ${msgTypeUrl} and default key: ${TxGasCostTypeDefaultKey}`);
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

  public cloneForNetwork(network: Network, opts: Partial<DemexWalletConstructorOpts> = {}) {
    return new DemexWallet({
      tmClient: this._tmClient,
      queryClient: this._queryClient,

      // clone current init options
      ...this.initOpts,

      // overwrite network config overrides
      networkConfig: {},

      // apply new init options
      ...opts,

      // set network
      network,
    });
  }

  public static overrideConfig(network: Network, networkConfig: Partial<NetworkConfig> = {}) {
    return {
      ...defaultNetworkConfig[network],
      ...networkConfig,
      network,
    }
  }

  public static withPrivateKey(privateKey: string | Buffer, opts: Omit<DemexWalletInitOpts, "privateKey"> = {}) {
    const privateKeyBuffer = stringOrBufferToBuffer(privateKey);
    if (!privateKeyBuffer || !privateKeyBuffer.length) throw new WalletError("");

    const network = opts.network ?? Network.MainNet;
    const { bech32Prefix } = DemexWallet.overrideConfig(network, opts.networkConfig);

    const signer = new DemexPrivateKeySigner(privateKeyBuffer, bech32Prefix);
    return new DemexWallet({
      ...opts,
      privateKey: privateKeyBuffer,
      signer,
    });
  }

  public static withMnemonic(mnemonic: string, hdPath?: string, opts: Omit<DemexWalletInitOpts, "mnemonic" | "hdPath"> = {}) {
    if (!hdPath) hdPath = new BIP44Path(44, 118).generate();
    const seed = Bip39.mnemonicToSeedSync(mnemonic);
    const result = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath(hdPath));
    const privateKey = Buffer.from(result.privkey);
    return DemexWallet.withPrivateKey(privateKey, {
      ...opts,
      mnemonic, hdPath,
    });
  }

  public static withSigner(signer: DemexSigner, publicKeyBase64: string, opts: Omit<DemexWalletInitOpts, "signer"> = {}) {
    return new DemexWallet({
      ...opts,
      signer,
      publicKeyBase64,
    });
  }

  public static withAddress(bech32Address: string, opts: Partial<DemexWalletInitOpts> = {}) {
    return new DemexWallet({
      ...opts,
      bech32Address,
      signer: new DemexNonSigner()
    });
  }
}
export type OnRequestSignCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void>;
export type OnSignCompleteCallback = (signature: Uint8Array | null) => PromiseLike<void>;
export type OnBroadcastTxFailCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void>;
export type OnBroadcastTxSuccessCallback = (msgs: readonly EncodeObject[]) => PromiseLike<void>;

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
const getErrorMessage = (error: unknown) => {
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string")
    return error.message;
  return String(error);
}
const isAccountNotFoundError = (error: unknown, address: string) => {
  return getErrorMessage(error)?.includes(`account ${address} not found`);
}
const isNonceMismatchError = (error: unknown) => {
  const matchMessage = "account sequence mismatch";
  const includes = getErrorMessage(error).includes(matchMessage);
  if (includes)
    return error as Error;

  return false
}
