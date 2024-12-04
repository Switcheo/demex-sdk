import { encodeSecp256k1Signature, rawSecp256k1PubkeyToRawAddress, StdSignature } from "@cosmjs/amino";
import { keccak256, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBech32, toBech32, toHex } from "@cosmjs/encoding";
import { AccountData, EncodeObject } from "@cosmjs/proto-signing";
import { Account, accountFromAny, DeliverTxResponse, isDeliverTxFailure, SignerData, SigningStargateClient, StdFee } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, Method, Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BroadcastTxSyncResponse, broadcastTxSyncSuccess } from "@cosmjs/tendermint-rpc/build/tendermint37";
import { registry, Tx, TxTypes } from "@demex-sdk/codecs";
import { MsgExec } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { BIP44Path, BN_ZERO, bnOrZero, callIgnoreError, DefaultGas, defaultNetworkConfig, DemexQueryClient, Network, NetworkConfig, PGN_1K, QueueManager, stringOrBufferToBuffer, TxDefaultGasDenom, TxGasCostTypeDefaultKey } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import * as Bip39 from "bip39";
import elliptic from "elliptic";
import { Grantee } from "./grantee";
import { DemexNonSigner, DemexPrivateKeySigner, DemexSigner, isDemexEIP712Signer } from "./signer";
import { AccountState, AccountStates, BroadcastTxMode, BroadcastTxOpts, BroadcastTxRequest, BroadcastTxResult, DemexBroadcastError, ErrorType, ReloadAddresses, SigningData, SignTxOpts, SignTxRequest } from "./types";


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
  private accountStates: AccountStates
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
    this.accountStates = {};

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
        throw new Error("invalid address, prefix does not match");

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
      const publicKey = stringOrBufferToBuffer(opts.publicKeyBase64)!;
      const rawAddress = rawSecp256k1PubkeyToRawAddress(publicKey);

      this.bech32Address = toBech32(bech32Prefix, rawAddress);
      this.publicKey = publicKey;
    } else {
      throw new Error("cannot instantiate wallet address");
    }

    this.hexAddress = "0x".concat(toHex(fromBech32(this.bech32Address).data));
    if (this.publicKey.length) {
      const evmAddressBytes = keccak256(this.publicKey).slice(-20);
      this.evmHexAddress = "0x".concat(toHex(evmAddressBytes));
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

  private async getGranteeSigningData(txRequest: SignTxRequest) {
    const { messages } = txRequest;
    return {
      ...txRequest,
      signOpts: { ...txRequest.signOpts, feeGranter: this.bech32Address },
      address: await this.grantee!.getAddress(),
      messages: [await this.grantee!.constructExecMessage(messages)],
      signer: this.grantee!.signer,
      signingClient: await this.grantee!.getSigningClient(await this.getTmClient()),
    }
  }

  private async getDefaultSigningData(txRequest: SignTxRequest) {
    return {
      ...txRequest,
      address: this.bech32Address,
      evmBech32Address: this.evmBech32Address,
      signer: this.signer,
      signingClient: await this.getSigningStargateClient(),
    }
  }

  private async getSigningData(txRequest: SignTxRequest): Promise<SigningData> {
    const { messages, signOpts } = txRequest;
    if (this.useGrantee(messages, signOpts?.bypassGrantee)) return await this.getGranteeSigningData(txRequest);
    return await this.getDefaultSigningData(txRequest);
  }

  private async checkReloadAccountState(reloadAddresses: ReloadAddresses) {
    const { address } = reloadAddresses
    const state = this.accountStates?.[address]
    if (!state || state.sequenceInvalidated) return await this.reloadAccount(reloadAddresses)
  }


  private determineTimeoutHeight(signer: DemexSigner) {
    return isDemexEIP712Signer(signer) ? undefined : this.getTimeoutHeight();
  }

  private updateAccountState(address: string, update: Partial<AccountState>) {
    this.accountStates[address] = {
      ...this.accountStates[address],
      ...update,
    };
  }

  private async signAndConstructBroadcastTxRequest(txRequest: SignTxRequest): Promise<BroadcastTxRequest> {
    const signingData = await this.getSigningData(txRequest);
    const { address, evmBech32Address, messages, signer, signingClient, signOpts, handler } = signingData;

    await this.checkReloadAccountState({ address, evmBech32Address });

    const accountState: AccountState | undefined = this.accountStates[address];

    if (!accountState) throw Error(`account not found: ${address}`)

    const timeoutHeight = await this.determineTimeoutHeight(signer);

    const { sequence, accountNumber } = accountState;

    const _signOpts: SignTxOpts = {
      ...signOpts,
      explicitSignerData: {
        timeoutHeight,
        accountNumber,
        sequence,
        ...signOpts?.explicitSignerData,
      },
    };

    const [account] = await signer.getAccounts();
    const signedTx = await this.getSignedTx(address, messages, signingClient, account, _signOpts);
    this.updateAccountState(address, { sequence });

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
    account: AccountData,
    opts: SignTxOpts,
  ): Promise<Tx.TxRaw> {
    const { explicitSignerData, feeDenom, feeGranter, fee } = opts;
    const { sequence, accountNumber, memo = "" } = explicitSignerData ?? {};

    let signature: StdSignature | null = null;
    try {
      const chainId = await this.getChainId();
      await callIgnoreError(() => this.onRequestSign?.(messages));
      const signerData: SignerData = {
        accountNumber: accountNumber ?? 0,
        chainId,
        sequence: sequence ?? 0,
        ...explicitSignerData,
      };
      const txFee = fee ?? await this.estimateTxFee(messages, feeDenom ?? TxDefaultGasDenom, feeGranter);
      const txRaw = await signingClient.sign(signerAddress, messages, txFee, memo, signerData);
      signature = encodeSecp256k1Signature(account.pubkey, txRaw.signatures[0]);
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
      totalGasCost = totalGasCost
        .plus(gasCost ?? BN_ZERO)
        .plus(await this.addAdditionalGasCost(message));
    }
    return totalGasCost;
  }

  private async addAdditionalGasCost(message: EncodeObject) {
    switch (message.typeUrl) {
      case TxTypes.MsgExec: return await this.getExecGasCost(message);
    }
    return BN_ZERO;
  }

  private async getExecGasCost(message: EncodeObject) {
    const { msgs } = message.value as MsgExec;
    return await this.getTotalGasCost(msgs);
  }

  public async reloadAccount(reloadAddresses: ReloadAddresses) {
    const info = await this.reloadAccountInfo(reloadAddresses);
    if (!info) return;
    const { pubkey, ...rest } = info;
    this.accountStates[reloadAddresses.address] = { ...rest, sequenceInvalidated: false };
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

  private async reloadAccountInfo(reloadAddresses: ReloadAddresses) {
    const { address, evmBech32Address } = reloadAddresses
    const account: Account | undefined = await this.getAccount(address);
    if (account) return account
    if (evmBech32Address) {
      const evmAccount: Account | undefined = await this.getAccount(evmBech32Address);
      if (evmAccount) return evmAccount
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
        this.accountStates[signerAddress].sequenceInvalidated = true;

        // requeue transaction for signTx
        this.txSignManager.enqueue({
          reattempts: (reattempts ?? 0) + 1,
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
    this._signingClient = await SigningStargateClient.createWithSigner(tmClient, this.signer, { registry });
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
    return this.txGasCosts[msgTypeUrl] ?? this.txGasCosts[TxGasCostTypeDefaultKey];
  }
  public async getGasPrice(denom: string): Promise<BigNumber | null> {
    if (!this.txGasPrices) {
      const queryClient = await this.getQueryClient();
      const { minGasPrices } = await queryClient.fee.MinGasPriceAll({ pagination: PGN_1K });
      this.txGasPrices = Object.fromEntries(minGasPrices.map(cost => [cost.denom, bnOrZero(cost.gasPrice)]));
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
    if (!privateKeyBuffer || !privateKeyBuffer.length) throw new Error("");

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
export type OnRequestSignCallback = (msgs: readonly EncodeObject[]) => void | Promise<void>;
export type OnSignCompleteCallback = (signature: StdSignature | null) => void | Promise<void>;
export type OnBroadcastTxFailCallback = (msgs: readonly EncodeObject[]) => void | Promise<void>;
export type OnBroadcastTxSuccessCallback = (msgs: readonly EncodeObject[]) => void | Promise<void>;

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
