import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { MsgSend } from "@demex-sdk/codecs/data/cosmos/bank/v1beta1/tx";
import { DEFAULT_GAS_DENOM, TxTypes } from "@demex-sdk/core";
import { DemexSDK } from "@demex-sdk/sdk";
import { run } from "../utils";

run(async () => {
  const hdWallet = await DirectSecp256k1HdWallet.generate();
  const mnemonic = hdWallet.mnemonic;
  const sdk = DemexSDK.instanceWithMnemonic(mnemonic);

  const tx = await sdk.sendTxs([{
    typeUrl: TxTypes.MsgSend,
    value: MsgSend.fromPartial({
      amount: [{
        amount: "1",
        denom: DEFAULT_GAS_DENOM,
      }],
      fromAddress: sdk.wallet!.bech32Address,
      toAddress: "swth1hexzxh3apqpqzzchhgynks2xr8ar8qvdf3m9cw",
    })
  }]);

  console.log("tx result", tx);
  console.log("hash", tx.transactionHash);
});
