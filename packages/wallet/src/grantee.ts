import { SigningStargateClient } from "@cosmjs/stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { registry, TxTypes } from "@demex-sdk/codecs";
import { DemexSigner } from "./signer";
import { EncodeObject } from "@cosmjs/proto-signing";
import { MsgExec } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { getDefaultSignerAddress } from "./utils";

export interface GranteeInitOpts {
  mnemonic: string;
}

export interface GranteeUpdateOpts {
  mnemonic: string;
  expiry: Date;
}

export interface GranteeDetails {
  expiry: Date;
  authorisedMessages: string[];
}


const EXPIRY_BUFFER_PERIOD_SECONDS = 20

export class Grantee {
  expiry: Date;
  authorisedMessages: Set<string>;
  signer: DemexSigner;
  _signingClient?: SigningStargateClient;

  constructor(signer: DemexSigner, expiry: Date, authorisedMessages: Set<string>) {
    this.signer = signer;
    this.expiry = expiry;
    this.authorisedMessages = authorisedMessages;
  }

  private hasExpired() {
    const now = new Date();
    const bufferTime = new Date(now.getTime() + EXPIRY_BUFFER_PERIOD_SECONDS * 1000);
    return this.expiry <= bufferTime;
  }

  private isMessageAuthorised(message: string) {
    return this.authorisedMessages.has(message);
  }

  public isAuthorised(messages: Set<string>) {
    for (const message of messages) {
      if (!this.isMessageAuthorised(message)) {
        return false;
      }
    }

    return !this.hasExpired();
  }

  public async getSigningClient(tmClient: Tendermint37Client) {
    if (this._signingClient) return this._signingClient;
    this._signingClient = await SigningStargateClient.createWithSigner(tmClient, this.signer, { registry });
    return this._signingClient;
  }

  public async constructExecMessage(messages: readonly EncodeObject[]): Promise<EncodeObject> {
    const address = await getDefaultSignerAddress(this.signer);
    const msgs = messages.map((message) => registry.encodeAsAny({ ...message }))
    return {
      typeUrl: TxTypes.MsgExec,
      value: MsgExec.fromPartial({
        grantee: address,
        msgs,
      }),
    }
  }
}