import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import { BlockchainClient, defaultNetworkConfig, DemexQueryClient } from "@demex-sdk/core";
import { run } from "../utils";

run(async () => {
  const tmClient = await Tendermint37Client.connect(defaultNetworkConfig.mainnet.tmRpcUrl);
  const queryClient = DemexQueryClient.instance({ tmClient });

  console.log("chain ID", await queryClient.chain.getChainId());
});
