import { encodeSecp256k1Signature, rawSecp256k1PubkeyToRawAddress, StdSignature } from "@cosmjs/amino";
import { keccak256, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBech32, toBech32, toHex } from "@cosmjs/encoding";
import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, accountFromAny, DeliverTxResponse, isDeliverTxFailure, SignerData, SigningStargateClient } from "@cosmjs/stargate";
import { BroadcastTxAsyncResponse, Method, Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BroadcastTxSyncResponse, broadcastTxSyncSuccess } from "@cosmjs/tendermint-rpc/build/tendermint37";
import { Tx } from "@demex-sdk/codecs";
import { BIP44Path, BN_ZERO, bnOrZero, callIgnoreError, defaultNetworkConfig, DemexQueryClient, Network, NetworkConfig, PGN_1K, QueueManager, stringOrBufferToBuffer, TxDefaultGasCost, TxDefaultGasDenom, TxGasCostTypeDefaultKey } from "@demex-sdk/core";
import BigNumber from "bignumber.js";
import * as Bip39 from "bip39";
import elliptic from "elliptic";
import { DemexNonSigner, DemexPrivateKeySigner, DemexSigner, isDemexEIP712Signer } from "./signer";
import { BroadcastTxMode, BroadcastTxOpts, BroadcastTxRequest, DemexBroadcastError, ErrorType, SignTxOpts, SignTxRequest } from "./types";

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

  public txDefaultBroadCastMode?: BroadcastTxMode
  public disableRetryOnSequenceError: boolean = false

  // tx queue management
  private txSignManager: QueueManager<SignTxRequest>
  private txDispatchManager: QueueManager<BroadcastTxRequest>
  private sequenceInvalidated = false
  private defaultTimeoutBlocks: number

  // network state caches
  private accountInfo: Account | null = null
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

    this.onRequestSign = opts.onRequestSign;
    this.onSignComplete = opts.onSignComplete;
    this.onBroadcastTxSuccess = opts.onBroadcastTxSuccess;
    this.onBroadcastTxFail = opts.onBroadcastTxFail;

    this.txDispatchManager = new QueueManager(this.dispatchTx.bind(this));
    this.txSignManager = new QueueManager(this.signTx.bind(this));

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

  private async signTx(txRequest: SignTxRequest) {
    const {
      reattempts,
      signerAddress,
      signOpts,
      messages,
      broadcastOpts,
      handler: { resolve, reject },
    } = txRequest;

    try {
      // retrieve account info, reload if sequenceInvalidated flag is set.
      if (!this.accountInfo
        || this.accountInfo?.address === this.evmBech32Address // refresh to check if carbon acc is present
        || this.sequenceInvalidated)
        await this.reloadAccountSequence();

      // prepare tx timeout height. add a default timeout height to tx if unset.
      // skip if EIP-712 signer, timeoutHeight is not supported for EIP-712
      let timeoutHeight;
      if (!isDemexEIP712Signer(this.signer)) {
        timeoutHeight = await this.getTimeoutHeight();
      }

      // calculate tx sequence number, will be 0 if accountInfo doesnt exist (new account).
      // then increment account info sequence number if not a new account.
      let sequence: number
      if (!this.accountInfo) {
        sequence = signOpts?.sequence ?? 0
      } else {
        sequence = this.accountInfo!.sequence;
        this.accountInfo = {
          ...this.accountInfo!,
          sequence: sequence + 1,
        };
      }

      // obtain signed transaction
      const _signOpts: SignTxOpts = {
        ...signOpts,
        explicitSignerData: {
          timeoutHeight,
          ...signOpts?.explicitSignerData,
        },
      };
      const signedTx = await this.getSignedTx(signerAddress, messages, sequence, _signOpts);

      // add signed transaction to dispatch queue
      this.txDispatchManager.enqueue({
        reattempts,
        signerAddress,
        messages,
        signedTx,
        broadcastOpts,
        signOpts: _signOpts,
        handler: { resolve, reject, requestId: sequence.toString() },
      });
    } catch (error) {
      reject(error);
    }
  }

  public async getSignedTx(
    signerAddress: string,
    messages: readonly EncodeObject[],
    sequence: number,
    opts: Omit<SignTxOpts, "sequence">,
  ): Promise<Tx.TxRaw> {
    const { memo = "", accountNumber, explicitSignerData, feeDenom } = opts;
    const signingClient = await this.getSigningStargateClient();
    const [account] = await this.signer.getAccounts();

    let signature: StdSignature | null = null;
    try {
      const chainId = await this.getChainId();
      await callIgnoreError(() => this.onRequestSign?.(messages));
      const signerData: SignerData = {
        accountNumber: accountNumber ?? this.accountInfo!.accountNumber,
        chainId,
        sequence,
        ...explicitSignerData,
      };
      const fee = opts?.fee ?? await this.estimateTxFee(messages, feeDenom ?? TxDefaultGasDenom);
      const txRaw = await signingClient.sign(signerAddress, messages, fee, memo, signerData);
      signature = encodeSecp256k1Signature(account.pubkey, txRaw.signatures[0]);
      return txRaw;
    } finally {
      await callIgnoreError(() => this.onSignComplete?.(signature));
    }
  }

  public async estimateTxFee(
    messages: readonly EncodeObject[],
    feeDenom: string,
  ) {
    const denomGasPrice = await this.getGasPrice(feeDenom);

    let totalGasCost = BN_ZERO;
    for (const msg of messages) {
      const gasCost = await this.getGasCost(msg.typeUrl);
      totalGasCost = totalGasCost.plus(gasCost);
    }
    let totalFees = totalGasCost.times(denomGasPrice ?? BN_ZERO);

    // override zero gas cost tx with some gas for tx execution
    // set overall fee to zero, implying 0 gas price.
    if (totalGasCost.isZero()) {
      totalGasCost = TxDefaultGasCost;
      totalFees = BN_ZERO;
    }

    return {
      amount: [{
        amount: totalFees.toString(10),
        denom: feeDenom,
      }],
      gas: totalGasCost.toString(10),
    };
  }

  public async reloadAccountSequence() {
    if (this.sequenceInvalidated) this.sequenceInvalidated = false;

    const info = await this.reloadAccountInfo()
    const pubkey = this.accountInfo?.pubkey ?? {
      type: "tendermint/PubKeySecp256k1",
      value: this.publicKey.toString("base64"),
    };
    if (info) {
      this.accountInfo = {
        ...info,
        pubkey,
      };
    }
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

  private async reloadAccountInfo() {
    // carbon account always takes priority
    let account: Account | undefined = undefined;
    if (this.bech32Address)
      account = await this.getAccount(this.bech32Address);
    if (!account && this.evmBech32Address)
      account = await this.getAccount(this.evmBech32Address);
    return account
  }
  private getBroadcastFunc(broadcastMode?: BroadcastTxMode) {
    switch (broadcastMode) {
      case Method.BroadcastTxSync: return this.broadcastTxToMempoolWithoutConfirm.bind(this);
      case Method.BroadcastTxAsync: return this.broadcastTxWithoutConfirm.bind(this);
    }
    return this.broadcastTx.bind(this)
  }
  private async getAccount(queryAddress: string, retryCount: number = 0): Promise<Account | undefined> {
    try {
      const queryClient = await this.getQueryClient();
      const result = await queryClient.auth.Account({ address: queryAddress });
      if (result.account)
        return accountFromAny(result.account);
    } catch (error) {
      if (!isAccountNotFoundError(error, queryAddress))
        throw error
    }
    // when grant is just created, querying grantee account info immediately may fail maybe due to backend caching
    // retry query after 1s to buffer for backend to catch up
    if (retryCount < 1) {
      await delay(1000);
      return this.getAccount(queryAddress, retryCount + 1)
    }

    return undefined
  }

  private async dispatchTx(txRequest: BroadcastTxRequest) {
    const {
      broadcastOpts,
      signedTx,
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
        this.sequenceInvalidated = true;

        // requeue transaction for signTx
        this.txSignManager.enqueue({
          reattempts: (reattempts ?? 0) + 1,
          signerAddress: txRequest.signerAddress,
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
    if (isDeliverTxFailure(response)) {
      // tx failed
      throw new DemexBroadcastError(`[${response.code}] ${response.rawLog}`, ErrorType.BlockFail, response)
    }
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
    if (!broadcastTxSyncSuccess(response)) {
      // tx failed
      throw new DemexBroadcastError(`[${response.code}] ${response.log}`, ErrorType.BroadcastFail, response);
    }
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
    this._signingClient = await SigningStargateClient.createWithSigner(tmClient, this.signer);
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

    const signer = new DemexPrivateKeySigner(privateKeyBuffer, "");
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
