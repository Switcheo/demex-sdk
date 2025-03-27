import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DemexSDK } from "@demex-sdk/sdk";
import { run } from "../utils";

run(async () => {
  const hdWallet = await DirectSecp256k1HdWallet.generate();
  const mnemonic = hdWallet.mnemonic;
  const sdk = DemexSDK.instanceWithMnemonic(mnemonic);

  const wallet = sdk.wallet;

  // since DemexSDK.wallet is actually sdk.getWallet(WalletRole.Main),
  // which tolerates the case where wallet is not found within a map,
  // hence the type will be `DemexWallet | undefined`.
  if (!wallet) throw new Error("the impossible just occurred!")

  console.log("address", wallet.bech32Address);
});
