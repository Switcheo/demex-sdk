import { EncodeObject } from "@cosmjs/proto-signing";
import { TxTypes } from "@demex-sdk/codecs";
import { Demex } from "@demex-sdk/core";
import { DemexWallet } from "@demex-sdk/wallet";

export const findMessageByTypeUrl = (messages: readonly EncodeObject[], typeUrl: string) => messages.find(msg => msg.typeUrl === typeUrl);

export const containsMergeWalletAccountMessage = (wallet: DemexWallet, messages: readonly EncodeObject[]) => {
  const mergeAccountMessage = findMessageByTypeUrl(messages, TxTypes.MsgMergeAccount);
  if (!mergeAccountMessage) return false;
  const { value } = mergeAccountMessage;
  const msg = value as Demex.Evmmerge.MsgMergeAccount;
  const mergeOwnAccountMessage =
    (msg.creator === wallet.bech32Address
      || msg.creator === wallet.evmBech32Address)
    && wallet.publicKey.toString("hex") === msg.pubKey;
  if (mergeOwnAccountMessage) return true;
  return false;
}
