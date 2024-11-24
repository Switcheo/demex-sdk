import { CONST, wallet } from "@cityofzion/neon-core-next";
import * as Base58Check from "base58check";
import * as bech32 from "bech32";
import * as BIP32 from "bip32";
import * as BIP39 from "bip39";
import CryptoJS from "crypto-js";
import { HDNodeWallet, Mnemonic, SigningKey, computeAddress, keccak256, ripemd160, sha256 } from "ethers";
import * as secp256k1 from "secp256k1";
import * as secp256r1 from "secp256r1";
import { Bech32AddrType, BIP44_PURPOSE, NEO_COIN_TYPE, ETH_COIN_TYPE, SWTH_COIN_TYPE, Network, defaultNetworkConfig } from "../env";
import { BIP44Path, randomMnemonic, stringOrBufferToBuffer, stripHexPrefix } from "./crypto";

export const ZeroAddress = "0x0000000000000000000000000000000000000000";

export interface AddressOptions {}

export interface AddressBuilder<T extends AddressOptions = AddressOptions> {
  /**
   * BIP44 coin type
   * used in `m/44'/${coinType}'/0'/0/0`
   */
  coinType(): number;

  /**
   * derives address
   *
   * @param publicKey accepts both encoded/compressed or unencoded/uncompressed public key
   */
  publicKeyToScriptHash(publicKey: string | Buffer): string;
  publicKeyToAddress(publicKey: string | Buffer, opts?: T): string;
  generateAddress(mnemonic: string, account?: number, opts?: T): string;

  mnemonicToPrivateKey(mnemonic: string, account?: number, opts?: T): Buffer;

  privateKeyToAddress(privateKey: string | Buffer, opts?: T): string;
  privateToPublicKey(privateKey: string | Buffer): Buffer;

  /**
   * Returns a 33-byte encoded/compressed public key, also known as the encoded public key
   *
   * @param unencodedPublicKey - 65-byte raw/unencoded public key
   */
  encodePublicKey(unencodedPublicKey: string | Buffer): Buffer;
}

export interface SWTHAddressOptions extends AddressOptions {
  network?: Network;
  bech32Prefix?: string;
  type?: Bech32AddrType;
}

type SWTHAddressType = AddressBuilder<SWTHAddressOptions> & {
  newMnemonic(): string;
  getBech32Prefix(net?: Network, bech32Prefix?: string, type?: Bech32AddrType): string;
  addrPrefix: { [index: string]: string };
  getAddressBytes(bech32Address: string, networkConfig: Network): Uint8Array;
  keyDerivationPath(index?: number, change?: number, account?: number): number[];
  encode(hash: string | Buffer, opts?: SWTHAddressOptions): string;
  getModuleAddress(moduleKey: string, network?: Network): string;
};

export const SWTHAddress: SWTHAddressType = {
  newMnemonic: () => {
    return randomMnemonic();
  },

  coinType: (): number => {
    return SWTH_COIN_TYPE;
  },

  keyDerivationPath: (index: number = 0, change: number = 0, account: number = 0): number[] => {
    const coinType = SWTHAddress.coinType();
    return new BIP44Path(BIP44_PURPOSE, coinType).update(index, change, account).toArray();
  },

  publicKeyToScriptHash: (publicKey: string | Buffer): string => {
    const pubKeyBuffer = stringOrBufferToBuffer(publicKey)!;
    const sha256Hash = sha256(pubKeyBuffer);
    const ripemdHash = ripemd160(sha256Hash);

    return stripHexPrefix(ripemdHash);
  },

  publicKeyToAddress: (publicKey: string | Buffer, opts?: SWTHAddressOptions): string => {
    const scriptHash = SWTHAddress.publicKeyToScriptHash(publicKey);
    const address = SWTHAddress.encode(scriptHash, opts);
    return address;
  },

  encodePublicKey: (): Buffer => {
    throw new Error("SWTH public keys do not compress");
  },

  mnemonicToPrivateKey: (mnemonic: string, account: number = 0): Buffer => {
    const coinType = SWTHAddress.coinType();
    const path = new BIP44Path(BIP44_PURPOSE, coinType).update(account).generate();
    const seed = BIP39.mnemonicToSeedSync(mnemonic);
    const masterKey = BIP32.fromSeed(seed);
    const hardenedDerivation = masterKey.derivePath(path);
    const privateKey = hardenedDerivation.privateKey;

    if (!privateKey) throw new Error("Private key derivation from mnemonic failed");

    return privateKey;
  },

  privateToPublicKey: (privateKey: string | Buffer): Buffer => {
    const privateKeyBuff = stringOrBufferToBuffer(privateKey)!;
    const publicKeyUint8Array: Uint8Array = secp256k1.publicKeyCreate(privateKeyBuff, true);
    const publicKey = Buffer.from(publicKeyUint8Array);
    return publicKey;
  },

  privateKeyToAddress: (privateKey: string | Buffer, opts?: SWTHAddressOptions): string => {
    const publicKey = SWTHAddress.privateToPublicKey(privateKey);
    const address = SWTHAddress.publicKeyToAddress(publicKey, opts);

    return address;
  },

  encode: (hash: string | Buffer, opts?: SWTHAddressOptions): string => {
    const hashBuff = stringOrBufferToBuffer(hash, "hex")!;
    const words = bech32.toWords(hashBuff.slice(0, 20));
    const addressPrefix = SWTHAddress.getBech32Prefix(opts?.network, opts?.bech32Prefix, opts?.type);
    const address = bech32.encode(addressPrefix, words);
    return address;
  },

  generateAddress: (mnemonic: string, account: number = 0, opts?: SWTHAddressOptions) => {
    const privateKey = SWTHAddress.mnemonicToPrivateKey(mnemonic, account);
    const address = SWTHAddress.privateKeyToAddress(privateKey, opts);
    return address;
  },

  getBech32Prefix(net: Network = Network.MainNet, mainPrefix: string = defaultNetworkConfig[net].bech32Prefix, type: Bech32AddrType = "main") {
    const addrPrefix = SWTHAddress.addrPrefix;
    switch (type) {
      case "main":
        // e.g. swth
        return mainPrefix;
      case "validator":
        // e.g. swthvaloper
        return mainPrefix + addrPrefix.validator + addrPrefix.operator;
      case "consensus":
        // e.g. swthvalconspub
        return mainPrefix + addrPrefix.validator + addrPrefix.consensus + addrPrefix.public;
      default:
        return mainPrefix;
    }
  },

  addrPrefix: {
    validator: "val",
    operator: "oper",
    consensus: "cons",
    public: "pub",
  },

  getAddressBytes: (bech32Address: string, net: Network): Uint8Array => {
    const prefix = SWTHAddress.getBech32Prefix(net, undefined, "main");
    const { prefix: b32Prefix, words } = bech32.decode(bech32Address);
    if (b32Prefix !== prefix) {
      throw new Error("Prefix doesn't match");
    }
    return new Uint8Array(bech32.fromWords(words));
  },

  getModuleAddress: (moduleKey: string, network: Network = Network.MainNet) => {
    const addressHash = CryptoJS.SHA256(moduleKey).toString(CryptoJS.enc.Hex);
    return SWTHAddress.encode(addressHash, { network });
  },
};

type NEOAddressType = AddressBuilder<AddressOptions> & {
  isAddress(address: string): boolean;
  encode(hash: string | Buffer, version?: string): string;
};

export const NEOAddress: NEOAddressType = {
  coinType: (): number => {
    return NEO_COIN_TYPE;
  },

  publicKeyToScriptHash: (publicKey: string | Buffer): string => {
    const encodedPublicKey = NEOAddress.encodePublicKey(publicKey);

    const addressScript = Buffer.concat([
      Buffer.from([0x21]), // OptCode.PUSHBYTES21
      encodedPublicKey,
      Buffer.from([0xac]), // OptCode.CHECKSIG
    ]);
    const sha256Hash = sha256(addressScript);
    const ripemdHash = ripemd160(sha256Hash);

    return stripHexPrefix(ripemdHash);
  },

  publicKeyToAddress: (publicKey: string | Buffer): string => {
    const addressScript = NEOAddress.publicKeyToScriptHash(publicKey);
    const address = Base58Check.encode(addressScript, "17");

    return address;
  },

  encodePublicKey: (unencodedPublicKey: string | Buffer): Buffer => {
    const unencPubKeyBuf = stringOrBufferToBuffer(unencodedPublicKey)!;
    if (unencPubKeyBuf.length <= 33) {
      // length indicates already encoded
      return unencPubKeyBuf;
    }

    const pointXHex = unencPubKeyBuf.slice(1, 33);
    const pointYEven = unencPubKeyBuf[unencPubKeyBuf.length - 1] % 2 === 0;
    const compressedPublicKey = Buffer.concat([Buffer.from([pointYEven ? 0x02 : 0x03]), pointXHex]);
    return compressedPublicKey;
  },

  encode: (addressScript: string | Buffer, version = "17"): string => {
    return Base58Check.encode(addressScript, version);
  },

  mnemonicToPrivateKey: (mnemonic: string, account: number = 0): Buffer => {
    const coinType = NEOAddress.coinType();
    const path = new BIP44Path(BIP44_PURPOSE, coinType).update(account).generate();
    const seed = BIP39.mnemonicToSeedSync(mnemonic);
    const masterKey = BIP32.fromSeed(seed);
    const hardenedDerivation = masterKey.derivePath(path);
    const privateKey = hardenedDerivation.privateKey;

    if (!privateKey) throw new Error("Private key derivation from mnemonic failed");

    return privateKey;
  },

  privateToPublicKey: (privateKey: string | Buffer): Buffer => {
    const privateKeyBuff = stringOrBufferToBuffer(privateKey);
    const publicKeyUint8Array: Uint8Array = secp256r1.publicKeyCreate(privateKeyBuff, true);
    return Buffer.from(publicKeyUint8Array);
  },

  privateKeyToAddress: (privateKey: string | Buffer): string => {
    const compressedPublicKey = NEOAddress.privateToPublicKey(privateKey);
    const address = NEOAddress.publicKeyToAddress(compressedPublicKey);

    return address;
  },

  generateAddress: (mnemonic: string, account: number = 0) => {
    const privateKey = NEOAddress.mnemonicToPrivateKey(mnemonic, account);
    return NEOAddress.privateKeyToAddress(privateKey);
  },

  isAddress: (address: string) => {
    return wallet.isAddress(address, 0x17);
  },
};

type N3AddressType = NEOAddressType & object;

export const N3Address: N3AddressType = {
  ...NEOAddress,

  publicKeyToScriptHash: (publicKey: string | Buffer): string => {
    const publicKeyHex = stringOrBufferToBuffer(publicKey)!.toString("hex");
    return wallet.getScriptHashFromPublicKey(publicKeyHex);
  },

  publicKeyToAddress: (publicKey: string | Buffer): string => {
    const addressScript = N3Address.publicKeyToScriptHash(publicKey);
    return wallet.getAddressFromScriptHash(addressScript);
  },

  privateKeyToAddress: (privateKey: string | Buffer): string => {
    const compressedPublicKey = N3Address.privateToPublicKey(privateKey);
    const address = N3Address.publicKeyToAddress(compressedPublicKey);

    return address;
  },

  generateAddress: (mnemonic: string, account: number = 0) => {
    const privateKey = N3Address.mnemonicToPrivateKey(mnemonic, account);
    return N3Address.privateKeyToAddress(privateKey);
  },

  isAddress: (address: string) => {
    return wallet.isAddress(address, CONST.DEFAULT_ADDRESS_VERSION);
  },

  encode: (addressScript: string | Buffer, version = "35"): string => {
    return Base58Check.encode(addressScript, version);
  },
};

type ETHAddressType = AddressBuilder<AddressOptions> & {
  encode(hash: string | Buffer, opts?: SWTHAddressOptions): string;
  publicKeyToBech32Address(publicKey: string | Buffer, opts?: SWTHAddressOptions): string;
}

export const ETHAddress: ETHAddressType = {
  coinType: (): number => {
    return ETH_COIN_TYPE;
  },

  publicKeyToScriptHash: (publicKey: string | Buffer): string => {
    const encodedPublicKey = ETHAddress.encodePublicKey(publicKey);
    return keccak256(encodedPublicKey);
  },

  publicKeyToAddress: (publicKey: string): string => {
    return computeAddress(publicKey);
  },

  publicKeyToBech32Address: (publicKey: string | Buffer, opts?: SWTHAddressOptions): string => {
    const hexAddress = ETHAddress.publicKeyToAddress(publicKey)
    return ETHAddress.encode(hexAddress.split('0x')[1], opts)
  },

  encodePublicKey: (unencodedPublicKey: string | Buffer): Buffer => {
    const unencodedPublicKeyBuff = stringOrBufferToBuffer(unencodedPublicKey)!;
    const publicKey = SigningKey.computePublicKey(unencodedPublicKeyBuff, true);
    return Buffer.from(publicKey, "hex");
  },

  mnemonicToPrivateKey: (mnemonic: string, account: number = 0): Buffer => {
    const coinType = ETHAddress.coinType();
    const path = new BIP44Path(BIP44_PURPOSE, coinType).update(account).generate();
    const wallet = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
    return Buffer.from(wallet.privateKey?.replace(/^0x/, ""), "hex");
  },

  privateToPublicKey: (privateKey: string | Buffer): Buffer => {
    const privateKeyBuff = stringOrBufferToBuffer(privateKey)!;
    return Buffer.from(SigningKey.computePublicKey(privateKeyBuff).replace(/^0x/, ""), "hex");
  },

  privateKeyToAddress: (privateKey: string | Buffer): string => {
    const compressedPublicKey = ETHAddress.privateToPublicKey(privateKey);
    const address = ETHAddress.publicKeyToAddress(compressedPublicKey);
    return address;
  },

  generateAddress: (mnemonic: string, account: number = 0) => {
    const privateKey = ETHAddress.mnemonicToPrivateKey(mnemonic, account);
    return ETHAddress.privateKeyToAddress(privateKey);
  },
  encode: (hash: string | Buffer, opts?: SWTHAddressOptions): string => {
    const hashBuff = stringOrBufferToBuffer(hash, "hex")!;
    const words = bech32.toWords(hashBuff.slice(0, 20));
    const addressPrefix = SWTHAddress.getBech32Prefix(opts?.network, opts?.bech32Prefix, opts?.type);
    const address = bech32.encode(addressPrefix, words);
    return address;
  },
};