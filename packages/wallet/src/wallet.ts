import { rawSecp256k1PubkeyToRawAddress, StdFee } from "@cosmjs/amino";
import { Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBech32, toBech32, toHex } from "@cosmjs/encoding";
import { EncodeObject } from "@cosmjs/proto-signing";
import { Account, accountFromAny, SignerData, SigningStargateClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { Cosmos, registry } from "@demex-sdk/codecs";
import { BIP44Path, ClientProvider, DefaultGas, DemexQueryClient, isAccountNotFoundError, Network, NetworkConfig, overrideConfig, stringOrBufferToBuffer } from "@demex-sdk/core";
import * as Bip39 from "bip39";
import elliptic from "elliptic";
import { DemexEIP712SigningClient } from "./eip712signingClient";
import { WalletError } from "./errors";
import { DemexEIP712Signer, DemexNonSigner, DemexPrivateKeySigner, DemexSigner, isDemexEIP712Signer } from "./signer";
import { SignTxOpts, SignTxRequest, SignTxResult, WalletAccount } from "./types";
import { getEvmHexAddress } from "./address";

const DEFAULT_STD_FEE: StdFee = {
  amount: [],
  gas: DefaultGas.toString(10),
}
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
  role?: string

  triggerMerge?: boolean

  tmClient?: Tendermint37Client
  queryClient?: DemexQueryClient

  networkConfig?: NetworkConfig
}
export type DemexWalletConnectOpts = BaseDemexWalletInitOpts & Partial<ConnectWalletOpts>;
export type DemexWalletInitOpts = BaseDemexWalletInitOpts & ConnectWalletOpts & {
  signer: DemexSigner
}


export class DemexWallet extends ClientProvider {
  public readonly initOpts: DemexWalletInitOpts

  // wallet signer/account info 
  public readonly signer: DemexSigner
  public readonly providerAgent?: string

  public readonly role?: string

  public readonly publicKey: Buffer

  public readonly bech32Address: string
  public readonly hexAddress: string
  public readonly evmHexAddress: string
  public readonly evmBech32Address: string

  public get isMerged() { return this.account?.isMerged }

  // network state caches
  private account?: WalletAccount

  private _chainId?: string
  private _signingClient?: SigningStargateClient

  public constructor(opts: DemexWalletInitOpts) {
    const network = opts.networkConfig?.network ?? Network.MainNet;
    const networkConfig = overrideConfig(network, opts.networkConfig);
    super({
      networkConfig,
      tmClient: opts.tmClient,
      queryClient: opts.queryClient,
    });
    this.initOpts = opts;

    this.signer = opts.signer;
    this.role = opts.role;
    this.providerAgent = opts.providerAgent;
    this._tmClient = opts.tmClient;
    this._queryClient = opts.queryClient;
    this._chainId = this.networkConfig.chainId;

    const bech32Prefix = this.networkConfig.bech32Prefix;

    if (opts.bech32Address) {
      // address (view-only) connection
      if (!opts.bech32Address.startsWith(bech32Prefix))
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
      const evmHexAddress = getEvmHexAddress(this.publicKey);
      this.evmHexAddress = evmHexAddress;
      const evmAddressBytes = Buffer.from(evmHexAddress.slice(2), "hex");
      this.evmBech32Address = toBech32(bech32Prefix, evmAddressBytes);
    } else {
      this.evmHexAddress = "";
      this.evmBech32Address = "";
    }
  }

  /**
  * Reloads primary account state as priority
  * Only tries to reload secondary account state if primary account state is not found 
  * Returns the updated wallet account info
  */
  public async reloadAccount() {
    const info = await this.getAccountInfo(this.bech32Address, this.evmBech32Address);
    if (!info) return;
    this.account = info;
    await this.updateMergeAccountStatus();
    return info
  }

  private async getAccountInfo(bech32Address: string, evmBech32Address?: string) {
    const account: Account | undefined = await this.getAccount(bech32Address);
    if (account) return account;
    if (evmBech32Address) {
      const evmAccount: Account | undefined = await this.getAccount(evmBech32Address);
      if (evmAccount) return evmAccount;
    }
  }

  private async updateMergeAccountStatus() {
    const isMerged = await this.getMergedAccountStatus();
    this.updateWalletAccount({ isMerged });
  }

  private async getMergedAccountStatus(): Promise<boolean> {
    if (this.account?.isMerged) return true
    return await this.queryMergedAccountStatus()
  }

  private async queryMergedAccountStatus(): Promise<boolean> {
    const queryClient = await this.getQueryClient();
    const response = await queryClient.evmmerge.MappedAddress({ address: this.bech32Address });
    return !!response?.mappedAddress;
  }

  private updateWalletAccount(update: Partial<WalletAccount>) {
    if (this.account) {
      this.account = {
        ...this.account,
        ...update,
      };
    }
  }

  public async signTx(txRequest: SignTxRequest): Promise<SignTxResult> {
    const { messages, signOpts, skipSequenceIncrement } = txRequest;

    if (!this.account) await this.reloadAccount();
    if (!this.account) throw new WalletError(`on chain account not found: ${this.bech32Address}`);

    const address = this.bech32Address;

    // eip712 signer signatuer mismatch when include timeout height
    const txTimeoutHeight = isDemexEIP712Signer(this.signer) ? undefined : signOpts?.tx?.timeoutHeight ?? 0;
    const txAccountNumber = signOpts?.signer?.accountNumber ?? this.account.accountNumber;
    const txSequence = signOpts?.signer?.sequence ?? this.account.sequence;

    const _signOpts: SignTxOpts = {
      ...signOpts,
      tx: {
        ...signOpts?.tx,
        timeoutHeight: txTimeoutHeight,
      },
      signer: {
        ...signOpts?.signer,
        accountNumber: txAccountNumber,
        sequence: txSequence,
      }
    };

    const signingClient = await this.getSigningStargateClient();
    const signedTx = await this.getSignedTx(address, messages, signingClient, _signOpts);

    if (!skipSequenceIncrement)
      this.updateWalletAccount({ sequence: txSequence + 1 });

    return {
      signedTx,
      signerAddress: address,
      sequence: txSequence,
    };
  }

  public async reloadMergedWalletAccount() {
    await this.reloadAccount();
    this.updateWalletAccount({ isMerged: true });
  }

  public async getSignedTx(
    signerAddress: string,
    messages: readonly EncodeObject[],
    signingClient: SigningStargateClient,
    opts: SignTxOpts,
  ): Promise<Cosmos.Tx.TxRaw> {
    const { signer, tx } = opts;
    const { memo = "", fee = DEFAULT_STD_FEE, timeoutHeight = 0 } = tx ?? {};
    const { sequence = 0, accountNumber = 0 } = signer ?? {};

    const chainId = await this.getChainId();
    const signerData: SignerData = {
      accountNumber,
      chainId,
      sequence,
    };
    const txRaw = await signingClient.sign(signerAddress, messages, fee, memo, signerData, BigInt(timeoutHeight));
    return txRaw;
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

  public async getChainId(): Promise<string> {
    if (this._chainId) return this._chainId;
    const queryClient = await this.getQueryClient();
    this._chainId = await queryClient.chain.getChainId();
    return this._chainId;
  }

  public async getSigningStargateClient(): Promise<SigningStargateClient> {
    if (this._signingClient) return this._signingClient;
    const tmClient = await this.getTmClient();
    const signingClient = isDemexEIP712Signer(this.signer)
      ? await DemexEIP712SigningClient.createWithSigner(tmClient, this.signer as DemexEIP712Signer, { registry, aminoTypes: AminoTypesMap })
      : await SigningStargateClient.createWithSigner(tmClient, this.signer, { registry, aminoTypes: AminoTypesMap });
    this._signingClient = signingClient
    return this._signingClient!;
  }

  public clone(opts: Partial<DemexWalletInitOpts> = {}) {

    return new DemexWallet({
      // clone current init options
      ...this.initOpts,

      // apply new init options
      ...opts,
    });
  }

  public static withPrivateKey(privateKey: string | Buffer, opts: Omit<DemexWalletConnectOpts, "privateKey"> = {}) {
    const privateKeyBuffer = stringOrBufferToBuffer(privateKey);
    if (!privateKeyBuffer || !privateKeyBuffer.length) throw new WalletError("");

    const networkConfig = overrideConfig(opts.networkConfig?.network ?? Network.MainNet, opts.networkConfig);
    const signer = new DemexPrivateKeySigner(privateKeyBuffer, networkConfig.bech32Prefix);
    return new DemexWallet({
      ...opts,
      privateKey: privateKeyBuffer,
      signer,
    });
  }

  public static withMnemonic(mnemonic: string, hdPath?: string, opts: Omit<DemexWalletConnectOpts, "mnemonic" | "hdPath"> = {}) {
    if (!hdPath) hdPath = new BIP44Path(44, 118).generate();
    const seed = Bip39.mnemonicToSeedSync(mnemonic);
    const result = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath(hdPath));
    const privateKey = Buffer.from(result.privkey);
    return DemexWallet.withPrivateKey(privateKey, {
      ...opts,
      mnemonic, hdPath,
    });
  }

  public static withSigner(signer: DemexSigner, publicKeyBase64: string, opts: Omit<DemexWalletConnectOpts, "signer"> = {}) {
    return new DemexWallet({
      ...opts,
      signer,
      publicKeyBase64,
    });
  }

  public static withAddress(bech32Address: string, opts: DemexWalletConnectOpts = {}) {
    return new DemexWallet({
      ...opts,
      bech32Address,
      signer: new DemexNonSigner()
    });
  }
}
