import { makeSignDoc as makeSignDocAmino } from "@cosmjs/amino";
import { fromBase64 } from "@cosmjs/encoding";
import { Int53 } from "@cosmjs/math";
import { EncodeObject, makeAuthInfoBytes, makeSignDoc } from "@cosmjs/proto-signing";
import { AminoTypes, SignerData, SigningStargateClient, SigningStargateClientOptions, StdFee } from "@cosmjs/stargate";
import { CometClient } from "@cosmjs/tendermint-rpc";
import { AminoTypesMap } from "@demex-sdk/amino-types";
import { Any, TxTypes } from "@demex-sdk/codecs";
import { SignMode } from "@demex-sdk/codecs/data/cosmos/tx/signing/v1beta1/signing";
import { TxRaw } from "@demex-sdk/codecs/data/cosmos/tx/v1beta1/tx";
import { PubKey } from "@demex-sdk/codecs/data/ethermint/crypto/v1/ethsecp256k1/keys";
import { WalletError } from "../constant";
import { DemexEIP712Signer } from "../signer";

export class DemexEIP712SigningClient extends SigningStargateClient {
  private eip712Signer: DemexEIP712Signer;
  private eip712AminoTypes?: AminoTypes;
  private constructor(cometClient: CometClient, signer: DemexEIP712Signer, options: SigningStargateClientOptions = {}) {
    super(cometClient, signer, options);
    this.eip712Signer = signer;
    this.eip712AminoTypes = options.aminoTypes;
  }

  static async createWithSigner(cometClient: CometClient, signer: DemexEIP712Signer, options: SigningStargateClientOptions = {}): Promise<DemexEIP712SigningClient> {
    return new DemexEIP712SigningClient(cometClient, signer, options);
  }

  public async sign(signerAddress: string, messages: readonly EncodeObject[], fee: StdFee, memo: string, explicitSignerData: SignerData, timeoutHeight?: bigint): Promise<TxRaw> {
    if (useSignDirectForMetamask(messages)) return this.signDirectEIP712(signerAddress, messages, fee, memo, explicitSignerData, timeoutHeight);
    // Use amino sigining for metamask as there is a bug with signDirect signature verification
    // ethermint verifies sign direct legacyDec type as shifted by 18dp when it should be unshifted (verified with keplr)
    // therefore the alternative which works here would be to use signamino where the verification is not broken on ethermint.
    return this.signEIP712Amino(signerAddress, messages, fee, memo, explicitSignerData, timeoutHeight);
  }

  private async signDirectEIP712(signerAddress: string, messages: readonly EncodeObject[], fee: StdFee, memo: string, explicitSignerData: SignerData, timeoutHeight?: bigint): Promise<TxRaw> {
    const pubkey = encodeAnyEthSecp256k1PubKey(await this.eip712Signer.getPublicKey(signerAddress));
    const { chainId, accountNumber, sequence } = explicitSignerData;
    const txBodyEncodeObject = {
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: {
        messages: messages,
        memo: memo,
        timeoutHeight: timeoutHeight,
      },
    };
    const txBodyBytes = this.registry.encode(txBodyEncodeObject);
    const gasLimit = Int53.fromString(fee.gas).toNumber();
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence }],
      fee.amount,
      gasLimit,
      fee.granter,
      fee.payer
    );
    const signDoc = makeSignDoc(
      txBodyBytes,
      authInfoBytes,
      chainId,
      accountNumber
    );
    const { signature, signed } = await this.eip712Signer.signDirect(signerAddress, signDoc);
    return TxRaw.fromPartial({
      bodyBytes: signed.bodyBytes,
      authInfoBytes: signed.authInfoBytes,
      signatures: [fromBase64(signature.signature)],
    });
  }

  private async signEIP712Amino(signerAddress: string, messages: readonly EncodeObject[], fee: StdFee, memo: string, explicitSignerData: SignerData, timeoutHeight?: bigint): Promise<TxRaw> {
    const pubkey = encodeAnyEthSecp256k1PubKey(await this.eip712Signer.getPublicKey(signerAddress));
    const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
    if (!this.eip712AminoTypes) throw new WalletError("Amino types not set");
    const msgs = messages.map((msg) => this.eip712AminoTypes!.toAmino(msg));
    const { chainId, accountNumber, sequence } = explicitSignerData;
    const signDoc = makeSignDocAmino(
      msgs,
      fee,
      chainId,
      memo,
      accountNumber,
      sequence,
      timeoutHeight
    );
    const { signature, signed } = await this.eip712Signer.signAmino(signerAddress, signDoc);

    const signedTxBody = {
      messages: signed.msgs.map((msg) => AminoTypesMap.fromAmino(msg)),
      memo: signed.memo,
      timeoutHeight,
    };

    const signedTxBodyBytes = this.registry.encode({
      typeUrl: "/cosmos.tx.v1beta1.TxBody",
      value: signedTxBody,
    });

    const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
    const signedSequence = Int53.fromString(signed.sequence).toNumber();

    const signedAuthInfoBytes = makeAuthInfoBytes(
      [{ pubkey, sequence: signedSequence }],
      signed.fee.amount,
      signedGasLimit,
      signed.fee.granter,
      signed.fee.payer,
      signMode
    );

    return TxRaw.fromPartial({
      bodyBytes: signedTxBodyBytes,
      authInfoBytes: signedAuthInfoBytes,
      signatures: [fromBase64(signature.signature)],
    });
  }
}


const LibPackages: string[] = ['ibc', 'cosmos', 'alliance']

const BacklistedMessages: string[] = []

// to use signDirect for metamask signing if messages are from libraries (cosmos-sdk, ibc, alliance).
// Reasons:
// 1. There is decoding issue with MsgGrantAllowance in amino
// 2. For Ibc MsgTransfer, there is an overflow issue with timeouttimestamp overflow (from uint32) during unmarshalJSON, even though it is defined as uint64 
// (This can be resolved from the client side by use sendIBCTransfer instead of sendIBCTransferV2) but using signDirect here fixes it too.
// 3. as of comsos-sdk v0.50 --> very few messages are using legacyDec so we can safely use signDirect
const useSignDirectForMetamask = (messages: readonly EncodeObject[]): boolean => {
  const typeUrls = messages.map(m => m.typeUrl)
  return !!Object.values(TxTypes).find(typeUrl => isLibMsg(typeUrl) && typeUrls.includes(typeUrl))
}

const isLibMsg = (typeUrl: string): boolean => {
  // /ibc.core.client.v1.UpgradeProposal --> ibc
  const pkg = typeUrl.split('.')[0]?.substring(1)
  return !!pkg && LibPackages.includes(pkg) && !BacklistedMessages.includes(typeUrl)
}

const encodeAnyEthSecp256k1PubKey = (pubkey: Uint8Array): Any => {
  const ethPubKey = PubKey.fromPartial({
    key: pubkey,
  })
  return Any.fromPartial({
    typeUrl: '/ethermint.crypto.v1.ethsecp256k1.PubKey',
    value: PubKey.encode(ethPubKey).finish(),
  })
}
