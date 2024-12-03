import elliptic  from "elliptic";
import { DemexWallet } from "@demex-sdk/wallet";
import { run } from "../utils";

run(async () => {
  const keypair = new elliptic.ec("secp256k1").genKeyPair();
  const wallet = DemexWallet.withPrivateKey(keypair.getPrivate("hex"));

  console.log("address", wallet.bech32Address);
});
