import { AminoSignResponse, OfflineAminoSigner, Secp256k1Wallet, StdSignDoc } from "@cosmjs/amino";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { AccountData, DirectSecp256k1Wallet, DirectSignResponse, OfflineDirectSigner } from "@cosmjs/proto-signing";
import { constructAdr36SignDoc } from "@demex-sdk/core";
import { SignDoc } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { EIP712Tx } from "./eip712";
import { WalletError } from "./constant";

export enum DemexSignerTypes {
  Ledger,
  PrivateKey,
  PublicKey,
}
export interface EIP712Signer {
  getEvmAddress: () => Promise<string>;
  getEvmChainId: () => Promise<string>;
  signEIP712: (hexAddress: string, doc: EIP712Tx) => Promise<string>;
}

export type DemexEIP712Signer = (DemexDirectSigner | DemexAminoSigner) & EIP712Signer
export type DemexSigner = DemexDirectSigner | DemexAminoSigner | DemexEIP712Signer;
export type DemexDirectSigner = OfflineDirectSigner & { type: DemexSignerTypes };
export type DemexAminoSigner = OfflineAminoSigner & { type: DemexSignerTypes }

export class DemexPrivateKeySigner implements DemexDirectSigner, DemexAminoSigner {
  type = DemexSignerTypes.PrivateKey;
  wallet?: DirectSecp256k1Wallet;
  aminoWallet?: Secp256k1Wallet;

  constructor(readonly privateKey: Buffer, readonly prefix: string) { }

  async initWallet() {
    if (!this.wallet) this.wallet = await DirectSecp256k1Wallet.fromKey(this.privateKey, this.prefix);

    return this.wallet;
  }

  async initAminoWallet() {
    if (!this.aminoWallet) this.aminoWallet = await Secp256k1Wallet.fromKey(this.privateKey, this.prefix);
    return this.aminoWallet;
  }

  async getAccounts() {
    const wallet = await this.initWallet();
    return await wallet.getAccounts();
  }

  async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
    const aminoWallet = await this.initAminoWallet();
    return await aminoWallet.signAmino(signerAddress, signDoc);
  }

  async signDirect(signerAddress: string, signDoc: SignDoc): Promise<DirectSignResponse> {
    const wallet = await this.initWallet();
    return await wallet.signDirect(signerAddress, signDoc);
  }

  async signMessage(address: string, message: string): Promise<string> {
    const aminoWallet = await this.initAminoWallet()
    const signedDoc = await aminoWallet.signAmino(address, constructAdr36SignDoc(address, message))
    return Buffer.from(signedDoc.signature.signature, 'base64').toString('hex')
  }
}


export class DemexNonSigner implements DemexDirectSigner {
  type = DemexSignerTypes.PublicKey;

  async getAccounts(): Promise<readonly AccountData[]> {
    throw new WalletError("signing not available");
  }

  async signDirect(): Promise<DirectSignResponse> {
    throw new WalletError("signing not available");
  }

  async signMessage(address: string, message: string): Promise<string> { // eslint-disable-line
    throw new WalletError("signing not available");
  }
}

// Uses amino because ledger does not work with protobuf yet
export class DemexLedgerSigner extends LedgerSigner {
  type = DemexSignerTypes.Ledger;
}
