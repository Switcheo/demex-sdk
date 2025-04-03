import { DemexSDK } from "@demex-sdk/sdk";
import { run } from "../utils";

run(async () => {
  const sdk = DemexSDK.instance();
  const queryClient = await sdk.getQueryClient();

  // fetch chain ID
  console.log("chain ID", await queryClient.chain.getChainId());

  // fetch active markets
  console.log("active markets", await queryClient.market.MarketAll({ isActive: true }));
  
  // fetch address balances
  console.log("balances", await queryClient.chain.getAllBalances("swth1hexzxh3apqpqzzchhgynks2xr8ar8qvdf3m9cw"));
});
