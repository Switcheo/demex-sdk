import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/amino";
import { keccak256, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBech32, toBech32, toHex } from "@cosmjs/encoding";
import { BIP44Path, stringOrBufferToBuffer } from "@demex-sdk/core";
import Bip39 from "bip39";
import elliptic from "elliptic";
import { DemexNonSigner, DemexPrivateKeySigner, DemexSigner } from "./signer";

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
  providerAgent?: string
}
export interface DemexWalletConstructorOpts extends Partial<ConnectWalletParams> {
  signer: DemexSigner

  /**
   * agent tag provided by caller to serve as identifier or differentiator
   * of different signer providers. this should not be used by DemexWallet
   * as identifier for connection type.
   */
  providerAgent?: string
}

export type DemexWalletInitOpts = BaseDemexWalletInitOpts & ConnectWalletOpts;

export class DemexWallet {
  public readonly publicKey: Buffer

  public readonly bech32Address: string
  public readonly hexAddress: string
  public readonly evmHexAddress: string
  public readonly evmBech32Address: string

  public signer: DemexSigner

  public constructor(opts: DemexWalletConstructorOpts) {
    const prefix = "swth";

    this.signer = opts.signer;

    if (opts.bech32Address) {
      // address (view-only) connection
      if (opts.bech32Address.startsWith(prefix))
        throw new Error("invalid address, prefix does not match");

      this.publicKey = Buffer.from([]);
      this.bech32Address = opts.bech32Address;
    } else if (opts.privateKey) {
      // mnemonic or private key connection
      const keypair = new elliptic.ec("secp256k1").keyFromPrivate(opts.privateKey);
      const publicKey = Buffer.from(keypair.getPrivate("hex"), "hex");
      const rawAddress = rawSecp256k1PubkeyToRawAddress(publicKey);

      this.publicKey = publicKey;
      this.bech32Address = toBech32(prefix, rawAddress);
    } else if (opts.publicKeyBase64) {
      // custom signer connection
      const publicKey = stringOrBufferToBuffer(opts.publicKeyBase64)!;
      const rawAddress = rawSecp256k1PubkeyToRawAddress(publicKey);

      this.bech32Address = toBech32(prefix, rawAddress);
      this.publicKey = publicKey;
    } else {
      throw new Error("cannot instantiate wallet address");
    }

    this.hexAddress = "0x".concat(toHex(fromBech32(this.bech32Address).data));
    if (this.publicKey.length) {
      const evmAddressBytes = keccak256(this.publicKey).slice(-20);
      this.evmHexAddress = "0x".concat(toHex(evmAddressBytes));
      this.evmBech32Address = toBech32(prefix, evmAddressBytes);
    } else {
      this.evmHexAddress = "";
      this.evmBech32Address = "";
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
