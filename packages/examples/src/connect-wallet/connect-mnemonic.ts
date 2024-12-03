import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { DemexWallet } from "@demex-sdk/wallet";
import { run } from "../utils";

run(async () => {
  const hdWallet = await DirectSecp256k1HdWallet.generate();
  const mnemonic = hdWallet.mnemonic;
  const wallet = DemexWallet.withMnemonic(mnemonic);

  console.log("address", wallet.bech32Address);
});
