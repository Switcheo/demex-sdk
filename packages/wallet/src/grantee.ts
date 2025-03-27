import { EncodeObject } from "@cosmjs/proto-signing";
import { registry, TxTypes } from "@demex-sdk/codecs";
import { MsgExec } from "@demex-sdk/codecs/data/cosmos/authz/v1beta1/tx";
import { DemexSigner } from "./signer";
import { DemexWallet, DemexWalletInitOpts } from "./wallet";

export type GranteeInitOpts = DemexWalletInitOpts & {
  mnemonic: string
  signer: DemexSigner
  expiry: Date
  authorisedMessages: Set<string>
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

export class GranteeWallet extends DemexWallet {
  expiry: Date
  authorisedMessages: Set<string>
  signer: DemexSigner

  constructor(opts: GranteeInitOpts) {
    super(opts);
    this.signer = opts.signer;
    this.expiry = opts.expiry;
    this.authorisedMessages = opts.authorisedMessages;
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

  public constructExecMessage(messages: readonly EncodeObject[]): EncodeObject {
    const msgs = messages.map((message) => registry.encodeAsAny({ ...message }))
    return {
      typeUrl: TxTypes.MsgExec,
      value: MsgExec.fromPartial({
        grantee: this.bech32Address,
        msgs,
      }),
    }
  }
}
