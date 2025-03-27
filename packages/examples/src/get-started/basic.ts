import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DemexSDK } from "@demex-sdk/sdk";
import { run } from "../utils";

run(async () => {
  const hdWallet = await DirectSecp256k1HdWallet.generate();
  const mnemonic = hdWallet.mnemonic;
  const sdk = DemexSDK.instanceWithMnemonic(mnemonic);

  console.log("address", sdk.wallet!.bech32Address);
});
